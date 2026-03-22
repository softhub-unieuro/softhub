import { Hono, Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao, verificarPermissaoManual } from '../middleware/auth';
import { registrarLog } from '../servicos/servico-logs';
import { criarNotificacoes, removerNotificacoesPorEntidade } from '../servicos/servico-notificacoes';
import { obterAcessoEquipeNoProjeto } from '../servicos/servico-acesso';
import { log } from '../utilitarios/logger';

const rotasGerenciamento = new Hono<{ Bindings: Env, Variables: { usuario: any } }>();

const CriarTarefaSchema = z.object({
    projeto_id: z.string(),
    titulo: z.string().min(3).max(100),
    descricao: z.string().optional(),
    prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).default('media'),
    status: z.enum(['backlog', 'todo', 'in_progress', 'em_revisao', 'concluida']).default('backlog'),
    modulo: z.string().optional(),
    pontos: z.number().int().min(0).max(100).optional(),
    equipe_id: z.string().optional().nullable(),
    grupo_id: z.string().optional().nullable(),
    responsaveis: z.array(z.string()).optional(),
});

/**
 * Cria uma nova tarefa.
 */
rotasGerenciamento.post('/', 
    autenticacaoRequerida(), 
    verificarPermissao('tarefas:criar'), 
    zValidator('json', CriarTarefaSchema), 
    async (c: Context) => {
    
    const { DB, softhub_kv } = c.env;
    const body = (c.req as any).valid('json');
    const usuario = c.get('usuario') as any;

    try {
        const projeto = await DB.prepare('SELECT id FROM projetos WHERE id = ?').bind(body.projeto_id).first();
        if (!projeto) return c.json({ erro: 'O projeto especificado não existe.' }, 404);

        const podeVerTudo = await verificarPermissaoManual(c, 'projetos:visualizar');
        const acessoEquipe = podeVerTudo ? 'GESTAO' : await obterAcessoEquipeNoProjeto(DB, body.projeto_id, usuario);
        if (acessoEquipe === 'LEITURA' || acessoEquipe === 'NENHUM') {
            return c.json({ erro: 'Sua equipe tem apenas permissão de Leitura neste projeto.' }, 403);
        }

        const id = crypto.randomUUID();
        await DB.prepare(`
            INSERT INTO tarefas (id, projeto_id, titulo, descricao, prioridade, status, modulo, pontos, equipe_id, grupo_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, body.projeto_id, body.titulo, body.descricao || null, body.prioridade, body.status, body.modulo || null, body.pontos ?? 1, body.equipe_id || null, body.grupo_id || null).run();

        // 🚀 Atribui responsáveis iniciais, se fornecidos
        if (body.responsaveis && body.responsaveis.length > 0) {
            const batch = body.responsaveis.map((uid: string) => {
                return DB.prepare('INSERT OR IGNORE INTO tarefas_responsaveis (tarefa_id, usuario_id) VALUES (?, ?)')
                         .bind(id, uid);
            });
            await DB.batch(batch);

            // Notifica os responsáveis
            await criarNotificacoes(DB, {
                usuariosIds: body.responsaveis,
                tipo: 'tarefa',
                titulo: 'Nova Tarefa Atribuída',
                mensagem: `Você foi designado para a tarefa "${body.titulo}".`,
                link: `/app/kanban?tarefa=${id}`,
                entidadeId: id
            }, softhub_kv);
        }

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
        log('error', '[TAREFAS-GER] Falha ao criar tarefa', { erro: erro.message, projetoId: body.projeto_id });
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

        const podeVerTudo = await verificarPermissaoManual(c, 'projetos:visualizar');
        const acessoEquipe = podeVerTudo ? 'GESTAO' : await obterAcessoEquipeNoProjeto(DB, tarefa.projeto_id, usuario);
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
    } catch (erro: any) {
        log('error', '[TAREFAS-GER] Falha ao atribuir responsável', { erro: erro.message, tarefaId: id });
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

        const podeVerTudo = await verificarPermissaoManual(c, 'projetos:visualizar');
        const acessoEquipe = podeVerTudo ? 'GESTAO' : await obterAcessoEquipeNoProjeto(DB, tarefa.projeto_id, usuario);
        if (acessoEquipe === 'LEITURA' || acessoEquipe === 'NENHUM') return c.json({ erro: 'Acesso negado.' }, 403);

        // 🛡️ Regra: Sem DELETE real (Soft Delete)
        await DB.prepare('UPDATE tarefas SET arquivado = 1, atualizado_em = ? WHERE id = ?')
            .bind(new Date().toISOString(), id)
            .run();
            
        if (id) await removerNotificacoesPorEntidade(DB, id);

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'TAREFA_ARQUIVADA',
            modulo: 'kanban',
            descricao: `Tarefa "${tarefa.titulo}" arquivada (Soft Delete)`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'tarefas',
            entidadeId: id,
            dadosAnteriores: { titulo: tarefa.titulo, projeto_id: tarefa.projeto_id }
        });

        return c.json({ sucesso: true });
    } catch (erro: any) {
        log('error', '[TAREFAS-GER] Falha ao remover tarefa', { erro: erro.message, tarefaId: id });
        return c.json({ erro: 'Falha ao remover tarefa' }, 500);
    }
});

export default rotasGerenciamento;
