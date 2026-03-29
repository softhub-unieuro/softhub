import { D1Database } from '@cloudflare/workers-types';
import { ProjetoDB, UsuarioDB } from '../modelos/tipagem-banco';

/**
 * Busca projetos visíveis para um usuário.
 */
export async function buscarProjetosVisiveis(DB: D1Database, usuarioId: string, podeVerTudo: boolean) {
    const query = `
        SELECT p.*, 
               (SELECT COUNT(*) FROM tarefas WHERE projeto_id = p.id) as total_tarefas,
               (
                   SELECT JSON_GROUP_ARRAY(JSON_OBJECT('equipe_id', pe.equipe_id, 'acesso', pe.acesso))
                   FROM projetos_equipes pe
                   WHERE pe.projeto_id = p.id
               ) as equipes_json
        FROM projetos p 
        WHERE p.arquivado = 0 AND (? = 1 OR p.publico = 1 OR NOT EXISTS (SELECT 1 FROM projetos_equipes WHERE projeto_id = p.id) OR EXISTS (
            SELECT 1 FROM projetos_equipes pe
            JOIN usuarios_organizacao uo ON uo.equipe_id = pe.equipe_id
            WHERE pe.projeto_id = p.id AND uo.usuario_id = ?
        ))
        ORDER BY p.criado_em DESC
    `;
    const { results } = await DB.prepare(query).bind(podeVerTudo ? 1 : 0, usuarioId).all();
    return (results || []) as unknown as (ProjetoDB & { equipes_json?: string })[];
}

/**
 * Busca equipes vinculadas a um projeto.
 */
export async function buscarEquipesDoProjeto(DB: D1Database, projetoId: string) {
    const { results } = await DB.prepare(`
        SELECT equipe_id, acesso FROM projetos_equipes WHERE projeto_id = ?
    `).bind(projetoId).all();
    return results || [];
}

/**
 * Busca detalhes de um projeto para o portfólio público.
 */
export async function buscarDetalhesPublicos(DB: D1Database, id: string) {
    const projeto = await DB.prepare(`
        SELECT id, nome, descricao, github_repo, figma_url, documentacao_url, criado_em 
        FROM projetos 
        WHERE id = ? AND publico = 1 AND arquivado = 0
    `).bind(id).first();
    
    if (!projeto) return null;

    const { results: membros } = await DB.prepare(`
        SELECT DISTINCT u.id, u.nome, u.email, u.foto_perfil, u.role
        FROM usuarios u
        JOIN usuarios_organizacao uo ON u.id = uo.usuario_id
        JOIN projetos_equipes pe ON uo.equipe_id = pe.equipe_id
        WHERE pe.projeto_id = ?
        ORDER BY u.nome ASC
    `).bind(id).all();

    return { ...projeto, membros: membros || [] };
}

/**
 * Busca um projeto pelo ID.
 */
export async function buscarPorId(DB: D1Database, id: string) {
    return await DB.prepare('SELECT id, nome, descricao, publico, github_repo, documentacao_url, figma_url, setup_url, arquivado, criado_em FROM projetos WHERE id = ?').bind(id).first() as ProjetoDB | null;
}

/**
 * Inserção de novo projeto.
 */
export async function inserirProjeto(DB: D1Database, id: string, dados: any) {
    await DB.prepare(`
        INSERT INTO projetos (id, nome, descricao, publico, github_repo, documentacao_url, figma_url, setup_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        id, 
        dados.nome, 
        dados.descricao || null, 
        dados.publico ? 1 : 0, 
        dados.github_repo || null,
        dados.documentacao_url || null,
        dados.figma_url || null,
        dados.setup_url || null
    ).run();
}

/**
 * Atualiza campos de um projeto.
 */
export async function atualizarProjeto(DB: D1Database, id: string, campos: string[], valores: any[]) {
    await DB.prepare(`UPDATE projetos SET ${campos.join(', ')} WHERE id = ?`).bind(...valores, id).run();
}

/**
 * Atualiza vínculos de equipes.
 */
export async function atualizarEquipesProjeto(DB: D1Database, projetoId: string, equipes: { equipe_id: string, acesso: string }[]) {
    await DB.prepare('DELETE FROM projetos_equipes WHERE projeto_id = ?').bind(projetoId).run();
    for (const item of equipes) {
        await DB.prepare(`
            INSERT INTO projetos_equipes (projeto_id, equipe_id, acesso) VALUES (?, ?, ?)
        `).bind(projetoId, item.equipe_id, item.acesso).run();
    }
}

/**
 * Arquiva um projeto (Soft Delete).
 */
export async function arquivarProjeto(DB: D1Database, id: string) {
    await DB.prepare('UPDATE projetos SET arquivado = 1 WHERE id = ?').bind(id).run();
}
