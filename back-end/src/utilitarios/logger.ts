/**
 * Logger Estruturado.
 * Padroniza a saída de logs para melhor observabilidade no Cloudflare Tail.
 * 
 * ATENÇÃO (LGPD): Nunca registre dados pessoais (email, CPF, senhas, tokens) 
 * no campo de contexto. Use IDs (UUID) para rastreamento.
 */

type NivelLog = 'info' | 'warn' | 'error' | 'debug';

interface EntradaLog {
    nivel: NivelLog;
    mensagem: string;
    contexto?: Record<string, unknown>;
    timestamp: string;
}

/**
 * Emite um log estruturado em formato JSON.
 * @param nivel - Severidade do log
 * @param mensagem - Descrição do evento
 * @param contexto - Dados adicionais (não colocar PII aqui)
 */
export function log(nivel: NivelLog, mensagem: string, contexto?: Record<string, unknown>) {
    const entrada: EntradaLog = {
        nivel,
        mensagem,
        contexto: contexto || {},
        timestamp: new Date().toISOString()
    };

    // Cloudflare Workers capturam console.log automaticamente
    console.log(JSON.stringify(entrada));
}

/**
 * Objeto utilitário para facilitar chamadas de log por nível.
 */
export const logger = {
    info: (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
    warn: (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
    error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
    debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx)
};

