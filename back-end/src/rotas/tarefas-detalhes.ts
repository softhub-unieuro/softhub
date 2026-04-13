import { Hono, Context } from 'hono';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { log } from '../utilitarios/logger';
import { registrarLog } from '../servicos/servico-logs';
import { criarNotificacoes } from '../servicos/servico-notificacoes';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { sanitizarHTML } from '../utilitarios/limpeza';
import { extrairPaginacao, formatarRespostaPaginada } from '../utilitarios/paginacao';
import * as RepoTarefasDet from '../repositorios/repo-tarefas-detalhes';

const rotasTarefasDetalhes = new Hono<{ Bindings: Env, Variables: { usuario: any } }>();

// === COMENTÁRIOS DA TAREFA ===

rotasTarefasDetalhes.get('/:id/comentarios', autenticacaoRequerida(), verificarPermissao('tarefas:visualizar_detalhes'), async (c: Context) => {
    const { DB } = c.env;
    const tarefaId = c.req.param('id') as string;
    try {
        const results = await RepoTarefasDet.buscarComentariosTarefa(DB, tarefaId);
        return c.json(results);
    } catch (erro: any) {
        log('error', '[TAREFAS-DET] Falha ao buscar comentários', { erro: erro.message, tarefaId });
        return c.json({ erro: 'Falha ao buscar comentários' }, 500);
    }
});

const ComentarioSchema = z.object({
    conteudo: z.string().min(1).max(2000)
});

rotasTarefasDetalhes.post('/:id/comentarios', autenticacaoRequerida(), verificarPermissao('tarefas:comentar'), zValidator('json', ComentarioSchema), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const tarefaId = c.req.param('id');
    const { conteudo } = (c.req as any).valid('json');
    const usuario = c.get('usuario') as any;

    try {
        if (!conteudo || !conteudo.trim()) return c.json({ erro: 'Conteúdo vazio' }, 400);

        const resTarefa = await DB.prepare('SELECT titulo FROM tarefas WHERE id = ?').bind(tarefaId).first();
        const tarefaData = resTarefa as any;
        if (!tarefaData) return c.json({ erro: 'Tarefa não encontrada' }, 404);

        const idComentario = crypto.randomUUID();
        const conteudoSani = sanitizarHTML(conteudo.trim());
        
        await DB.prepare(`INSERT INTO comentarios_tarefa (id, tarefa_id, autor_id, conteudo) VALUES (?, ?, ?, ?)`)
            .bind(idComentario, tarefaId, usuario.id, conteudoSani).run();

        // Evitando Flood: Notificando o responsável + atuais comentaristas, isentando o próprio autor
        const responsaveisReq = await DB.prepare('SELECT usuario_id FROM tarefas_responsaveis WHERE tarefa_id = ?').bind(tarefaId).all();
        const comentaristasReq = await DB.prepare('SELECT DISTINCT autor_id FROM comentarios_tarefa WHERE tarefa_id = ?').bind(tarefaId).all();

        const usuariosParaNotificar = new Set<string>();
        responsaveisReq.results.forEach((r: any) => usuariosParaNotificar.add(r.usuario_id as string));
        comentaristasReq.results.forEach((cm: any) => usuariosParaNotificar.add(cm.autor_id as string));

        usuariosParaNotificar.delete(usuario.id); // O autor não é notificado da sua própria ação

        if (usuariosParaNotificar.size > 0) {
            await criarNotificacoes(DB, {
                usuariosIds: Array.from(usuariosParaNotificar),
                tipo: 'tarefa',
                titulo: 'Novo comentário',
                mensagem: `${usuario.nome} comentou na tarefa "${tarefaData.titulo}".`,
                link: `/app/kanban?tarefa=${tarefaId}`
            }, softhub_kv);
        }

        // Comentário em Tarefa registrada com sucesso
        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'TAREFA_COMENTADA',
            modulo: 'kanban',
            descricao: `Novo comentário na tarefa "${tarefaData.titulo}"`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'tarefas',
            entidadeId: tarefaId
        });

        return c.json({ sucesso: true, id: idComentario });
    } catch (erro: any) {
        log('error', '[TAREFAS-DET] Falha ao adicionar comentário', { erro: erro.message, tarefaId });
        return c.json({ erro: 'Falha ao adicionar comentário' }, 500);
    }
});

rotasTarefasDetalhes.patch('/comentarios/:id', autenticacaoRequerida(), verificarPermissao('tarefas:comentar'), zValidator('json', ComentarioSchema), async (c: Context) => {
    const { DB } = c.env;
    const comentarioId = c.req.param('id');
    const { conteudo } = (c.req as any).valid('json');
    const usuario = c.get('usuario') as any;

    try {
        if (!conteudo || !conteudo.trim()) return c.json({ erro: 'Conteúdo vazio' }, 400);

        const resComentario = await DB.prepare('SELECT autor_id, tarefa_id FROM comentarios_tarefa WHERE id = ?').bind(comentarioId).first();
        const comentarioRow = resComentario as any;
        if (!comentarioRow) return c.json({ erro: 'Comentário não encontrado' }, 404);

        if (comentarioRow.autor_id !== usuario.id) {
            return c.json({ erro: 'Apenas o autor pode editar este comentário.' }, 403);
        }

        const conteudoSani = sanitizarHTML(conteudo.trim());
        await DB.prepare('UPDATE comentarios_tarefa SET conteudo = ?, atualizado_em = ? WHERE id = ?')
            .bind(conteudoSani, new Date().toISOString(), comentarioId).run();

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'TAREFA_COMENTARIO_EDITADO',
            modulo: 'kanban',
            descricao: `Comentário ${comentarioId} editado na tarefa ${comentarioRow.tarefa_id}`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'tarefas',
            entidadeId: comentarioRow.tarefa_id
        });

        return c.json({ sucesso: true });
    } catch (erro: any) {
        log('error', '[TAREFAS-DET] Falha ao editar comentário', { erro: erro.message, comentarioId });
        return c.json({ erro: 'Falha ao editar comentário' }, 500);
    }
});

rotasTarefasDetalhes.delete('/comentarios/:id', autenticacaoRequerida(), verificarPermissao('tarefas:comentar'), async (c: Context) => {
    const { DB } = c.env;
    const comentarioId = c.req.param('id');
    const usuario = c.get('usuario') as any;

    try {
        const resComRow = await DB.prepare('SELECT autor_id, tarefa_id FROM comentarios_tarefa WHERE id = ?').bind(comentarioId).first();
        const comentarioRow = resComRow as any;
        if (!comentarioRow) return c.json({ erro: 'Comentário não encontrado' }, 404);

        await DB.prepare('DELETE FROM comentarios_tarefa WHERE id = ?').bind(comentarioId).run();

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'TAREFA_COMENTARIO_REMOVIDO',
            modulo: 'kanban',
            descricao: `Comentário ${comentarioId} removido da tarefa ${comentarioRow.tarefa_id}`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'tarefas',
            entidadeId: comentarioRow.tarefa_id
        });

        return c.json({ sucesso: true });
    } catch (erro: any) {
        log('error', '[TAREFAS-DET] Falha ao excluir comentário', { erro: erro.message, comentarioId });
        return c.json({ erro: 'Falha ao excluir comentário' }, 500);
    }
});

// === Workflow 29: Histórico da Tarefa ===

rotasTarefasDetalhes.get('/:id/historico', autenticacaoRequerida(), verificarPermissao('tarefas:visualizar_detalhes'), async (c: Context) => {
    const { DB } = c.env;
    const tarefaId = c.req.param('id') as string;
    const params = extrairPaginacao(c);

    try {
        if (!tarefaId) return c.json({ erro: 'ID da tarefa obrigatório' }, 400);

        // [PERF-001] Histórico paginado para evitar lentidão em tarefas com muitas movimentações
        const historico = await RepoTarefasDet.buscarHistoricoTarefasPaginado(
            DB, 
            tarefaId, 
            params.limit, 
            params.offset
        );

        // Para metadados de paginação, precisaríamos de um COUNT, mas simplificaremos para o fluxo atual
        return c.json(historico);
    } catch (e: any) {
        log('error', '[TAREFAS-DET] Falha ao buscar histórico unificado', { erro: e.message, tarefaId });
        return c.json({ erro: 'Falha ao buscar histórico unificado da tarefa' }, 500);
    }
});

// === Workflow 31: Checklist de Tarefas ===

// Listar itens do checklist
rotasTarefasDetalhes.get('/:id/checklist', autenticacaoRequerida(), verificarPermissao('tarefas:visualizar_detalhes'), async (c: Context) => {
    const { DB } = c.env;
    const tarefaId = c.req.param('id') as string;
    try {
        const results = await RepoTarefasDet.buscarChecklistTarefa(DB, tarefaId);
        return c.json(results);
    } catch (e) {
        return c.json({ erro: 'Falha ao buscar checklist' }, 500);
    }
});

// Adicionar item ao checklist
const ItemChecklistSchema = z.object({
    texto: z.string().min(1).max(255)
});

rotasTarefasDetalhes.post('/:id/checklist', autenticacaoRequerida(), verificarPermissao('tarefas:checklist'), zValidator('json', ItemChecklistSchema), async (c: Context) => {
    const { DB } = c.env;
    const tarefaId = c.req.param('id');
    const { texto } = (c.req as any).valid('json');
    const usuario = c.get('usuario') as any;

    if (!texto || !texto.trim()) return c.json({ erro: 'Texto obrigatório' }, 400);

    try {
        const id = crypto.randomUUID();
        const tarefa = await DB.prepare('SELECT titulo FROM tarefas WHERE id = ?').bind(tarefaId).first() as any;
        if (!tarefa) return c.json({ erro: 'Tarefa não encontrada' }, 404);

        await DB.prepare('INSERT INTO checklist_tarefa (id, tarefa_id, texto) VALUES (?, ?, ?)')
            .bind(id, tarefaId, texto.trim()).run();

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'TAREFA_CHECKLIST_ADICIONADO',
            modulo: 'kanban',
            descricao: `Item "${texto.trim()}" adicionado ao checklist da tarefa "${tarefa.titulo}"`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'tarefas',
            entidadeId: tarefaId,
            dadosNovos: { texto: texto.trim() }
        });

        return c.json({ id }, 201);
    } catch (e) {
        return c.json({ erro: 'Falha ao adicionar item' }, 500);
    }
});

// Atualizar item (concluir/desconcluir ou editar texto)
const AtualizarItemChecklistSchema = z.object({
    concluido: z.boolean().optional(),
    texto: z.string().min(1).max(255).optional()
});

rotasTarefasDetalhes.patch('/:tarefaId/checklist/:itemId', autenticacaoRequerida(), verificarPermissao('tarefas:visualizar_detalhes'), zValidator('json', AtualizarItemChecklistSchema), async (c: Context) => {
    const { DB } = c.env;
    const { concluido, texto } = (c.req as any).valid('json');
    const itemId = c.req.param('itemId');
    const tarefaId = c.req.param('tarefaId');

    const usuario = c.get('usuario') as any;

    try {
        const item = await DB.prepare('SELECT c.texto, c.concluido, t.titulo FROM checklist_tarefa c JOIN tarefas t ON c.tarefa_id = t.id WHERE c.id = ?').bind(itemId).first() as any;
        if (!item) return c.json({ erro: 'Item não encontrado' }, 404);

        if (concluido !== undefined && !!item.concluido !== !!concluido) {
            await DB.prepare('UPDATE checklist_tarefa SET concluido = ? WHERE id = ?').bind(concluido ? 1 : 0, itemId).run();
            
            await registrarLog(DB, {
                usuarioId: usuario.id,
                acao: 'TAREFA_CHECKLIST_ALTERADO',
                modulo: 'kanban',
                descricao: `Item "${item.texto}" da tarefa "${item.titulo}" marcado como ${concluido ? 'CONCLUÍDO' : 'PENDENTE'}`,
                ip: c.req.header('CF-Connecting-IP') ?? '',
                entidadeTipo: 'tarefas',
                entidadeId: tarefaId,
                dadosAnteriores: { concluido: !!item.concluido },
                dadosNovos: { concluido: !!concluido }
            });
        }
        
        if (texto !== undefined && item.texto !== texto.trim()) {
            await DB.prepare('UPDATE checklist_tarefa SET texto = ? WHERE id = ?').bind(texto.trim(), itemId).run();
            
            await registrarLog(DB, {
                usuarioId: usuario.id,
                acao: 'TAREFA_CHECKLIST_EDICAO',
                modulo: 'kanban',
                descricao: `Item do checklist da tarefa "${item.titulo}" renomeado para "${texto.trim()}"`,
                ip: c.req.header('CF-Connecting-IP') ?? '',
                entidadeTipo: 'tarefas',
                entidadeId: tarefaId,
                dadosAnteriores: { texto: item.texto },
                dadosNovos: { texto: texto.trim() }
            });
        }
        return c.json({ sucesso: true });
    } catch (e) {

        return c.json({ erro: 'Falha ao atualizar item' }, 500);
    }
});

// Remover item do checklist (DELETE real conforme regra)
rotasTarefasDetalhes.delete('/:tarefaId/checklist/:itemId', autenticacaoRequerida(), verificarPermissao('tarefas:checklist'), async (c: Context) => {
    const { DB } = c.env;
    const itemId = c.req.param('itemId');

    const usuario = c.get('usuario') as any;
    const tarefaId = c.req.param('tarefaId');

    try {
        const item = await DB.prepare('SELECT c.texto, t.titulo FROM checklist_tarefa c JOIN tarefas t ON c.tarefa_id = t.id WHERE c.id = ?').bind(itemId).first() as any;
        if (!item) return c.json({ erro: 'Item já não existe' }, 200);

        await DB.prepare('DELETE FROM checklist_tarefa WHERE id = ?').bind(itemId).run();

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'TAREFA_CHECKLIST_REMOVIDO',
            modulo: 'kanban',
            descricao: `Item "${item.texto}" removido do checklist da tarefa "${item.titulo}"`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'tarefas',
            entidadeId: tarefaId,
            dadosAnteriores: { texto: item.texto }
        });

        return c.json({ sucesso: true });
    } catch (e) {
        return c.json({ erro: 'Falha ao remover item' }, 500);
    }
});

// === FASE 2: Feedback de Mentoria ===

const FeedbackSchema = z.object({
    feedback_lider: z.string().max(2000),
    nota_aprendizado: z.number().int().min(1).max(5)
});

rotasTarefasDetalhes.patch('/:id/feedback', 
    autenticacaoRequerida(), 
    verificarPermissao(['projetos:editar', 'tarefas:editar']), 
    zValidator('json', FeedbackSchema), 
    async (c: Context) => {
    
    const { DB } = c.env;
    const id = c.req.param('id') as string;
    const { feedback_lider, nota_aprendizado } = (c.req as any).valid('json');
    const usuario = c.get('usuario') as any;

    try {
        const tarefa = await RepoTarefasDet.buscarTarefaPorId(DB, id);
        if (!tarefa) return c.json({ erro: 'Tarefa não encontrada' }, 404);

        if (tarefa.status !== 'concluida') {
            return c.json({ erro: 'Feedback só pode ser deixado em tarefas concluídas.' }, 400);
        }

        // Apenas Liderança ou Admin pode deixar feedback
        const ehLider = ['ADMIN', 'COORDENADOR', 'GESTOR', 'LIDER', 'SUBLIDER'].includes(usuario.role);
        if (!ehLider) {
            return c.json({ erro: 'Apenas a liderança pode avaliar o aprendizado.' }, 403);
        }

        // [SEC-001] Validação IDOR: Verificar se o líder pertence à equipe da tarefa
        if (usuario.roleReal !== 'ADMIN' && !usuario.ehDonoSistema) {
            if (!tarefa.equipe_id) {
                return c.json({ erro: 'Tarefa sem equipe vinculada.' }, 400);
            }

            // Verifica se o usuário é líder ou sub-líder da equipe específica
            const equipe = await DB.prepare('SELECT lider_id, sub_lider_id FROM equipes WHERE id = ?').bind(tarefa.equipe_id).first() as any;
            const isLiderEquipe = equipe?.lider_id === usuario.id || equipe?.sub_lider_id === usuario.id;

            // Coordenadores e Gestores têm permissão global conforme a hierarquia de cargos superiores
            const ehCadeiaGestao = ['COORDENADOR', 'GESTOR'].includes(usuario.role);

            if (!isLiderEquipe && !ehCadeiaGestao) {
                return c.json({ erro: 'Você não tem permissão para deixar feedback em tarefas de outra equipe.' }, 403);
            }
        }

        const feedbackSani = sanitizarHTML(feedback_lider);
        await DB.prepare('UPDATE tarefas SET feedback_lider = ?, nota_aprendizado = ? WHERE id = ?')
            .bind(feedbackSani, nota_aprendizado, id).run();

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'TAREFA_FEEDBACK_REGISTRADO',
            modulo: 'kanban',
            descricao: `Feedback de mentoria registrado para a tarefa "${tarefa.titulo}"`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'tarefas',
            entidadeId: id
        });

        return c.json({ sucesso: true });
    } catch (e: any) {
        log('error', '[TAREFAS-DET] Falha ao registrar feedback', { erro: e.message, tarefaId: id });
        return c.json({ erro: 'Falha ao registrar feedback' }, 500);
    }
});

export default rotasTarefasDetalhes;
