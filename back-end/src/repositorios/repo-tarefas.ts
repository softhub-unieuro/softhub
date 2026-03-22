import { D1Database } from '@cloudflare/workers-types';

export interface FiltrosTarefas {
    busca?: string;
    prioridade?: string;
    responsavelId?: string;
    modulo?: string;
    projetoId: string;
}

/**
 * Lista tarefas com filtros aplicados.
 */
export async function buscarTarefas(DB: D1Database, filtros: FiltrosTarefas) {
    let query = `
        SELECT 
            t.id, t.titulo, t.descricao, t.status, t.prioridade, t.pontos, t.modulo, 
            t.equipe_id, e.nome as equipe_nome
        FROM tarefas t
        LEFT JOIN equipes e ON e.id = t.equipe_id
        WHERE t.projeto_id = ? AND t.arquivado = 0
    `;
    const params: any[] = [filtros.projetoId];

    if (filtros.busca) {
        query += ` AND (t.titulo LIKE ? OR t.descricao LIKE ?)`;
        params.push(`%${filtros.busca}%`, `%${filtros.busca}%`);
    }

    if (filtros.modulo) {
        query += ` AND t.modulo = ?`;
        params.push(filtros.modulo);
    }

    if (filtros.prioridade) {
        const prioridades = filtros.prioridade.split(',').filter(p => !!p);
        if (prioridades.length > 0) {
            const placeholders = prioridades.map(() => '?').join(',');
            query += ` AND t.prioridade IN (${placeholders})`;
            params.push(...prioridades);
        }
    }

    if (filtros.responsavelId) {
        query += ` AND EXISTS (SELECT 1 FROM tarefas_responsaveis tr WHERE tr.tarefa_id = t.id AND tr.usuario_id = ?)`;
        params.push(filtros.responsavelId);
    }

    query += ` ORDER BY t.criado_em DESC`;

    const { results } = await DB.prepare(query).bind(...params).all();
    return results || [];
}

/**
 * Busca responsáveis para uma lista de tarefas (evita N+1).
 */
export async function buscarResponsaveisPorTarefas(DB: D1Database, idsTarefas: string[]) {
    if (idsTarefas.length === 0) return [];

    const placeholders = idsTarefas.map(() => '?').join(',');
    
    const { results } = await DB.prepare(`
        SELECT tr.tarefa_id, u.id, u.nome, u.foto_perfil as foto
        FROM usuarios u
        JOIN tarefas_responsaveis tr ON tr.usuario_id = u.id
        WHERE tr.tarefa_id IN (${placeholders})
    `).bind(...idsTarefas).all();

    return results || [];
}
