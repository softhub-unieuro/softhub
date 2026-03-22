/**
 * Logger Estruturado (DX-001).
 * Padroniza a saída de logs para melhor observabilidade no Cloudflare Tail.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
    level: LogLevel;
    message: string;
    context?: Record<string, any>;
    timestamp: string;
}

export function log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
        level,
        message,
        context: context || {},
        timestamp: new Date().toISOString()
    };

    // No Cloudflare Workers, console.log(JSON) é a melhor forma de ter logs estruturados
    console.log(JSON.stringify(entry));
}

export const logger = {
    info: (msg: string, ctx?: Record<string, any>) => log('info', msg, ctx),
    warn: (msg: string, ctx?: Record<string, any>) => log('warn', msg, ctx),
    error: (msg: string, ctx?: Record<string, any>) => log('error', msg, ctx),
    debug: (msg: string, ctx?: Record<string, any>) => log('debug', msg, ctx)
};
