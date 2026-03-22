import { Hono, Context } from 'hono';
import { Env } from '../index';
import { autenticacaoRequerida } from '../middleware/auth';
import { log } from '../utilitarios/logger';

const rotasNotificacoes = new Hono<{ Bindings: Env, Variables: { usuario: any } }>();

/**
 * 🔔 LISTAR NOTIFICAÇÕES NÃO LIDAS
 */
rotasNotificacoes.get('/', autenticacaoRequerida(), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const usuarioLogado = c.get('usuario') as any;

    try {
        // 🚀 1. Checa flag no KV primeiro
        const cacheKey = `tem_notificacao:${usuarioLogado.id}`;
        const temCache = await softhub_kv?.get(cacheKey);

        if (temCache === 'false') {
            return c.json({ notificacoes: [] });
        }

        // 2. Busca no D1
        const { results } = await DB.prepare(`
            SELECT * FROM notificacoes 
            WHERE usuario_id = ? AND lida = 0 
            ORDER BY criado_em DESC
        `).bind(usuarioLogado.id).all();

        // 3. Atualiza KV com base no resultado real
        // 3. Atualiza cache com tratativa de quota (Graceful failure)
        try {
            if (results.length === 0) { // If no notifications
                await softhub_kv?.put(cacheKey, 'false', { expirationTtl: 86400 });
            } else { // If there are notifications
                await softhub_kv?.put(cacheKey, 'true', { expirationTtl: 86400 });
            }
        } catch (kvError: any) {
            log('warn', '[NOTIF-KV] Falha ao atualizar flag de cache', { erro: kvError.message });
        }

        return c.json({ notificacoes: results });
    } catch (erro: any) {
        log('error', '[NOTIFICACOES] Falha ao buscar notificações', { erro: erro.message, usuarioId: usuarioLogado.id });
        return c.json({ erro: 'Falha ao buscar notificações' }, 500);
    }
});

/**
 * ✅ MARCAR COMO LIDA
 */
rotasNotificacoes.patch('/:id/lida', autenticacaoRequerida(), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const usuarioLogado = c.get('usuario') as any;
    const id = c.req.param('id');

    try {
        await DB.prepare('UPDATE notificacoes SET lida = 1 WHERE id = ? AND usuario_id = ?')
            .bind(id, usuarioLogado.id)
            .run();

        // 🚀 Atualiza flag no KV (verifica se ainda resta alguma)
        const restantes = await DB.prepare('SELECT id FROM notificacoes WHERE usuario_id = ? AND lida = 0 LIMIT 1')
            .bind(usuarioLogado.id)
            .first();
        
        try {
            await softhub_kv?.put(`tem_notificacao:${usuarioLogado.id}`, restantes ? 'true' : 'false', { expirationTtl: 86400 });
        } catch (kvError: any) {
            log('warn', '[NOTIF-KV] Falha ao atualizar flag pos-leitura', { erro: kvError.message });
        }

        return c.json({ sucesso: true });
    } catch (erro: any) {
        log('error', '[NOTIFICACOES] Falha ao atualizar notificação', { erro: erro.message, notificacaoId: id });
        return c.json({ erro: 'Falha ao atualizar notificação' }, 500);
    }
});

/**
 * 🧹 LIMPAR TODAS (MARCAR TODAS COMO LIDAS)
 */
rotasNotificacoes.delete('/limpar-todas', autenticacaoRequerida(), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const usuarioLogado = c.get('usuario') as any;

    try {
        await DB.prepare('UPDATE notificacoes SET lida = 1 WHERE usuario_id = ?')
            .bind(usuarioLogado.id)
            .run();

        // 🚀 Zera flag no KV
        try {
            await softhub_kv?.put(`tem_notificacao:${usuarioLogado.id}`, 'false', { expirationTtl: 86400 });
        } catch (kvError: any) {
            log('warn', '[NOTIF-KV] Falha ao resetar flags de notificacao', { erro: kvError.message });
        }

        return c.json({ sucesso: true });
    } catch (erro: any) {
        log('error', '[NOTIFICACOES] Falha ao limpar notificações', { erro: erro.message, usuarioId: usuarioLogado.id });
        return c.json({ erro: 'Falha ao limpar notificações' }, 500);
    }
});

export default rotasNotificacoes;
