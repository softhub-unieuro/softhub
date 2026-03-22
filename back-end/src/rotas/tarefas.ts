import { Hono, Context } from 'hono';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao, verificarPermissaoManual } from '../middleware/auth';
import { obterAcessoEquipeNoProjeto } from '../servicos/servico-acesso';

const rotasTarefas = new Hono<{ Bindings: Env, Variables: { usuario: any } }>({ strict: false });

/**
 * Lista as tarefas de um projeto específico, com suporte a filtros.
 * Filtros suportados: busca (texto), prioridade, responsavelId, modulo.
 */
rotasTarefas.get('/', autenticacaoRequerida(), verificarPermissao(['tarefas:visualizar', 'tarefas:visualizar_kanban', 'tarefas:visualizar_backlog', 'tarefas:visualizar_detalhes']), async (c: Context) => {
    const { DB } = c.env;
    const projetoId = c.req.query('projetoId');
    const usuario = c.get('usuario');

    if (!projetoId) return c.json({ erro: 'ID do projeto é obrigatório.' }, 400);

    // Validação de acesso básica antes de listar
    const podeVerTudo = await verificarPermissaoManual(c, 'projetos:visualizar');
    const acesso = podeVerTudo ? 'GESTAO' : await obterAcessoEquipeNoProjeto(DB, projetoId, usuario);
    if (acesso === 'NENHUM') return c.json({ erro: 'Você não tem acesso a este projeto.' }, 403);

    const busca = c.req.query('busca');
    const prioridade = c.req.query('prioridade'); 
    const responsavelId = c.req.query('responsavelId');
    const modulo = c.req.query('modulo');

    try {
        let query = `
            SELECT 
                t.id, t.titulo, t.descricao, t.status, t.prioridade, t.pontos, t.modulo, 
                t.equipe_id, e.nome as equipe_nome
            FROM tarefas t
            LEFT JOIN equipes e ON e.id = t.equipe_id
            WHERE t.projeto_id = ? AND t.arquivado = 0
        `;
        const params: any[] = [projetoId];

        if (busca) {
            query += ` AND (t.titulo LIKE ? OR t.descricao LIKE ?)`;
            params.push(`%${busca}%`, `%${busca}%`);
        }

        if (modulo) {
            query += ` AND t.modulo = ?`;
            params.push(modulo);
        }

        if (prioridade) {
            const prioridades = prioridade.split(',').filter(p => !!p);
            if (prioridades.length > 0) {
                const placeholders = prioridades.map(() => '?').join(',');
                query += ` AND t.prioridade IN (${placeholders})`;
                params.push(...prioridades);
            }
        }

        if (responsavelId) {
            query += ` AND EXISTS (SELECT 1 FROM tarefas_responsaveis tr WHERE tr.tarefa_id = t.id AND tr.usuario_id = ?)`;
            params.push(responsavelId);
        }

        const stmt = DB.prepare(query).bind(...params);
        const { results: tarefas } = await stmt.all() || { results: [] };

        if (!tarefas || tarefas.length === 0) {
            return c.json([]);
        }

        // Buscar todos os responsáveis em uma única query para evitar N+1
        const idsTarefas = (tarefas as any[]).map(t => t.id);
        const placeholders = idsTarefas.map(() => '?').join(',');
        
        const { results: todosResponsaveis } = await DB.prepare(`
            SELECT tr.tarefa_id, u.id, u.nome, u.foto_perfil as foto
            FROM usuarios u
            JOIN tarefas_responsaveis tr ON tr.usuario_id = u.id
            WHERE tr.tarefa_id IN (${placeholders})
        `).bind(...idsTarefas).all() || { results: [] };

        // Mapear responsáveis de volta para suas tarefas
        const mapaResponsaveis: Record<string, any[]> = {};
        (todosResponsaveis as any[]).forEach(r => {
            if (!mapaResponsaveis[r.tarefa_id]) mapaResponsaveis[r.tarefa_id] = [];
            mapaResponsaveis[r.tarefa_id].push({
                id: r.id,
                nome: r.nome,
                foto: r.foto
            });
        });

        const resposta = (tarefas as any[]).map(t => ({
            ...t,
            responsaveis: mapaResponsaveis[t.id] || []
        }));

        return c.json(resposta);
    } catch (erro: any) {
        console.error('[ERRO CRÍTICO] GET /api/tarefas:', erro.message || erro);
        return c.json({ 
            erro: 'Falha ao buscar tarefas', 
            detalhe: erro.message,
            query_debug: !!projetoId 
        }, 500);
    }
});

/**
 * Registra uma trava de edição (Lock) para a tarefa no KV.
 * Impede que múltiplos usuários editem o mesmo card simultaneamente.
 */
rotasTarefas.post('/:id/lock', autenticacaoRequerida(), async (c: Context) => {
    const { softhub_kv } = c.env;
    const id = c.req.param('id');
    const usuario = c.get('usuario');

    if (!id) return c.json({ erro: 'ID da tarefa não informado.' }, 400);
    if (!softhub_kv) return c.json({ sucesso: true });

    const { prenderTrava } = await import('../servicos/servico-acesso');
    const sucesso = await prenderTrava(softhub_kv, 'tarefa', id, usuario.id);

    if (!sucesso) {
        return c.json({ erro: 'Esta tarefa está sendo editada por outro membro no momento.' }, 423);
    }

    return c.json({ sucesso: true });
});

/**
 * Libera a trava de edição (Unlock) da tarefa no KV.
 */
rotasTarefas.delete('/:id/lock', autenticacaoRequerida(), async (c: Context) => {
    const { softhub_kv } = c.env;
    const id = c.req.param('id');
    const usuario = c.get('usuario');

    if (!id) return c.json({ erro: 'ID da tarefa não informado.' }, 400);

    if (softhub_kv) {
        const { soltarTrava } = await import('../servicos/servico-acesso');
        await soltarTrava(softhub_kv, 'tarefa', id, usuario.id);
    }

    return c.json({ sucesso: true });
});

export default rotasTarefas;
