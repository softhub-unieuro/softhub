import { Hono, Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao, verificarPermissaoManual } from '../middleware/auth';
import { log } from '../utilitarios/logger';
import { registrarLog } from '../servicos/servico-logs';
import { criarNotificacoes } from '../servicos/servico-notificacoes';
import { obterAcessoEquipeNoProjeto } from '../servicos/servico-acesso';

const rotasMovimentacao = new Hono<{ Bindings: Env, Variables: { usuario: any } }>();

const MoverTarefaSchema = z.object({
    status: z.enum(['backlog', 'todo', 'in_progress', 'em_revisao', 'concluida']),
});

/**
 * Move uma tarefa entre as colunas do Kanban.
 */
rotasMovimentacao.patch('/:id/mover', 
    autenticacaoRequerida(), 
    verificarPermissao('tarefas:mover'), 
    zValidator('json', MoverTarefaSchema), 
    async (c: Context) => {
    
    const { DB, softhub_kv } = c.env;
    const id = c.req.param('id');
    const { status: colunaDestino } = (c.req as any).valid('json');

    try {
        const usuario = c.get('usuario') as any;
        const tarefa = await DB.prepare('SELECT titulo, status, projeto_id FROM tarefas WHERE id = ?').bind(id).first() as any;

        if (!tarefa) return c.json({ erro: 'Tarefa não encontrada' }, 404);

        const podeVerTudo = await verificarPermissaoManual(c, 'projetos:visualizar');
        const acessoEquipe = podeVerTudo ? 'GESTAO' : await obterAcessoEquipeNoProjeto(DB, tarefa.projeto_id, usuario);
        if (acessoEquipe === 'LEITURA' || acessoEquipe === 'NENHUM') {
            return c.json({ erro: 'Permissão insuficiente neste projeto.' }, 403);
        }

        // Validação de quem pode mover (Responsáveis ou Líderes)
        const ehAdminOuLider = ['ADMIN', 'COORDENADOR', 'GESTOR', 'LIDER', 'SUBLIDER'].includes(usuario.role);
        let podeMover = ehAdminOuLider;
        if (!podeMover) {
            const resp = await DB.prepare('SELECT usuario_id FROM tarefas_responsaveis WHERE tarefa_id = ? AND usuario_id = ?').bind(id, usuario.id).first();
            if (resp) podeMover = true;
        }

        if (!podeMover) return c.json({ erro: 'Apenas responsáveis ou líderes podem mover tarefas.' }, 403);

        // 🛡️ NOVO: Trava de Checklist (Fluxo 31)
        // Bloqueia a conclusão (ou envio para revisão) se houver itens pendentes no checklist
        if (colunaDestino === 'concluida' || colunaDestino === 'em_revisao') {
            const pendentes = await DB.prepare('SELECT COUNT(*) as total FROM checklist_tarefa WHERE tarefa_id = ? AND concluido = 0').bind(id).first() as any;
            if (pendentes && pendentes.total > 0) {
                return c.json({ 
                    erro: 'Checklist Pendente', 
                    detalhe: `Existem ${pendentes.total} itens obrigatórios que ainda não foram marcados como concluídos nesta tarefa.` 
                }, 400);
            }
        }

        if (tarefa.status !== colunaDestino) {
            const agora = new Date().toISOString();
            const dataConclusao = colunaDestino === 'concluida' ? agora : null;
            
            await DB.prepare('UPDATE tarefas SET status = ?, data_conclusao = ?, atualizado_em = ? WHERE id = ?')
                .bind(colunaDestino, dataConclusao, agora, id).run();

            // Gravar histórico de alteração
            await DB.prepare('INSERT INTO tarefa_historico (id, tarefa_id, usuario_id, campo_alterado, valor_antigo, valor_novo) VALUES (?, ?, ?, ?, ?, ?)')
                .bind(crypto.randomUUID(), id, usuario.id, 'status', tarefa.status, colunaDestino).run();

            await registrarLog(DB, {
                usuarioId: usuario.id,
                acao: 'TAREFA_MOVIDA',
                modulo: 'kanban',
                descricao: `Tarefa "${tarefa.titulo}" movida para ${colunaDestino}`,
                ip: c.req.header('CF-Connecting-IP') ?? '',
                entidadeTipo: 'tarefas',
                entidadeId: id,
                dadosAnteriores: { status: tarefa.status },
                dadosNovos: { status: colunaDestino }
            });

            // Notificações de fluxo
            if (colunaDestino === 'em_revisao') {
                const { results: lideres } = await DB.prepare("SELECT id FROM usuarios WHERE role IN ('SUBLIDER', 'LIDER', 'GESTOR')").all();
                if (lideres.length) {
                    await criarNotificacoes(DB, {
                        usuariosIds: lideres.map((l: any) => l.id),
                        tipo: 'tarefa',
                        titulo: 'Revisão Necessária',
                        mensagem: `A tarefa "${tarefa.titulo}" aguarda revisão.`,
                        link: `/app/kanban?tarefa=${id}`,
                        entidadeId: id
                    }, softhub_kv);
                }
            }
        }

        return c.json({ sucesso: true });
    } catch (erro: any) {
        log('error', '[TAREFAS-MOV] Falha ao mover tarefa', { erro: erro.message, tarefaId: id });
        return c.json({ erro: 'Falha ao mover tarefa' }, 500);
    }
});

export default rotasMovimentacao;
