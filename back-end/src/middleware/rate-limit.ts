import { Context, Next } from 'hono';
import { log } from '../utilitarios/logger';
import { Env } from '../index';

interface RateLimitOptions {
    windowMs: number;
    limit: number;
    keyPrefix?: string;
    identifier?: 'ip' | 'user';
}

/**
 * Middleware de Rate Limit baseado em Cloudflare D1 (Quota Optimized).
 * Garante persistência entre diferentes instâncias (isolates) da Worker.
 */
export function kvRateLimit(options: RateLimitOptions) {
    return async (c: Context<{ Bindings: Env, Variables: { usuario: any } }>, next: Next) => {
        const { DB } = c.env;
        if (!DB) return await next(); // Fail open

        const ident = options.identifier === 'user' 
            ? (c.get('usuario')?.id || c.req.header('cf-connecting-ip') || 'anon')
            : (c.req.header('cf-connecting-ip') || 'unknown');

        const prefix = options.keyPrefix || c.req.path;
        const key = `rate:${prefix}:${ident}`;
        const now = Date.now();

        try {
            const current = await DB.prepare('SELECT hits, janela_inicio FROM rate_limits WHERE chave = ?')
                .bind(key)
                .first<any>();

            if (current) {
                if (now - current.janela_inicio < options.windowMs) {
                    const hits = current.hits + 1;
                    if (hits > options.limit) {
                        log('warn', '[RATE-LIMIT] Bloqueio', { key, hits, limit: options.limit });
                        return c.json({ 
                            erro: 'Muitas requisições.', 
                            detalhe: 'Limite de segurança excedido. Tente novamente em instantes.' 
                        }, 429);
                    }
                    await DB.prepare('UPDATE rate_limits SET hits = ? WHERE chave = ?')
                        .bind(hits, key)
                        .run();
                } else {
                    await DB.prepare('UPDATE rate_limits SET hits = 1, janela_inicio = ?, expira_em = ? WHERE chave = ?')
                        .bind(now, now + options.windowMs, key)
                        .run();
                }
            } else {
                await DB.prepare('INSERT INTO rate_limits (chave, hits, janela_inicio, expira_em) VALUES (?, 1, ?, ?)')
                    .bind(key, now, now + options.windowMs)
                    .run();
            }
        } catch (e: any) {
            log('error', '[RATE-LIMIT] Falha no D1', { erro: e.message });
        }

        await next();
    };
}

