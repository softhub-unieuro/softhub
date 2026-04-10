import { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { logger } from '../utilitarios/logger';

/**
 * Cria notificações para usuários no banco de dados e atualiza flags no KV.
 * As notificações são sempre geradas de forma assíncrona pelo backend.
 * 
 * @param db - Instância do banco de dados D1
 * @param params - Parâmetros para definir destinatários e conteúdo
 * @param kv - Namespace do KV para sinalização em tempo real (opcional)
 */
export interface ParamsNotificacao {
    usuarioId?: string;
    usuariosIds?: string[]; // Para múltiplos destinatários específicos
    equipeId?: string;
    grupoId?: string;
    todosDoProjetoId?: string;
    todosOsUsuarios?: boolean; // Para avisos globais
    titulo: string;
    mensagem: string;
    tipo: 'tarefa' | 'ponto' | 'aviso' | 'sistema';
    link?: string;
    entidadeId?: string;
}

export async function criarNotificacoes(db: D1Database, params: ParamsNotificacao, kv?: KVNamespace): Promise<void> {
    const idsParaNotificar = new Set<string>();

    if (params.usuarioId) {
        idsParaNotificar.add(params.usuarioId);
    }

    if (params.usuariosIds && Array.from(params.usuariosIds).length > 0) {
        params.usuariosIds.forEach(id => idsParaNotificar.add(id));
    }

    if (params.todosOsUsuarios) {
        const { results } = await db.prepare('SELECT id FROM usuarios').all<{ id: string }>();
        results?.forEach(u => idsParaNotificar.add(u.id));
    }

    if (params.todosDoProjetoId) {
        const { results } = await db.prepare(`
            SELECT DISTINCT uo.usuario_id 
            FROM projetos_equipes pe
            JOIN usuarios_organizacao uo ON uo.equipe_id = pe.equipe_id
            WHERE pe.projeto_id = ?
        `).bind(params.todosDoProjetoId).all<{ usuario_id: string }>();
        results?.forEach(u => idsParaNotificar.add(u.usuario_id));
    }

    // Processa batches de inserção
    if (idsParaNotificar.size > 0) {
        const statements = Array.from(idsParaNotificar).map(id =>
            db.prepare(`
                INSERT INTO notificacoes (id, usuario_id, tipo, titulo, mensagem, link_acao, entidade_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
                crypto.randomUUID(), 
                id, 
                params.tipo, 
                params.titulo, 
                params.mensagem, 
                params.link || null,
                params.entidadeId || null
            )
        );

        // D1 executa mutations em batch para evitar limitação de requisições separadas
        if (statements.length > 0) {
            await db.batch(statements);
            
            // 🚀 Atualiza flag no KV para cada usuário notificado
            if (kv) {
                try {
                    for (const id of idsParaNotificar) {
                        await kv.put(`tem_notificacao:${id}`, 'true', { expirationTtl: 86400 }); // Expira em 24h
                    }
                } catch (e: unknown) {
                    logger.error('[KV ERROR] Falha ao atualizar flags de notificação', { erro: e instanceof Error ? e.message : String(e) });
                }
            }
        }
    }
}

/**
 * Remove todas as notificações vinculadas a uma entidade específica.
 * Útil para quando um aviso ou tarefa é excluído.
 * 
 * @param db - Instância do banco de dados D1
 * @param entidadeId - UUID da entidade (tarefa, aviso, etc)
 */
export async function removerNotificacoesPorEntidade(db: D1Database, entidadeId: string): Promise<void> {
    if (!entidadeId) return;
    await db.prepare('DELETE FROM notificacoes WHERE entidade_id = ?').bind(entidadeId).run();
}

