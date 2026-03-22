import { D1Database } from '@cloudflare/workers-types';

/**
 * Interface para registros de ponto no banco.
 */
export interface PontoRegistro {
    id: string;
    usuario_id: string;
    tipo: 'entrada' | 'saida';
    registrado_em: string;
    ip_origem: string;
}

/**
 * Busca os registros de hoje de um usuário.
 */
export async function buscarRegistrosHoje(db: D1Database, usuarioId: string) {
    return await db.prepare(`
        SELECT id, tipo, registrado_em, ip_origem 
        FROM ponto_registros 
        WHERE usuario_id = ? 
        AND DATE(registrado_em, '-3 hours') = DATE('now', '-3 hours') 
        ORDER BY registrado_em DESC
    `).bind(usuarioId).all();
}

/**
 * Busca o histórico recente de pontos de um usuário.
 */
export async function buscarHistoricoPonto(db: D1Database, usuarioId: string, limit: number = 50) {
    return await db.prepare(`
        SELECT id, tipo, registrado_em, ip_origem 
        FROM ponto_registros 
        WHERE usuario_id = ? 
        ORDER BY registrado_em DESC 
        LIMIT ?
    `).bind(usuarioId, limit).all();
}

/**
 * Busca o último registro de um usuário hoje para validação de sequência.
 */
export async function buscarUltimoRegistroHoje(db: D1Database, usuarioId: string) {
    return await db.prepare(`
        SELECT tipo, registrado_em 
        FROM ponto_registros 
        WHERE usuario_id = ? 
        AND DATE(registrado_em, '-3 hours') = DATE('now', '-3 hours') 
        ORDER BY registrado_em DESC LIMIT 1
    `).bind(usuarioId).first() as { tipo: 'entrada' | 'saida', registrado_em: string } | null;
}

/**
 * Insere um novo registro de ponto.
 */
export async function inserirPonto(db: D1Database, dados: Omit<PontoRegistro, 'registrado_em'>) {
    return await db.prepare(`
        INSERT INTO ponto_registros (id, usuario_id, tipo, ip_origem) 
        VALUES (?, ?, ?, ?)
    `).bind(dados.id, dados.usuario_id, dados.tipo, dados.ip_origem).run();
}

/**
 * Busca registros para exportação CSV.
 */
export async function buscarParaExportacao(db: D1Database, usuarioId?: string, mes?: string, ano?: string) {
    let sql = `
        SELECT u.nome, p.tipo, p.registrado_em, p.ip_origem 
        FROM ponto_registros p
        JOIN usuarios u ON p.usuario_id = u.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (usuarioId) {
        sql += " AND p.usuario_id = ?";
        params.push(usuarioId);
    }
    if (mes && ano) {
        sql += " AND strftime('%m', p.registrado_em) = ? AND strftime('%Y', p.registrado_em) = ?";
        params.push(mes.padStart(2, '0'));
        params.push(ano);
    }

    sql += " ORDER BY p.registrado_em ASC";

    return await db.prepare(sql).bind(...params).all();
}
