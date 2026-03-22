import { Hono, Context } from 'hono';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { log } from '../utilitarios/logger';

const rotasLogs = new Hono<{ Bindings: Env, Variables: { usuario: any } }>();

/**
 * Listar logs paginados.
 * Admins e Donos vêem tudo. Outros cargos vêem conforme hierarquia e permissão.
 */
rotasLogs.get('/', autenticacaoRequerida(), async (c: Context) => {
    const { DB } = c.env;
    const usuarioLogado = c.get('usuario');

    const pagina = Number(c.req.query('pagina') ?? 1);
    const itensPorPagina = Math.min(Number(c.req.query('itensPorPagina') ?? 20), 100);
    const offset = (pagina - 1) * itensPorPagina;

    const filtroModulo = c.req.query('modulo');
    const filtroAcao = c.req.query('acao');
    const busca = c.req.query('busca');
    const dataInicio = c.req.query('dataInicio');
    const dataFim = c.req.query('dataFim');
    const apenasMeus = c.req.query('meus') === 'true';

    // 🛡️ NOVO SISTEMA: Bypass de Admin/Bootstrap sem simulação
    const ehAdminOuDono = usuarioLogado.role === 'ADMIN';

    let whereClause = 'WHERE 1=1';
    const bParams: any[] = [];

    // Lógica de "Meus Logs" vs "Todos os Logs"
    if (!ehAdminOuDono || apenasMeus) {
        whereClause += ' AND l.usuario_id = ?';
        bParams.push(usuarioLogado.id);
    }

    if (filtroModulo) {
        whereClause += ' AND l.modulo = ?';
        bParams.push(filtroModulo);
    }
    if (filtroAcao) {
        whereClause += ' AND l.acao LIKE ?';
        bParams.push(`%${filtroAcao}%`);
    }
    if (busca) {
        whereClause += ' AND (l.descricao LIKE ? OR u.nome LIKE ? OR u.email LIKE ?)';
        const searchPattern = `%${busca}%`;
        bParams.push(searchPattern, searchPattern, searchPattern);
    }
    if (dataInicio) {
        whereClause += ' AND l.criado_em >= ?';
        bParams.push(dataInicio);
    }
    if (dataFim) {
        whereClause += ' AND l.criado_em <= ?';
        bParams.push(dataFim);
    }

    try {
        const queryCount = `SELECT COUNT(*) as total FROM logs l LEFT JOIN usuarios u ON l.usuario_id = u.id ${whereClause}`;
        const countRes = (await DB.prepare(queryCount).bind(...bParams).first()) as { total: number };
        const total = countRes?.total || 0;

        const querySelect = `
            SELECT l.id, l.usuario_id, u.nome, u.email, u.role, u.foto_perfil,
                   l.acao, l.modulo, l.descricao, l.ip, l.entidade_tipo, l.entidade_id, 
                   l.dados_anteriores, l.dados_novos, l.criado_em
            FROM logs l
            LEFT JOIN usuarios u ON l.usuario_id = u.id
            ${whereClause}
            ORDER BY l.criado_em DESC 
            LIMIT ? OFFSET ?
        `;
        const { results: dados } = await DB.prepare(querySelect).bind(...bParams, itensPorPagina, offset).all();

        return c.json({
            dados,
            paginacao: {
                total,
                pagina,
                itensPorPagina,
                totalPaginas: Math.ceil(total / itensPorPagina)
            }
        });

    } catch (erro: any) {
        log('error', '[LOGS] Falha ao buscar logs', { erro: erro.message, pagina });
        return c.json({ erro: 'Falha ao buscar logs', detalhe: erro.message }, 500);
    }
});

/**
 * Estatísticas concentradas de logs (ex: contagem por módulo).
 */
rotasLogs.get('/estatisticas', autenticacaoRequerida(), verificarPermissao('logs:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    
    try {
        const { results } = await DB.prepare(`
            SELECT modulo, COUNT(*) as quantidade 
            FROM logs 
            GROUP BY modulo 
            ORDER BY quantidade DESC
        `).all();

        return c.json({
            modulos: results || [],
        });
    } catch (erro: any) {
        log('error', '[LOGS-STATS] Falha ao processar estatísticas de auditoria', { erro: erro.message });
        return c.json({ erro: 'Falha ao processar estatísticas de auditoria.' }, 500);
    }
});

export default rotasLogs;
