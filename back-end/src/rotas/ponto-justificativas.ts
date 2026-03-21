import { Hono, Context } from 'hono';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { registrarLog } from '../servicos/servico-logs';
import { criarNotificacoes, removerNotificacoesPorEntidade } from '../servicos/servico-notificacoes';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const rotasPontoJustificativas = new Hono<{ Bindings: Env, Variables: { usuario: any } }>();

const JustificativaSchema = z.object({
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    tipo: z.enum(['esquecimento', 'falta', 'atestado', 'outro']),
    motivo: z.string().min(5)
});

/**
 * Membro: Envia uma nova justificativa de ponto.
 */
rotasPontoJustificativas.post('/justificativas', autenticacaoRequerida(), verificarPermissao('ponto:justificar'), zValidator('json', JustificativaSchema), async (c: Context) => {
    const { DB } = c.env;
    const { data, tipo, motivo } = (c.req as any).valid('json');
    const usuario = c.get('usuario') as any;

    try {
        const ext = await DB.prepare(`SELECT id FROM justificativas_ponto WHERE usuario_id = ? AND data = ?`).bind(usuario.id, data).first();
        if (ext) return c.json({ erro: 'Já existe uma justificativa para esta data.' }, 400);

        const justId = crypto.randomUUID();
        await DB.prepare(`
            INSERT INTO justificativas_ponto (id, usuario_id, data, tipo, motivo)
            VALUES (?, ?, ?, ?, ?)
        `).bind(justId, usuario.id, data, tipo, motivo).run();

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'PONTO_JUSTIFICATIVA_ENVIADA',
            modulo: 'ponto',
            descricao: `Justificativa enviada para ${data}`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'justificativas_ponto',
            entidadeId: justId,
            dadosNovos: { data, tipo, motivo }
        });

        return c.json({ id: justId }, 201);
    } catch (e) {
        return c.json({ erro: 'Falha ao enviar.' }, 500);
    }
});

/**
 * Membro: Busca suas próprias justificativas.
 */
rotasPontoJustificativas.get('/justificativas', autenticacaoRequerida(), verificarPermissao('ponto:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    const usuario = c.get('usuario') as any;
    const pagina = Number(c.req.query('pagina') ?? 1);
    const limite = 20;

    try {
        const resContagem = await DB.prepare(`SELECT COUNT(*) as total FROM justificativas_ponto WHERE usuario_id = ?`).bind(usuario.id).first();
        const { results } = await DB.prepare(`
            SELECT * FROM justificativas_ponto 
            WHERE usuario_id = ?
            ORDER BY criado_em DESC LIMIT ? OFFSET ?
        `).bind(usuario.id, limite, (pagina - 1) * limite).all();

        return c.json({
            dados: results,
            paginacao: { total: (resContagem as any).total, pagina }
        });
    } catch (e) {
        return c.json({ erro: 'Falha ao buscar.' }, 500);
    }
});

/**
 * Membro: Exclui justificativa pendente.
 */
rotasPontoJustificativas.delete('/justificativas/:id', autenticacaoRequerida(), verificarPermissao('ponto:justificar'), async (c: Context) => {
    const { DB } = c.env;
    const usuario = c.get('usuario') as any;
    const id = c.req.param('id');

    try {
        const atual = await DB.prepare(`SELECT * FROM justificativas_ponto WHERE id = ? AND usuario_id = ?`).bind(id, usuario.id).first() as any;
        if (!atual || atual.status !== 'pendente') return c.json({ erro: 'Operação não permitida.' }, 400);

        await DB.prepare(`DELETE FROM justificativas_ponto WHERE id = ?`).bind(id).run();
        if (id) await removerNotificacoesPorEntidade(DB, id);

        return c.json({ sucesso: true });
    } catch (e) {
        return c.json({ erro: 'Falha ao excluir.' }, 500);
    }
});

export default rotasPontoJustificativas;
