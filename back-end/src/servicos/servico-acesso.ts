/**
 * Verifica o Nível de Acesso da Equipe do Usuário no Projeto.
 * Regra: Admin tem GESTAO total. Outros dependem do vínculo da equipe no projeto.
 * Se o projeto for público e não houver vínculo, o acesso é LEITURA.
 */
export async function obterAcessoEquipeNoProjeto(DB: any, projetoId: string, usuario: any): Promise<'GESTAO' | 'EDICAO' | 'LEITURA' | 'NENHUM'> {
    if (usuario.role === 'ADMIN') return 'GESTAO';
    
    // Removido o generic <{ publico: number }> para evitar erro de 'Untyped function call' já que DB é 'any'
    const p = await DB.prepare('SELECT publico FROM projetos WHERE id = ?').bind(projetoId).first() as { publico: number } | null;
    if (!p) return 'NENHUM';

    const { results } = await DB.prepare(`
        SELECT pe.acesso 
        FROM projetos_equipes pe
        JOIN usuarios_organizacao uo ON uo.equipe_id = pe.equipe_id
        WHERE pe.projeto_id = ? AND uo.usuario_id = ?
    `).bind(projetoId, usuario.id).all();

    if (!results || results.length === 0) {
        return p.publico === 1 ? 'LEITURA' : 'NENHUM';
    }

    const acessos = results.map((r: any) => r.acesso);
    if (acessos.includes('GESTAO')) return 'GESTAO';
    if (acessos.includes('EDICAO')) return 'EDICAO';
    if (acessos.includes('LEITURA')) return 'LEITURA';
    
    return 'NENHUM';
}

/**
 * Invalida a sessão em cache de um usuário no KV.
 * Útil para aplicar alterações de role ou permissão instantaneamente.
 */
export async function invalidarSessaoCache(kv: any, usuarioId: string): Promise<void> {
    if (kv) {
        try {
            await kv.delete(`sessao:${usuarioId}`);
        } catch (e: any) {
            // Falha silenciosa no cache
        }
    }
}

/**
 * Implementa uma trava (lock) de concorrência usando KV.
 * Evita que dois usuários editem a mesma entidade (ex: tarefa) ao mesmo tempo.
 * @param kv KVNamespace.
 * @param entidadeTipo Ex: 'tarefa'.
 * @param entidadeId ID do recurso sendo editado.
 * @param usuarioId ID do usuário que detém o lock.
 * @param ttl Segundos que o lock dura (padrão 5 minutos).
 */
export async function prenderTrava(kv: any, entidadeTipo: string, entidadeId: string, usuarioId: string, ttl: number = 300): Promise<boolean> {
    if (!kv) return true;
    const chave = `trava:${entidadeTipo}:${entidadeId}`;
    const atual = await kv.get(chave);

    // Se já houver trava e não for do próprio usuário, bloqueia
    if (atual && atual !== usuarioId) {
        return false;
    }

    // Cria ou renova a trava (Graceful failure: se KV falhar, permite a edicao)
    try {
        await kv.put(chave, usuarioId, { expirationTtl: ttl });
    } catch (e: any) {
        return true; 
    }
    return true;
}

/**
 * Libera a trava de concorrência manualmente.
 */
export async function soltarTrava(kv: any, entidadeTipo: string, entidadeId: string, usuarioId: string): Promise<void> {
    if (!kv) return;
    const chave = `trava:${entidadeTipo}:${entidadeId}`;
    const atual = await kv.get(chave);
    if (atual === usuarioId) {
        try {
            await kv.delete(chave);
        } catch (e: any) {
            // Falha silenciosa
        }
    }
}
