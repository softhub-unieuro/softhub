import { Hono, Context } from 'hono';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { registrarLog } from '../servicos/servico-logs';
import { log } from '../utilitarios/logger';
import { criarNotificacoes } from '../servicos/servico-notificacoes';

const rotasAlocacao = new Hono<{ Bindings: Env; Variables: { usuario: any } }>();

/**
 * Aloca um membro em uma equipe e grupo específicos.
 * Garante que o membro pertença a apenas UMA dupla equipe/grupo por vez.
 */
rotasAlocacao.patch('/membros/:id/alocar', autenticacaoRequerida(), verificarPermissao('equipes:editar_equipe'), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const usuarioLogado = c.get('usuario') as any;
    const membroId = c.req.param('id');

    let equipe_id: string | null, grupo_id: string | null;
    try {
        ({ equipe_id = null, grupo_id = null } = await c.req.json());
    } catch {
        return c.json({ erro: 'Corpo da requisição inválido.' }, 400);
    }

    try {
        let acao = 'MEMBRO_ALOCADO';
        let desc = '';

        if (equipe_id && grupo_id) {
            // 1. Remove vínculos anteriores (Garante unicidade conforme Regra 13)
            await DB.prepare('DELETE FROM usuarios_organizacao WHERE usuario_id = ?').bind(membroId).run();

            // 2. Insere novo vínculo
            await DB.prepare(`
                INSERT INTO usuarios_organizacao (id, usuario_id, equipe_id, grupo_id)
                VALUES (?, ?, ?, ?)
            `).bind(crypto.randomUUID(), membroId, equipe_id, grupo_id).run();

            const info = await DB.prepare('SELECT e.nome as e_nome, g.nome as g_nome FROM equipes e, grupos g WHERE e.id = ? AND g.id = ?')
                .bind(equipe_id, grupo_id).first() as any;
            
            desc = `Membro alocado → ${info?.e_nome ?? equipe_id} / ${info?.g_nome ?? grupo_id}`;

            await criarNotificacoes(DB, {
                usuarioId: membroId,
                tipo: 'sistema',
                titulo: 'Nova alocação',
                mensagem: `Você foi alocado à equipe ${info?.e_nome ?? 'da organização'} no grupo ${info?.g_nome ?? ''}.`,
                link: '/app/membros',
                entidadeId: equipe_id
            }, softhub_kv);

        } else if (equipe_id && !grupo_id) {
            // Remoção específica da equipe
            acao = 'MEMBRO_REMOVIDO_EQUIPE';
            await DB.prepare('DELETE FROM usuarios_organizacao WHERE usuario_id = ? AND equipe_id = ?')
                .bind(membroId, equipe_id)
                .run();
            
            desc = `Membro removido da equipe ${equipe_id}`;
        }

        // Buscar estado atual da alocação para o log
        const atual = await DB.prepare('SELECT (SELECT GROUP_CONCAT(equipe_id) FROM usuarios_organizacao WHERE usuario_id = u.id) as equipe_id, (SELECT GROUP_CONCAT(grupo_id) FROM usuarios_organizacao WHERE usuario_id = u.id) as grupo_id FROM usuarios u WHERE u.id = ?').bind(membroId).first() as any;

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao,
            modulo: 'equipes',
            descricao: desc || `Alteração organizacional para ${membroId}`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'usuarios',
            entidadeId: membroId,
            dadosAnteriores: { equipe_id: atual?.equipe_id, grupo_id: atual?.grupo_id },
            dadosNovos: { equipe_id, grupo_id },
        });

        return c.json({ sucesso: true });
    } catch (erro: any) {
        log('error', '[EQUIPES-ALOC] Falha ao alocar membro', { erro: erro.message, membroId });
        return c.json({ erro: 'Falha ao alocar membro.' }, 500);
    }
});

/**
 * Aloca múltiplos membros em lote (Otimizado via D1 Batch).
 */
rotasAlocacao.post('/membros/alocar-lote', autenticacaoRequerida(), verificarPermissao('equipes:editar_equipe'), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const usuarioLogado = c.get('usuario') as any;

    let equipe_id: string, grupo_id: string, membrosIds: string[];
    try {
        ({ equipe_id, grupo_id, membros: membrosIds } = await c.req.json());
    } catch {
        return c.json({ erro: 'Corpo da requisição inválido.' }, 400);
    }

    if (!equipe_id || !grupo_id || !membrosIds || !Array.isArray(membrosIds)) {
        return c.json({ erro: 'Dados inválidos. Necessário equipe_id, grupo_id e array de membros.' }, 400);
    }

    if (membrosIds.length === 0) return c.json({ sucesso: true, total: 0 });

    try {
        const statementsDeletar = membrosIds.map(membroId => 
            DB.prepare('DELETE FROM usuarios_organizacao WHERE usuario_id = ?').bind(membroId)
        );

        const statementsInserir = membrosIds.map(membroId => 
            DB.prepare(`
                INSERT INTO usuarios_organizacao (id, usuario_id, equipe_id, grupo_id)
                VALUES (?, ?, ?, ?)
            `).bind(crypto.randomUUID(), membroId, equipe_id, grupo_id)
        );

        await DB.batch([...statementsDeletar, ...statementsInserir]);

        const info = await DB.prepare('SELECT e.nome as e_nome, g.nome as g_nome FROM equipes e, grupos g WHERE e.id = ? AND g.id = ?')
            .bind(equipe_id, grupo_id).first() as any;

        for (const membroId of membrosIds) {
            c.executionCtx.waitUntil(
                criarNotificacoes(DB, {
                    usuarioId: membroId,
                    tipo: 'sistema',
                    titulo: 'Nova alocação',
                    mensagem: `Você foi alocado à equipe ${info?.e_nome ?? 'da organização'} no grupo ${info?.g_nome ?? ''}.`,
                    link: '/app/membros',
                    entidadeId: equipe_id
                }, softhub_kv)
            );
        }

        c.executionCtx.waitUntil(
            registrarLog(DB, {
                usuarioId: usuarioLogado.id,
                acao: 'MEMBROS_ALOCADOS_LOTE',
                modulo: 'equipes',
                descricao: `${membrosIds.length} membros alocados → ${info?.e_nome ?? equipe_id} / ${info?.g_nome ?? grupo_id}`,
                ip: c.req.header('CF-Connecting-IP') ?? '',
                entidadeTipo: 'equipes',
                entidadeId: equipe_id,
                dadosAnteriores: null,
                dadosNovos: { equipe_id, grupo_id, total_membros: membrosIds.length },
            })
        );

        return c.json({ sucesso: true, total: membrosIds.length });
    } catch (erro: any) {
        log('error', '[EQUIPES-ALOC] Falha ao alocar membros em lote', { erro: erro.message, total: membrosIds.length });
        return c.json({ erro: 'Falha ao alocar membros em lote.' }, 500);
    }
});

/**
 * Move um membro de um grupo para outro dentro da mesma (ou nova) equipe.
 */
rotasAlocacao.patch('/membros/:id/mover', autenticacaoRequerida(), verificarPermissao('equipes:editar_equipe'), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const usuarioLogado = c.get('usuario') as any;
    const membroId = c.req.param('id');

    let equipe_id: string, grupo_id: string, origem_grupo_id: string;
    try {
        ({ equipe_id, grupo_id, origem_grupo_id } = await c.req.json());
    } catch {
        return c.json({ erro: 'Corpo da requisição inválido.' }, 400);
    }

    if (!equipe_id || !grupo_id || !origem_grupo_id) {
        return c.json({ erro: 'IDs de equipe, grupo destino e grupo origem são obrigatórios.' }, 400);
    }

    try {
        // 1. Remove o vínculo antigo
        await DB.prepare('DELETE FROM usuarios_organizacao WHERE usuario_id = ? AND equipe_id = ? AND grupo_id = ?')
            .bind(membroId, equipe_id, origem_grupo_id)
            .run();

        // 2. Adiciona o novo vínculo
        await DB.prepare(`
            INSERT INTO usuarios_organizacao (id, usuario_id, equipe_id, grupo_id)
            VALUES (?, ?, ?, ?)
        `).bind(crypto.randomUUID(), membroId, equipe_id, grupo_id).run();

        // 3. Notifica o membro
        const info = await DB.prepare('SELECT nome FROM grupos WHERE id = ?').bind(grupo_id).first() as any;
        await criarNotificacoes(DB, {
            usuarioId: membroId,
            tipo: 'sistema',
            titulo: 'Mudança de grupo',
            mensagem: `Sua alocação foi alterada para o grupo ${info?.nome ?? 'selecionado'}.`,
            link: '/app/membros',
            entidadeId: grupo_id
        }, softhub_kv);

        // 4. Log para auditoria
        const atual = await DB.prepare('SELECT (SELECT GROUP_CONCAT(equipe_id) FROM usuarios_organizacao WHERE usuario_id = u.id) as equipe_id, (SELECT GROUP_CONCAT(grupo_id) FROM usuarios_organizacao WHERE usuario_id = u.id) as grupo_id FROM usuarios u WHERE u.id = ?').bind(membroId).first() as any;

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'MEMBRO_MOVIMENTADO',
            modulo: 'equipes',
            descricao: `Membro ${membroId} movido do grupo ${origem_grupo_id} para ${grupo_id}`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'usuarios',
            entidadeId: membroId,
            dadosAnteriores: { equipe_id: atual?.equipe_id, grupo_id: atual?.grupo_id },
            dadosNovos: { equipe_id, grupo_id, origem_grupo_id },
        });

        return c.json({ sucesso: true });
    } catch (erro: any) {
        log('error', '[EQUIPES-ALOC] Falha ao mover membro', { erro: erro.message, membroId });
        return c.json({ erro: 'Falha ao mover membro.' }, 500);
    }
});

export default rotasAlocacao;
