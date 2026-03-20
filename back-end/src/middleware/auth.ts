import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { Env } from '../index';

/**
 * 🛠️ POLÍTICA DE SEGURANÇA PADRÃO (FALLBACK)
 * Caso o banco de dados não tenha sido configurado ou o KV falhe, 
 * essas permissões garantem que o sistema continue funcional e seguro.
 */
export const PERMISSOES_PADRAO: Record<string, any> = {
    'ADMIN': { '*': true }, // Admin tem acesso TOTAL sempre
    'GESTOR': {
        'usuarios:*': true,
        'equipes:*': true,
        'projetos:*': true,
        'tarefas:*': true,
        'ponto:*': true,
        'avisos:*': true,
        'dashboard:*': true,
        'logs:visualizar': true
    },
    'LIDER': {
        'tarefas:*': true,
        'equipes:visualizar': true,
        'ponto:visualizar': true,
        'avisos:criar': true,
        'dashboard:visualizar': true
    },
    'MEMBRO': {
        'tarefas:visualizar': true,
        'tarefas:mover': true,
        'ponto:registrar': true,
        'avisos:visualizar': true,
        'dashboard:visualizar': true
    },
    'TODOS': {
        'perfil:visualizar': true,
        'perfil:editar': true
    }
};

export const HIERARQUIA_PADRAO = ['MEMBRO', 'SUBLIDER', 'LIDER', 'GESTOR', 'COORDENADOR', 'ADMIN'];

export interface UsuarioAutenticado {
    id: string;
    role: string;      // Role efetiva (pode ser simulada)
    roleReal: string;  // Role real no banco
    email: string;
    nome: string;
    isSimulacao: boolean;
    ehDonoSistema: boolean;
}

type HonoEnv = { Bindings: Env; Variables: { usuario: UsuarioAutenticado } };

// ─── Funções de Recuperação de Configuração ──────────────────────────────────

async function carregarHierarquia(c: Context<HonoEnv>): Promise<string[]> {
    const { DB, softhub_kv } = c.env;
    try {
        const cache = await softhub_kv.get('hierarquia_roles');
        if (cache) return JSON.parse(cache);
        
        const res = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind('hierarquia_roles').first<{ valor: string }>();
        if (res?.valor) {
            const h = JSON.parse(res.valor);
            await softhub_kv.put('hierarquia_roles', res.valor, { expirationTtl: 3600 });
            return h;
        }
    } catch (e) { console.error('[AUTH] Erro ao carregar hierarquia:', e); }
    return HIERARQUIA_PADRAO;
}

async function carregarMatrizPermissoes(c: Context<HonoEnv>): Promise<Record<string, any>> {
    const { DB, softhub_kv } = c.env;
    try {
        const cache = await softhub_kv.get('permissoes_roles');
        if (cache) return JSON.parse(cache);
        
        const res = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind('permissoes_roles').first<{ valor: string }>();
        if (res?.valor) {
            const m = JSON.parse(res.valor);
            await softhub_kv.put('permissoes_roles', res.valor, { expirationTtl: 3600 });
            return m;
        }
    } catch (e) { console.error('[AUTH] Erro ao carregar matriz:', e); }
    return PERMISSOES_PADRAO;
}

// ─── Middleware de Autenticação ──────────────────────────────────────────────

export function autenticacaoRequerida(roleMinima?: string) {
    return async (c: Context<HonoEnv>, next: Next) => {
        const authHeader = c.req.header('Authorization');
        const roleSimuladaHeader = c.req.header('X-Role-Simulada');

        if (!authHeader?.startsWith('Bearer ')) return c.json({ erro: 'Autenticação necessária.' }, 401);

        const token = authHeader.slice(7);
        const segredo = c.env.JWT_SECRET;
        
        let payload: any;
        try {
            payload = await verify(token, segredo, 'HS256');
        } catch { return c.json({ erro: 'Sessão expirada ou inválida.' }, 401); }

        // Busca usuário (D1 ou KV)
        const chaveCache = `sessao:${payload.id}`;
        let resUsuario: any;
        if (c.env.softhub_kv) {
            const cache = await c.env.softhub_kv.get(chaveCache);
            if (cache) resUsuario = JSON.parse(cache);
        }

        if (!resUsuario) {
            resUsuario = await c.env.DB.prepare('SELECT id, nome, email, role, versao_token FROM usuarios WHERE id = ?').bind(payload.id).first<any>();
            if (!resUsuario) return c.json({ erro: 'Perfil não encontrado.' }, 401);
            if (c.env.softhub_kv) await c.env.softhub_kv.put(chaveCache, JSON.stringify(resUsuario), { expirationTtl: 3600 });
        }

        // Validação de Logout Remoto (Versão do Token)
        if (payload.versao_token !== undefined && resUsuario.versao_token !== payload.versao_token) {
            return c.json({ erro: 'Sua sessão foi encerrada.' }, 401);
        }

        // 🛡️ IDENTIFICAÇÃO DE DONO (BOOTSTRAP)
        const listaBootstrap = (c.env.BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase().split(',').map(e => e.trim());
        const ehMembroBootstrap = listaBootstrap.includes(resUsuario.email.toLowerCase());

        // A Role Real considera o override de Bootstrap
        const roleReal = ehMembroBootstrap ? 'ADMIN' : resUsuario.role;

        // Lógica de Simulação
        let roleEfetiva = roleReal;
        let isSimulacao = false;

        if (roleReal === 'ADMIN' && roleSimuladaHeader && roleSimuladaHeader.trim() !== '') {
            const desejada = roleSimuladaHeader.toUpperCase();
            if (desejada !== 'ADMIN') {
                roleEfetiva = desejada;
                isSimulacao = true;
            }
        }

        const usuarioCtx: UsuarioAutenticado = {
            id: resUsuario.id,
            role: roleEfetiva,
            roleReal: roleReal,
            email: resUsuario.email,
            nome: resUsuario.nome,
            isSimulacao,
            ehDonoSistema: ehMembroBootstrap
        };
        
        c.set('usuario', usuarioCtx);

        // Bypass total se for ADMIN/DONO real e não estiver simulando
        if (roleReal === 'ADMIN' && !isSimulacao) return await next();

        // Check de hierarquia se solicitado
        if (roleMinima) {
            const hierarquia = await carregarHierarquia(c);
            const idxUser = hierarquia.indexOf(roleEfetiva);
            const idxReq = hierarquia.indexOf(roleMinima);
            
            if (idxUser === -1 || idxReq === -1 || idxUser < idxReq) {
                console.warn(`[AUTH] Bloqueio Hierarquia: ${resUsuario.email} (${roleEfetiva}) < ${roleMinima}`);
                return c.json({ erro: 'Acesso restrito a cargos superiores.' }, 403);
            }
        }

        await next();
    };
}

// ─── Middleware de Permissão Granular ───────────────────────────────────────

export function verificarPermissao(permissaoRequerida: string | string[]) {
    return async (c: Context<HonoEnv>, next: Next) => {
        const usuario = c.get('usuario');
        if (!usuario) return c.json({ erro: 'Não autorizado.' }, 401);

        // 🚨 BYPASS ABSOLUTO: Admins sem simulação têm acesso a TUDO.
        if (usuario.roleReal === 'ADMIN' && !usuario.isSimulacao) return await next();

        const matriz = await carregarMatrizPermissoes(c);
        const permissoes = Array.isArray(permissaoRequerida) ? permissaoRequerida : [permissaoRequerida];
        
        const configRole = matriz[usuario.role] || {};
        const configTodos = matriz['TODOS'] || {};

        const temAcesso = permissoes.some(p => {
            const [modulo, acao] = p.split(':');

            // 1. Curinga total
            if (configRole['*'] === true || configTodos['*'] === true) return true;
            
            // 2. Curinga do módulo
            if (configRole[`${modulo}:*`] === true || configTodos[`${modulo}:*`] === true) return true;

            // 3. Permissão exata (string key)
            if (configRole[p] === true || configTodos[p] === true) return true;

            // 4. Estrutura de objeto (ex: { "usuarios": { "visualizar": true } })
            if (configRole[modulo]?.[acao] === true || configTodos[modulo]?.[acao] === true) return true;

            return false;
        });

        if (temAcesso) return await next();

        console.warn(`[AUTH] Bloqueio Permissão: ${usuario.email} (${usuario.role}) tentou '${permissaoRequerida}'`);
        return c.json({ erro: 'Você não tem permissão para realizar esta ação.' }, 403);
    };
}