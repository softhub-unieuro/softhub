import type { D1Database } from "@cloudflare/workers-types";

/**
 * Interface para os itens do histórico unificado.
 */
export interface ItemHistorico {
    id: string;
    tarefa_id: string;
    usuario_id: string;
    usuario_nome: string;
    usuario_foto: string | null;
    campo_alterado: string;
    valor_antigo: string | null;
    valor_novo: string | null;
    alterado_em: string;
    descricao: string | null;
}

/**
 * Busca detalhes de uma tarefa (anteriormente inline na rota).
 */
export async function buscarTarefaPorId(db: D1Database, id: string) {
    return await db.prepare('SELECT status, titulo, equipe_id FROM tarefas WHERE id = ?').bind(id).first() as any;
}

/**
 * Busca o histórico unificado (Logs + Histórico Legado) com paginação (PERF-001).
 */
export async function buscarHistoricoTarefasPaginado(db: D1Database, tarefaId: string, limit: number, offset: number) {
    const query = `
        SELECT 
            l.id, l.entidade_id as tarefa_id, l.usuario_id, u.nome as usuario_nome, u.foto_perfil as usuario_foto,
            l.acao as campo_alterado, l.dados_anteriores as valor_antigo, l.dados_novos as valor_novo, 
            l.criado_em as alterado_em, l.descricao
        FROM logs l
        JOIN usuarios u ON l.usuario_id = u.id
        WHERE l.entidade_id = ? AND l.entidade_tipo = 'tarefas'
        
        UNION ALL
        
        SELECT 
            h.id, h.tarefa_id, h.usuario_id, u.nome as usuario_nome, u.foto_perfil as usuario_foto,
            h.campo_alterado, h.valor_antigo, h.valor_novo, h.alterado_em, NULL as descricao
        FROM tarefa_historico h
        JOIN usuarios u ON h.usuario_id = u.id
        WHERE h.tarefa_id = ?
        
        ORDER BY alterado_em DESC
        LIMIT ? OFFSET ?
    `;

    const { results } = await db.prepare(query).bind(tarefaId, tarefaId, limit, offset).all();
    return (results || []) as unknown as ItemHistorico[];
}

/**
 * Insere um novo comentário (SQL anteriormente inline).
 */
export async function inserirComentarioTarefa(db: D1Database, id: string, tarefaId: string, autorId: string, conteudo: string) {
    return await db.prepare('INSERT INTO comentarios_tarefa (id, tarefa_id, autor_id, conteudo) VALUES (?, ?, ?, ?)')
        .bind(id, tarefaId, autorId, conteudo).run();
}

/**
 * Busca todos os comentários de uma tarefa.
 */
export async function buscarComentariosTarefa(db: D1Database, tarefaId: string) {
    const query = `
        SELECT c.id, c.conteudo, c.criado_em, c.atualizado_em,
               u.id AS autor_id, u.nome AS autor_nome, u.foto_perfil AS autor_foto
        FROM comentarios_tarefa c
        JOIN usuarios u ON u.id = c.autor_id
        WHERE c.tarefa_id = ?
        ORDER BY c.criado_em ASC
    `;
    const { results } = await db.prepare(query).bind(tarefaId).all();
    return results || [];
}

/**
 * Busca itens do checklist de uma tarefa.
 */
export async function buscarChecklistTarefa(db: D1Database, tarefaId: string) {
    const { results } = await db.prepare('SELECT * FROM checklist_tarefa WHERE tarefa_id = ? ORDER BY ordem ASC, criado_em ASC').bind(tarefaId).all();
    return results || [];
}
