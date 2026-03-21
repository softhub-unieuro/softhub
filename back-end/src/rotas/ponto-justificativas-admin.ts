import { Hono, Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { registrarLog } from '../servicos/servico-logs';
import { criarNotificacoes } from '../servicos/servico-notificacoes';

const rotasPontoJustificativasAdmin = new Hono<{ Bindings: Env, Variables: { usuario: any } }>();

/**
 * Admin: Listagem geral de todas as justificativas.
 */
rotasPontoJustificativasAdmin.get('/admin/justificativas', autenticacaoRequerida(), verificarPermissao('ponto:aprovar_justificativa'), async (c: Context) => {
    const { DB } = c.env;
    const { results } = await DB.prepare(`
        SELECT j.*, u.nome as usuario_nome, u.email as usuario_email, u.foto_perfil as usuario_foto 
        FROM justificativas_ponto j
        JOIN usuarios u ON j.usuario_id = u.id
        ORDER BY j.status DESC, j.criado_em DESC
        LIMIT 100
    `).all();

    return c.json(results);
});

/**
 * Admin: Aprovação de justificativa.
 */
rotasPontoJustificativasAdmin.patch('/admin/justificativas/:id/aprovar', autenticacaoRequerida(), verificarPermissao('ponto:aprovar_justificativa'), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const justificativaId = c.req.param('id');
    const usuario = c.get('usuario') as any;

    try {
        const alvar = await DB.prepare(`SELECT * FROM justificativas_ponto WHERE id = ?`).bind(justificativaId).first() as any;
        if (!alvar) return c.json({ erro: 'Não encontrada.' }, 404);
        if (alvar.status !== 'pendente') return c.json({ erro: 'Já processada.' }, 400);

        await DB.prepare(`
            UPDATE justificativas_ponto 
            SET status = 'aprovada', avaliado_por = ?, avaliado_em = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') 
            WHERE id = ?
        `).bind(usuario.id, justificativaId).run();

        await criarNotificacoes(DB, {
            usuarioId: alvar.usuario_id,
            tipo: 'sistema',
            titulo: 'Justificativa Aprovada',
            mensagem: `Sua justificativa para ${alvar.data} foi aceita.`,
            link: '/app/ponto?aba=justificativas',
            entidadeId: justificativaId
        }, softhub_kv);

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'PONTO_JUSTIFICATIVA_APROVADA',
            modulo: 'ponto',
            descricao: `Justificativa aprovada para usuário ${alvar.usuario_id} referente ao dia ${alvar.data}`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'justificativas_ponto',
            entidadeId: justificativaId,
            dadosAnteriores: { status: alvar.status },
            dadosNovos: { status: 'aprovada' }
        });

        return c.json({ sucesso: true });
    } catch (e) {
        return c.json({ erro: 'Erro interno' }, 500);
    }
});

const RejeicaoSchema = z.object({ motivoRejeicao: z.string().min(3) });

/**
 * Admin: Rejeição de justificativa.
 */
rotasPontoJustificativasAdmin.patch('/admin/justificativas/:id/rejeitar', autenticacaoRequerida(), verificarPermissao('ponto:aprovar_justificativa'), zValidator('json', RejeicaoSchema), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const justificativaId = c.req.param('id');
    const { motivoRejeicao } = (c.req as any).valid('json');
    const usuario = c.get('usuario') as any;

    try {
        const alvar = await DB.prepare(`SELECT * FROM justificativas_ponto WHERE id = ?`).bind(justificativaId).first() as any;
        if (!alvar) return c.json({ erro: 'Não encontrada.' }, 404);
        if (alvar.status !== 'pendente') return c.json({ erro: 'Já processada.' }, 400);

        await DB.prepare(`
            UPDATE justificativas_ponto 
            SET status = 'rejeitada', motivo_rejeicao = ?, avaliado_por = ?, avaliado_em = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') 
            WHERE id = ?
        `).bind(motivoRejeicao, usuario.id, justificativaId).run();

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'PONTO_JUSTIFICATIVA_REJEITADA',
            modulo: 'ponto',
            descricao: `Justificativa rejeitada para usuário ${alvar.usuario_id}. Motivo: ${motivoRejeicao}`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'justificativas_ponto',
            entidadeId: justificativaId,
            dadosNovos: { motivoRejeicao }
        });

        await criarNotificacoes(DB, {
            usuarioId: alvar.usuario_id,
            tipo: 'sistema',
            titulo: 'Justificativa Rejeitada',
            mensagem: `Sua justificativa para ${alvar.data} foi rejeitada.`,
            link: '/app/ponto?aba=justificativas',
            entidadeId: justificativaId
        }, softhub_kv);

        return c.json({ sucesso: true });
    } catch (e) {
        return c.json({ erro: 'Erro interno' }, 500);
    }
});

export default rotasPontoJustificativasAdmin;
