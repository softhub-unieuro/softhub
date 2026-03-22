import { D1Database } from '@cloudflare/workers-types';
import { logger } from '../src/utilitarios/logger';

/**
 * Script de limpeza de logs antigos (DX-002).
 * Remove registros da tabela 'logs_sistema' com mais de 90 dias.
 */
export async function limparLogsAntigos(db: D1Database): Promise<void> {
    const DIAS_RETENCAO = 90;
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - DIAS_RETENCAO);
    const dataStr = dataLimite.toISOString();

    try {
        const result = await db.prepare(
            "DELETE FROM logs WHERE criado_em < ?"
        ).bind(dataStr).run();

        logger.info(`[LIMPEZA] Faxina de logs concluída.`, { 
            removidos: result.meta.changes, 
            antesDe: dataStr 
        });
    } catch (e: any) {
        logger.error('[LIMPEZA] Erro ao limpar logs antigos', { erro: e.message });
    }
}

// Handler para o Cron Trigger (Cloudflare Workers)
export default {
    async scheduled(event: any, env: any, ctx: any) {
        ctx.waitUntil(limparLogsAntigos(env.DB));
    },
};
