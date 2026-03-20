import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { Env } from '../index';

export interface UsuarioAutenticado {
    id: string;
    role: string;
    email: string;
    nome: string;
    isSimulacao?: boolean; // Flag para indicar que o cargo é simulado
}

type HonoEnv = { Bindings: Env; Variables: { usuario: UsuarioAutenticado } };

// ─── Funções Auxiliares (com cache) ──────────────────────────────────────────

async function getHierarquiaRoles(c: Context<HonoEnv>): Promise<string[] | null> {
    const { DB, softhub_kv } = c.env;
    let hierarquiaJson = await softhub_kv.get('hierarquia_roles');
    if (!hierarquiaJson) {
        const resConfig = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind('hierarquia_roles').first<{ valor: string }>();
        if (resConfig) {
            hierarquiaJson = resConfig.valor;
            await softhub_kv.put('hierarquia_roles', hierarquiaJson, { expirationTtl: 3600 });
        } else {
            console.error('[AUTH] CRÍTICO: hierarquia_roles não encontrada no banco de dados.');
            return null;
        }
    }
    try {
        const hierarquia = JSON.parse(hierarquiaJson);
        if (!Array.isArray(hierarquia)) throw new Error('O valor não é um array.');
        return hierarquia;
    } catch (e) {
        console.error('[AUTH] CRÍTICO: Falha ao parsear hierarquia_roles do banco.', e);
        return null;
    }
}

async function getPermissoesRoles(c: Context<HonoEnv>): Promise<Record<string, any> | null> {
    const { DB, softhub_kv } = c.env;
    let permissoesJson = await softhub_kv.get('permissoes_roles');
    if (!permissoesJson) {
        const resConfig = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind('permissoes_roles').first<{ valor: string }>();
        if (resConfig) {
            permissoesJson = resConfig.valor;
            await softhub_kv.put('permissoes_roles', permissoesJson, { expirationTtl: 3600 });
        } else {
            console.error('[AUTH] CRÍTICO: permissoes_roles não encontradas no banco de dados.');
            return null;
        }
    }
    try {
        return JSON.parse(permissoesJson);
    } catch (e) {
        console.error('[AUTH] CRÍTICO: Falha ao parsear permissoes_roles do banco.', e);
        return null;
    }
}

// ─── Middleware Principal de Autenticação ───────────────────────────────────

export function autenticacaoRequerida(roleMinimoRequerido?: string) {
    return async (c: Context<HonoEnv>, next: Next) => {
        const authHeader = c.req.header('Authorization');
        const roleSimuladaHeader = c.req.header('X-Role-Simulada'); // Cabeçalho de simulação

        if (!authHeader?.startsWith('Bearer ')) {
            return c.json({ erro: 'Token de autenticação ausente.' }, 401);
        }
        const token = authHeader.slice(7);
        const segredo = c.env.JWT_SECRET;
        if (!segredo) {
            console.error('[Auth Middleware] JWT_SECRET não definido.');
            return c.json({ erro: 'Erro interno de configuração.' }, 500);
        }

        let payload: any;
        try {
            payload = await verify(token, segredo, 'HS256');
        } catch {
            return c.json({ erro: 'Token inválido ou expirado.' }, 401);
        }

        const chaveCache = `sessao:${payload.id}`;
        let resUsuario: any;

        if (c.env.softhub_kv) {
            const cache = await c.env.softhub_kv.get(chaveCache);
            if (cache) resUsuario = JSON.parse(cache);
        }

        if (!resUsuario) {
            resUsuario = await c.env.DB.prepare('SELECT id, nome, email, role, versao_token FROM usuarios WHERE id = ?').bind(payload.id).first<any>();
            if (!resUsuario) return c.json({ erro: 'Usuário não encontrado.' }, 401);
            if (c.env.softhub_kv) await c.env.softhub_kv.put(chaveCache, JSON.stringify(resUsuario), { expirationTtl: 3600 });
        }

        if (payload.versao_token !== undefined && resUsuario.versao_token !== payload.versao_token) {
            return c.json({ erro: 'Sua sessão foi encerrada porque você entrou em outro dispositivo.' }, 401);
        }

        // 🛡️ LÓGICA DE SIMULAÇÃO (Discord Style)
        let roleEfetiva = resUsuario.role;
        let isSimulacao = false;

        // Regra de Ouro: Apenas quem é ADMIN real pode simular outros cargos
        if (resUsuario.role === 'ADMIN' && roleSimuladaHeader) {
            roleEfetiva = roleSimuladaHeader.toUpperCase();
            isSimulacao = true;
            console.log(`[AUTH] Admin ${resUsuario.email} simulando cargo: ${roleEfetiva}`);
        }

        c.set('usuario', { 
            id: resUsuario.id, 
            role: roleEfetiva, 
            email: resUsuario.email, 
            nome: resUsuario.nome,
            isSimulacao 
        });

        // Se for ADMIN REAL e NÃO estiver simulando, bypass total
        if (resUsuario.role === 'ADMIN' && !isSimulacao) {
            return await next();
        }

        // Se estiver simulando ou não for Admin, passa pelos checks normais de cargo
        if (roleMinimoRequerido) {
            const hierarquiaRoles = await getHierarquiaRoles(c);
            if (!hierarquiaRoles) return c.json({ erro: 'Sistema não configurado.' }, 500);
            
            const indiceUsuario = hierarquiaRoles.indexOf(roleEfetiva as any);
            const indiceRequerido = hierarquiaRoles.indexOf(roleMinimoRequerido as any);
            
            if (indiceUsuario === -1 || indiceRequerido === -1 || indiceUsuario < indiceRequerido) {
                console.warn(`[AUTH] Acesso negado (${isSimulacao ? 'Simulado' : 'Real'}): Usuário ${resUsuario.nome} tentou recurso que exige ${roleMinimoRequerido}`);
                return c.json({ erro: 'Permissão insuficiente.' }, 403);
            }
        }

        await next();
    };
}

// ─── Middleware de Verificação de Permissão Específica ──────────────────────

export function verificarPermissao(permissaoRequerida: string | string[]) {
    return async (c: Context<HonoEnv>, next: Next) => {
        const usuario = c.get('usuario');
        if (!usuario || !usuario.role) return c.json({ erro: 'Usuário não autenticado.' }, 401);

        // Se for ADMIN e NÃO estiver simulando nada, bypass total sempre
        // (Isso garante que um admin simulando um Membro seja BLOQUEADO conforme o cargo simulado)
        if (usuario.role === 'ADMIN' && !usuario.isSimulacao) return await next();

        const permissoes_roles = await getPermissoesRoles(c);
        if (!permissoes_roles) return c.json({ erro: 'Configurações de permissão não encontradas.' }, 500);

        const permissoes = Array.isArray(permissaoRequerida) ? permissaoRequerida : [permissaoRequerida];
        const configRole = permissoes_roles[usuario.role] || {};
        const configTodos = permissoes_roles['TODOS'] || {};

        const temAcesso = permissoes.some(p => {
            const [modulo, acao] = p.split(':');
            if (configRole['*'] === true || configTodos['*'] === true) return true;
            if (configRole[p] === true || configTodos[p] === true) return true;
            if ((configRole[modulo] && typeof configRole[modulo] === 'object' && configRole[modulo][acao] === true) ||
                (configTodos[modulo] && typeof configTodos[modulo] === 'object' && configTodos[modulo][acao] === true)) {
                return true;
            }
            return false;
        });

        if (temAcesso) return await next();

        console.warn(`[AUTH] Acesso negado (${usuario.isSimulacao ? 'Simulado' : 'Real'}): Usuário ${usuario.nome} (Role: ${usuario.role}) tentou '${permissaoRequerida}'`);
        return c.json({ erro: 'Você não tem permissão para esta tela.' }, 403);
    };
}