import { D1Database } from '@cloudflare/workers-types';
import { log } from '../utilitarios/logger';

/**
 * Interface para os dados de log de auditoria.
 * Segue a Regra 11 e o Workflow 7 do projeto.
 */
export interface LogAuditoria {
    usuarioId?: string;
    acao: string;
    modulo: string;
    descricao: string;
    ip?: string;
    entidadeTipo?: string;
    entidadeId?: string;
    dadosAnteriores?: any;
    dadosNovos?: any;
}

/**
 * Registra uma ação de negócio na tabela de logs para auditoria.
 * Esta função é resiliente: falhas no log não interrompem a requisição principal.
 */
export async function registrarLog(db: D1Database, dados: LogAuditoria) {
    const timestamp = new Date().toISOString();

    // Log no console para depuração em tempo real (wrangler tail)
    log('info', `[AUDITORIA] ${dados.modulo.toUpperCase()} | ${dados.acao}`, { descricao: dados.descricao });

    try {
        await db.prepare(`
            INSERT INTO logs (
                id, usuario_id,
                acao, modulo, descricao, ip, entidade_tipo, entidade_id,
                dados_anteriores, dados_novos, criado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            dados.usuarioId || null,
            dados.acao,
            dados.modulo,
            dados.descricao,
            dados.ip || null,
            dados.entidadeTipo || null,
            dados.entidadeId || null,
            dados.dadosAnteriores ? JSON.stringify(dados.dadosAnteriores) : null,
            dados.dadosNovos ? JSON.stringify(dados.dadosNovos) : null,
            timestamp
        ).run();
    } catch (erro: any) {
        // Falha no log nunca deve travar o sistema (Regra de Resiliência)
        log('error', '[FALHA CRÍTICA AUDITORIA] Erro ao gravar no D1', { erro: erro.message });
    }
}
