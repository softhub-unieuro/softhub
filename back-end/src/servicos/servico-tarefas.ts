import { Env } from '../index';
import * as repo from '../repositorios/repo-tarefas';
import { obterAcessoEquipeNoProjeto, prenderTrava, soltarTrava } from './servico-acesso';
import { verificarPermissaoManual } from '../middleware/auth';

/**
 * Listagem de tarefas com validação de acesso integrada.
 */
export async function listarTarefas(env: Env, usuario: any, projetoId: string, filtros: repo.FiltrosTarefas, c: any) {
    const { DB } = env;

    // 1. Validação de acesso
    const podeVerTudo = await verificarPermissaoManual(c, 'projetos:visualizar');
    const acesso = podeVerTudo ? 'GESTAO' : await obterAcessoEquipeNoProjeto(DB, projetoId, usuario);
    
    if (acesso === 'NENHUM') {
        throw new Error('Você não tem acesso a este projeto.');
    }

    // 2. Filtro de exclusividade (MEMBRO vê apenas suas próprias tarefas)
    const podeVerTodasTarefas = await verificarPermissaoManual(c, 'tarefas:visualizar_todas');
    if (!podeVerTodasTarefas) {
        filtros.responsavelId = usuario.id;
    }

    // 3. Busca tarefas
    const tarefas = await repo.buscarTarefas(DB, { ...filtros, projetoId });

    if (tarefas.length === 0) return [];

    // 3. Busca responsáveis (Otimizado)
    const idsTarefas = (tarefas as any[]).map(t => t.id);
    const todosResponsaveis = await repo.buscarResponsaveisPorTarefas(DB, idsTarefas);

    // 4. Mapeamento
    const mapaResponsaveis: Record<string, any[]> = {};
    (todosResponsaveis as any[]).forEach(r => {
        if (!mapaResponsaveis[r.tarefa_id]) mapaResponsaveis[r.tarefa_id] = [];
        mapaResponsaveis[r.tarefa_id].push({
            id: r.id,
            nome: r.nome,
            foto: r.foto
        });
    });

    return (tarefas as any[]).map(t => ({
        ...t,
        responsaveis: mapaResponsaveis[t.id] || []
    }));
}

/**
 * Gerencia a trava de edição de uma tarefa no KV.
 */
export async function gerenciarTravaTarefa(KV: any | undefined, tarefaId: string, usuarioId: string, acao: 'lock' | 'unlock') {
    if (!KV) return true;

    if (acao === 'lock') {
        const sucesso = await prenderTrava(KV, 'tarefa', tarefaId, usuarioId);
        if (!sucesso) {
            throw new Error('Esta tarefa está sendo editada por outro membro no momento.');
        }
        return true;
    } else {
        await soltarTrava(KV, 'tarefa', tarefaId, usuarioId);
        return true;
    }
}
