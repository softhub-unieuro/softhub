import { criarNotificacoes } from './servico-notificacoes';

/**
 * Serviço de Automação de Ponto Eletrônico.
 * Executado via Cron Triggers (Scheduled Events).
 */
export async function processarFechamentoAutomatico(DB: any, KV: any) {
    console.log('[AUTO-PONTO] Iniciando varredura de fechamento automático...');

    try {
        // 1. Identificar todos os usuários que bateram ENTRADA mas não SAÍDA hoje
        const queryPendentes = `
            SELECT DISTINCT p1.usuario_id, u.nome
            FROM ponto_registros p1
            JOIN usuarios u ON u.id = p1.usuario_id
            WHERE p1.tipo = 'entrada'
            AND DATE(p1.registrado_em, '-3 hours') = DATE('now', '-3 hours')
            AND NOT EXISTS (
                SELECT 1 FROM ponto_registros p2
                WHERE p2.usuario_id = p1.usuario_id
                AND p2.tipo = 'saida'
                AND DATE(p2.registrado_em, '-3 hours') = DATE(p1.registrado_em, '-3 hours')
                AND p2.registrado_em > p1.registrado_em
            )
        `;

        const { results: pendentes } = await DB.prepare(queryPendentes).all();

        if (!pendentes || pendentes.length === 0) return;

        const agora = new Date().toISOString();
        
        for (const p of pendentes as any) {
            const idSaida = crypto.randomUUID();
            
            // 1. Inserir batida de saída automática
            await DB.prepare(`
                INSERT INTO ponto_registros (id, usuario_id, tipo, registrado_em, ip_origem)
                VALUES (?, ?, 'saida', ?, 'SISTEMA-AUTOMATICO')
            `).bind(idSaida, p.usuario_id, agora).run();

            // 2. Notificar o usuário
            await criarNotificacoes(DB, {
                usuarioId: p.usuario_id,
                titulo: 'Checkout Automático',
                mensagem: 'Seu ponto foi fechado automaticamente pelo sistema ao final do dia. Se houve erro, procure seu líder.',
                tipo: 'ponto'
            }, KV);

            // 3. Registrar Log
            await DB.prepare(`
                INSERT INTO logs (id, usuario_id, acao, modulo, descricao, ip, entidade_tipo)
                VALUES (?, ?, 'PONTO_SAIDA_AUTO', 'ponto', ?, '127.0.0.1', 'ponto_registros')
            `).bind(crypto.randomUUID(), p.usuario_id, `Fechamento automático (esquecimento detectado).`).run();

            // 4. Limpar presença no KV se existir
            if (KV) await KV.delete(`presenca:${p.usuario_id}`);
        }

    } catch (error) {
        console.error('[AUTO-PONTO] Erro crítico no processamento:', error);
    }
}

/**
 * Envia lembrete de checkout para quem ainda está "online" no final do expediente.
 * Chamado 15 minutos antes do fim planejado da jornada.
 */
export async function enviarLembreteSaida(DB: any, KV: any) {
    try {
        const queryOnlineComPontoAberto = `
            SELECT DISTINCT p.usuario_id
            FROM ponto_registros p
            WHERE p.tipo = 'entrada'
            AND DATE(p.registrado_em, '-3 hours') = DATE('now', '-3 hours')
            AND NOT EXISTS (
                SELECT 1 FROM ponto_registros p2
                WHERE p2.usuario_id = p.usuario_id 
                AND p2.tipo = 'saida' 
                AND DATE(p2.registrado_em, '-3 hours') = DATE('now', '-3 hours')
            )
        `;
        const { results } = await DB.prepare(queryOnlineComPontoAberto).all();

        if (!results || results.length === 0) return;

        for (const r of results as any) {
            // Verifica se está online (heartbeat)
            const online = await KV?.get(`online:${r.usuario_id}`);
            if (online) {
                await criarNotificacoes(DB, {
                    usuarioId: r.usuario_id,
                    titulo: 'Expediente Quase Fim',
                    mensagem: 'O horário regular encerra em 15 minutos. Não esqueça de registrar seu checkout!',
                    tipo: 'ponto'
                }, KV);
            }
        }
    } catch (e) {
        console.error('[AUTO-PONTO] Erro ao enviar lembretes:', e);
    }
}
