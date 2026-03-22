import { Hono, Context } from 'hono';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import * as servico from '../servicos/servico-tarefas';

const rotasTarefas = new Hono<{ Bindings: Env, Variables: { usuario: any } }>({ strict: false });

/**
 * Lista as tarefas de um projeto específico, com suporte a filtros.
 * Filtros suportados: busca (texto), prioridade, responsavelId, modulo.
 */
rotasTarefas.get('/', autenticacaoRequerida(), verificarPermissao(['tarefas:visualizar', 'tarefas:visualizar_kanban', 'tarefas:visualizar_backlog', 'tarefas:visualizar_detalhes']), async (c: Context) => {
    const projetoId = c.req.query('projetoId');
    const usuario = c.get('usuario');

    if (!projetoId) return c.json({ erro: 'ID do projeto é obrigatório.' }, 400);

    const filtros = {
        busca: c.req.query('busca'),
        prioridade: c.req.query('prioridade'), 
        responsavelId: c.req.query('responsavelId'),
        modulo: c.req.query('modulo'),
        projetoId
    };

    try {
        const tarefas = await servico.listarTarefas(c.env, usuario, projetoId, filtros, c);
        return c.json(tarefas);
    } catch (erro: any) {
        // O serviço já loga erros se necessário, ou podemos deixar para o middleware global
        return c.json({ 
            erro: erro.message === 'Você não tem acesso a este projeto.' ? erro.message : 'Falha ao buscar tarefas', 
            detalhe: erro.message 
        }, erro.message === 'Você não tem acesso a este projeto.' ? 403 : 500);
    }
});

/**
 * Registra uma trava de edição (Lock) para a tarefa no KV.
 */
rotasTarefas.post('/:id/lock', autenticacaoRequerida(), async (c: Context) => {
    const id = c.req.param('id');
    const usuario = c.get('usuario');

    if (!id) return c.json({ erro: 'ID da tarefa não informado.' }, 400);

    try {
        await servico.gerenciarTravaTarefa(c.env.softhub_kv, id, usuario.id, 'lock');
        return c.json({ sucesso: true });
    } catch (erro: any) {
        return c.json({ erro: erro.message }, 423);
    }
});

/**
 * Libera a trava de edição (Unlock) da tarefa no KV.
 */
rotasTarefas.delete('/:id/lock', autenticacaoRequerida(), async (c: Context) => {
    const id = c.req.param('id');
    const usuario = c.get('usuario');

    if (!id) return c.json({ erro: 'ID da tarefa não informado.' }, 400);

    try {
        await servico.gerenciarTravaTarefa(c.env.softhub_kv, id, usuario.id, 'unlock');
        return c.json({ sucesso: true });
    } catch (erro: any) {
        return c.json({ erro: erro.message }, 500);
    }
});

export default rotasTarefas;
