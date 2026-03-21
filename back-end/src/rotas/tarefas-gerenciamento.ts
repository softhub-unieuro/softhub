import { Hono, Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { registrarLog } from '../servicos/servico-logs';
import { criarNotificacoes, removerNotificacoesPorEntidade } from '../servicos/servico-notificacoes';
import { obterAcessoEquipeNoProjeto } from '../servicos/servico-acesso';

const rotasGerenciamento = new Hono<{ Bindings: Env, Variables: { usuario: any } }>();

const CriarTarefaSchema = z.object({
    projeto_id: z.string(),
    titulo: z.string().min(3).max(100),
    descricao: z.string().optional(),
    prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).default('media'),
    status: z.enum(['backlog', 'todo', 'in_progress', 'em_revisao', 'concluida']).default('backlog'),
    modulo: z.string().optional(),
    pontos: z.number().int().min(0).max(100).optional(),
});

/**
 * Cria uma nova tarefa.
 */
rotasGerenciamento.post('/', 
    autenticacaoRequerida(), 
    verificarPermissao('tarefas:criar'), 
    zValidator('json', CriarTarefaSchema), 
    async (c: Context) => {
    
    const { DB } = c.env;
    const body = (c.req as any).valid('json');
    const usuario = c.get('usuario') as any;

    try {
        const projeto = await DB.prepare('SELECT id FROM projetos WHERE id = ?').bind(body.projeto_id).first();
        if (!projeto) return c.json({ erro: 'O projeto especificado não existe.' }, 404);

        const acessoEquipe = await obterAcessoEquipeNoProjeto(DB, body.projeto_id, usuario);
        if (acessoEquipe === 'LEITURA' || acessoEquipe === 'NENHUM') {
            return c.json({ erro: 'Sua equipe tem apenas permissão de Leitura neste projeto.' }, 403);
        }

        const id = crypto.randomUUID();
        await DB.prepare(`
            INSERT INTO tarefas (id, projeto_id, titulo, descricao, prioridade, status, modulo, pontos)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, body.projeto_id, body.titulo, body.descricao || null, body.prioridade, body.status, body.modulo || null, body.pontos ?? 1).run();

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'TAREFA_CRIADA',
            modulo: 'kanban',
            descricao: `Tarefa "${body.titulo}" criada no projeto ${body.projeto_id}`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'tarefas',
            entidadeId: id,
            dadosNovos: body
        });

        return c.json({ id, sucesso: true }, 201);
    } catch (erro: any) {
        console.error('[ERRO] POST /api/tarefas', erro);
        return c.json({ erro: 'Falha ao criar tarefa' }, 500);
    }
});

const AtribuirResponsavelSchema = z.object({
    usuario_id: z.string().uuid()
});

/**
 * Atribui/Vincula um responsável a tarefa.
 */
rotasGerenciamento.post('/:id/responsaveis', 
    autenticacaoRequerida(), 
    verificarPermissao('tarefas:editar'), 
    zValidator('json', AtribuirResponsavelSchema), 
    async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const id = c.req.param('id');
    const { usuario_id } = (c.req as any).valid('json');
    const usuario = c.get('usuario') as any;

    try {
        const tarefa = await DB.prepare('SELECT titulo, projeto_id FROM tarefas WHERE id = ?').bind(id).first() as any;
        if (!tarefa) return c.json({ erro: 'Tarefa não encontrada' }, 404);

        const acessoEquipe = await obterAcessoEquipeNoProjeto(DB, tarefa.projeto_id, usuario);
        if (acessoEquipe === 'LEITURA' || acessoEquipe === 'NENHUM') {
            return c.json({ erro: 'Permissão de leitura insuficiente.' }, 403);
        }

        await DB.prepare('INSERT OR IGNORE INTO tarefas_responsaveis (tarefa_id, usuario_id) VALUES (?, ?)').bind(id, usuario_id).run();

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'TAREFA_RESPONSAVEL_ADICIONADO',
            modulo: 'kanban',
            descricao: `Responsável ${usuario_id} adicionado à tarefa "${tarefa.titulo}"`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'tarefas',
            entidadeId: id,
            dadosNovos: { usuario_id, tarefa_titulo: tarefa.titulo }
        });

        await criarNotificacoes(DB, {
            usuarioId: usuario_id,
            tipo: 'tarefa',
            titulo: 'Nova Atribuição',
            mensagem: `Você foi atribuído à tarefa "${tarefa.titulo}".`,
            link: `/app/kanban?tarefa=${id}`,
            entidadeId: id
        }, softhub_kv);

        return c.json({ sucesso: true });
    } catch (erro) {
        console.error('[ERRO] POST /api/tarefas/:id/responsaveis', erro);
        return c.json({ erro: 'Falha ao atribuir responsável' }, 500);
    }
});

/**
 * Deleta uma tarefa permanentemente (Hard Delete).
 */
rotasGerenciamento.delete('/:id', autenticacaoRequerida(), verificarPermissao('tarefas:editar'), async (c: Context) => {
    const { DB } = c.env;
    const id = c.req.param('id');
    const usuario = c.get('usuario') as any;

    try {
        const tarefa = await DB.prepare('SELECT titulo, projeto_id FROM tarefas WHERE id = ?').bind(id).first() as any;
        if (!tarefa) return c.json({ erro: 'Tarefa não encontrada' }, 404);

        const acessoEquipe = await obterAcessoEquipeNoProjeto(DB, tarefa.projeto_id, usuario);
        if (acessoEquipe === 'LEITURA' || acessoEquipe === 'NENHUM') return c.json({ erro: 'Acesso negado.' }, 403);

        await DB.prepare('DELETE FROM tarefas WHERE id = ?').bind(id).run();
        if (id) await removerNotificacoesPorEntidade(DB, id);

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'TAREFA_REMOVIDA_HARD',
            modulo: 'kanban',
            descricao: `Tarefa "${tarefa.titulo}" removida permanentemente do projeto ${tarefa.projeto_id}`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'tarefas',
            entidadeId: id,
            dadosAnteriores: { titulo: tarefa.titulo, projeto_id: tarefa.projeto_id }
        });

        return c.json({ sucesso: true });
    } catch (erro) {
        console.error('[ERRO] DELETE /api/tarefas/:id', erro);
        return c.json({ erro: 'Falha ao remover tarefa' }, 500);
    }
});

export default rotasGerenciamento;
