import { Hono, Context } from 'hono';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';

const rotasUsuarios = new Hono<{ Bindings: Env; Variables: { usuario: any } }>({ strict: false });

/**
 * Health Check do módulo de usuários.
 */
rotasUsuarios.get('/ping', async (c) => {
    const { DB } = c.env;
    try {
        const res = await DB.prepare('SELECT COUNT(*) as n FROM usuarios').first();
        return c.json({ status: 'ok', banco_usuarios: (res as any)?.n ?? 0, timestamp: new Date().toISOString() });
    } catch (e: any) {
        return c.json({ status: 'erro', detalhes: e.message }, 500);
    }
});

/**
 * Lista todos os membros do sistema.
 * Requer permissão 'membros:gerenciar'.
 */
rotasUsuarios.get('/', autenticacaoRequerida(), verificarPermissao('membros:gerenciar'), async (c: Context) => {
    const { DB, BOOTSTRAP_ADMIN_EMAIL } = c.env;
    try {
        const listaBootstrap = (BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase().split(',').map((e: string) => e.trim());

        // OTIMIZAÇÃO: Consulta única com GROUP_CONCAT e JOIN para evitar subconsultas custosas
        const query = `
            SELECT 
                u.id, u.nome, u.email, u.role, u.foto_perfil, u.foto_banner, u.bio, u.criado_em,
                u.github_url, u.linkedin_url, u.website_url,
                GROUP_CONCAT(uo.grupo_id) as grupos_ids,
                GROUP_CONCAT(e.nome) as equipe_nome,
                MAX(uo.equipe_id) as equipe_id
            FROM usuarios u
            LEFT JOIN usuarios_organizacao uo ON uo.usuario_id = u.id
            LEFT JOIN equipes e ON e.id = uo.equipe_id
            GROUP BY u.id
            ORDER BY u.nome ASC
        `;
        const res = await DB.prepare(query).all();
        
        // Adiciona flag is_bootstrap dinamicamente
        const membrosComFlag = (res.results || []).map((m: any) => ({
            ...m,
            is_bootstrap: listaBootstrap.includes(m.email.toLowerCase()) && m.role === 'ADMIN'
        }));

        return c.json({ membros: membrosComFlag });
    } catch (erro: any) {
        console.error('[ERRO] GET /api/usuarios:', erro.message);
        return c.json({ erro: 'Falha ao buscar membros' }, 500);
    }
});

/**
 * Retorna as opções básicas de usuários para seleção em formulários.
 * Apenas leitura (nome, id, foto).
 */
rotasUsuarios.get('/opcoes', autenticacaoRequerida(), async (c: Context) => {
    const { DB } = c.env;
    try {
        const res = await DB.prepare(`
            SELECT id, nome, foto_perfil
            FROM usuarios 
            WHERE arquivado = 0
            ORDER BY nome ASC
        `).all();
        return c.json({ membros: res.results || [] });
    } catch (erro: any) {
        return c.json({ erro: 'Falha ao buscar opções de membros' }, 500);
    }
});

export default rotasUsuarios;