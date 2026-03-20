import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { Env } from '../index';

export interface UsuarioAutenticado {
    id: string;
    role: string;
    email: string;
    nome: string;
    isSimulacao?: boolean; 
    ehDonoReal?: boolean; 
}

type HonoEnv = { Bindings: Env; Variables: { usuario: UsuarioAutenticado } };

// ─── Funções Auxiliares ──────────────────────────────────────────────────────

async function getHierarquiaRoles(c: Context<HonoEnv>): Promise<string[] | null> {
    const { DB, softhub_kv } = c.env;
    let hierarquiaJson = await softhub_kv.get('hierarquia_roles');
    if (!hierarquiaJson) {
        const resConfig = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind('hierarquia_roles').first<{ valor: string }>();
        if (resConfig) {
            hierarquiaJson = resConfig.valor;
            await softhub_kv.put('hierarquia_roles', hierarquiaJson, { expirationTtl: 3600 });
        } else return null;
    }
    try {
        const hierarquia = JSON.parse(hierarquiaJson);
        return Array.isArray(hierarquia) ? hierarquia : null;
    } catch { return null; }
}

async function getPermissoesRoles(c: Context<HonoEnv>): Promise<Record<string, any> | null> {
    const { DB, softhub_kv } = c.env;
    let permissoesJson = await softhub_kv.get('permissoes_roles');
    if (!permissoesJson) {
        const resConfig = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind('permissoes_roles').first<{ valor: string }>();
        if (resConfig) {
            permissoesJson = resConfig.valor;
            await softhub_kv.put('permissoes_roles', permissoesJson, { expirationTtl: 3600 });
        } else return null;
    }
    try { return JSON.parse(permissoesJson); } catch { return null; }
}

// ─── Middleware de Autenticação ──────────────────────────────────────────────

export function autenticacaoRequerida(roleMinimoRequerido?: string) {
    return async (c: Context<HonoEnv>, next: Next) => {
        const authHeader = c.req.header('Authorization');
        const roleSimuladaHeader = c.req.header('X-Role-Simulada'); 

        if (!authHeader?.startsWith('Bearer ')) return c.json({ erro: 'Não autenticado.' }, 401);
        const token = authHeader.slice(7);
        const segredo = c.env.JWT_SECRET;
        if (!segredo) return c.json({ erro: 'Erro de configuração no servidor.' }, 500);

        let payload: any;
        try {
            payload = await verify(token, segredo, 'HS256');
        } catch { return c.json({ erro: 'Sessão inválida ou expirada.' }, 401); }

        const chaveCache = `sessao:${payload.id}`;
        let resUsuario: any;

        if (c.env.softhub_kv) {
            const cache = await c.env.softhub_kv.get(chaveCache);
            if (cache) resUsuario = JSON.parse(cache);
        }

        if (!resUsuario) {
            resUsuario = await c.env.DB.prepare('SELECT id, nome, email, role, versao_token FROM usuarios WHERE id = ?').bind(payload.id).first<any>();
            if (!resUsuario) return c.json({ erro: 'Usuário não mapeado.' }, 401);
            if (c.env.softhub_kv) await c.env.softhub_kv.put(chaveCache, JSON.stringify(resUsuario), { expirationTtl: 3600 });
        }

        if (payload.versao_token !== undefined && resUsuario.versao_token !== payload.versao_token) {
            return c.json({ erro: 'Sessão encerrada por login em outro local.' }, 401);
        }

        // 🛡️ REGRAS DE OURO: BOOTSTRAP OVERRIDE (Com logs de depuração)
        const rawBootstrap = (c.env.BOOTSTRAP_ADMIN_EMAIL || '');
        const listaBootstrap = rawBootstrap.toLowerCase().split(',').map((e: string) => e.trim());
        const emailUsuario = resUsuario.email.toLowerCase().trim();
        const ehMembroBootstrap = listaBootstrap.includes(emailUsuario);

        if (ehMembroBootstrap) {
            console.log(`[BOOTSTRAP] Usuário ${emailUsuario} identificado como DONO (Override Admin)`);
        } else {
            // Log para ajudar a identificar inconsistências de e-mail
            // console.log(`[AUTH] Usuário ${emailUsuario} não está na lista bootstrap: [${listaBootstrap.join(', ')}]`);
        }

        const roleAutentica = ehMembroBootstrap ? 'ADMIN' : resUsuario.role;

        let roleEfetiva = roleAutentica;
        let isSimulacao = false;

        if (roleAutentica === 'ADMIN' && roleSimuladaHeader && roleSimuladaHeader.trim() !== '') {
            roleEfetiva = roleSimuladaHeader.toUpperCase();
            isSimulacao = true;
        }

        c.set('usuario', { 
            id: resUsuario.id, 
            role: roleEfetiva, 
            email: resUsuario.email, 
            nome: resUsuario.nome,
            isSimulacao,
            ehDonoReal: ehMembroBootstrap
        });

        // Bypass total se for ADMIN REAL e não estiver simulando
        if (roleAutentica === 'ADMIN' && !isSimulacao) {
            return await next();
        }

        // Checks de cargo se não for bypass
        if (roleMinimoRequerido) {
            const hierarquia = await getHierarquiaRoles(c);
            if (!hierarquia) return c.json({ erro: 'Hierarquia não configurada.' }, 500);
            
            const idxUser = hierarquia.indexOf(roleEfetiva);
            const idxReq = hierarquia.indexOf(roleMinimoRequerido);
            
            if (idxUser === -1 || idxReq === -1 || idxUser < idxReq) {
                return c.json({ erro: 'Você não tem o cargo necessário para esta função.' }, 403);
            }
        }

        await next();
    };
}

// ─── Middleware de Permissão ────────────────────────────────────────────────

export function verificarPermissao(permissaoRequerida: string | string[]) {
    return async (c: Context<HonoEnv>, next: Next) => {
        const usuario = c.get('usuario');
        if (!usuario) return c.json({ erro: 'Acesso negado.' }, 401);

        // Bypass se a role EFETIVA for ADMIN e não for simulação
        if (usuario.role === 'ADMIN' && !usuario.isSimulacao) return await next();

        const matriz = await getPermissoesRoles(c);
        if (!matriz) return c.json({ erro: 'Tabela de governança indisponível.' }, 500);

        const permissoes = Array.isArray(permissaoRequerida) ? permissaoRequerida : [permissaoRequerida];
        const configRole = matriz[usuario.role] || {};
        const configTodos = matriz['TODOS'] || {};

        const temAcesso = permissoes.some(p => {
            const [modulo, acao] = p.split(':');
            
            // 1. Curinga role ou universal
            if (configRole['*'] === true || configTodos['*'] === true) return true;
            
            // 2. Permissão direta
            if (configRole[p] === true || configTodos[p] === true) return true;
            
            // 3. Permissão aninhada (objeto)
            if ((configRole[modulo] && typeof configRole[modulo] === 'object' && (configRole[modulo] as any)[acao] === true) ||
                (configTodos[modulo] && typeof configTodos[modulo] === 'object' && (configTodos[modulo] as any)[acao] === true)) {
                return true;
            }
            return false;
        });

        if (temAcesso) return await next();

        console.warn(`[AUTH] Acesso negado para ${usuario.email} (${usuario.role}) a '${permissaoRequerida}'. Simulação: ${usuario.isSimulacao}`);
        return c.json({ erro: 'Você não tem permissão para esta tela.' }, 403);
    };
}