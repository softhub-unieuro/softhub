import { Context, Next } from 'hono';
import { log } from '../utilitarios/logger';

interface RateLimitOptions {
    windowMs: number;
    limit: number;
    keyPrefix?: string;
    identifier?: 'ip' | 'user';
}

/**
 * Middleware de Rate Limit baseado em Cloudflare KV.
 * Garante persistência entre diferentes instâncias (isolates) da Worker.
 */
export function kvRateLimit(options: RateLimitOptions) {
    return async (c: Context, next: Next) => {
        const { softhub_kv } = c.env as any;
        if (!softhub_kv) return await next(); // Fail open se KV não estiver disponível

        const ident = options.identifier === 'user' 
            ? (c.get('usuario')?.id || c.req.header('cf-connecting-ip') || 'anon')
            : (c.req.header('cf-connecting-ip') || 'unknown');

        const prefix = options.keyPrefix || c.req.path;
        const key = `rate:${prefix}:${ident}`;

        try {
            // Busca data da última janela
            const current = await softhub_kv.get(key, 'text');
            let hits = 0;
            let now = Date.now();

            if (current) {
                const data = JSON.parse(current);
                // Se ainda dentro da janela, incrementa
                if (now - data.start < options.windowMs) {
                    hits = data.hits + 1;
                    if (hits > options.limit) {
                        log('warn', '[RATE-LIMIT] Bloqueio', { key, hits, limit: options.limit });
                        return c.json({ 
                            erro: 'Muitas requisições.', 
                            detalhe: 'Limite de segurança excedido. Tente novamente em instantes.' 
                        }, 429);
                    }
                    // Atualiza hits mantendo o start original
                    await softhub_kv.put(key, JSON.stringify({ start: data.start, hits }), {
                        expirationTtl: Math.ceil(options.windowMs / 1000)
                    });
                } else {
                    // Limpa/Reseta janela
                    await softhub_kv.put(key, JSON.stringify({ start: now, hits: 1 }), {
                        expirationTtl: Math.ceil(options.windowMs / 1000)
                    });
                }
            } else {
                // Primeira requisição
                await softhub_kv.put(key, JSON.stringify({ start: now, hits: 1 }), {
                    expirationTtl: Math.ceil(options.windowMs / 1000)
                });
            }
        } catch (e: any) {
            log('error', '[RATE-LIMIT] Falha no KV', { erro: e.message });
            // Fail open em caso de erro técnico no KV para não travar o sistema
        }

        await next();
    };
}
