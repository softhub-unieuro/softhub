import { Context } from 'hono';
import { KVNamespace } from '@cloudflare/workers-types';
import { Env } from '../index';
import * as repo from '../repositorios/repo-tarefas';
import { obterAcessoEquipeNoProjeto, prenderTrava, soltarTrava } from './servico-acesso';
import { verificarPermissaoManual } from '../middleware/auth';
import { UsuarioDB } from '../modelos/tipagem-banco';

/**
 * Interface para representar um responsável por tarefa mapeado.
 */
interface ResponsavelMapeado {
    id: string;
    nome: string;
    foto?: string;
}

/**
 * Lista as tarefas de um projeto com validação de permissão e filtros aplicados.
 * 
 * @param env - Variáveis de ambiente
 * @param usuario - Dados do usuário autenticado
 * @param projetoId - UUID do projeto
 * @param filtros - Objeto de filtragem (busca, prioridade, responsável)
 * @param c - Contexto Hono
 * @returns Lista de tarefas com seus respectivos responsáveis vinculados
 * @throws {Error} Se o usuário não tiver acesso ao projeto
 */
export async function listarTarefas(
    env: Env, 
    usuario: UsuarioDB, 
    projetoId: string, 
    filtros: repo.FiltrosTarefas, 
    c: Context
) {
    const { DB } = env;

    // 1. Validação de acesso institucional
    const podeVerTudo = await verificarPermissaoManual(c, 'projetos:visualizar');
    const acesso = podeVerTudo ? 'GESTAO' : await obterAcessoEquipeNoProjeto(DB, projetoId, usuario);
    
    if (acesso === 'NENHUM') {
        throw new Error('Você não tem acesso a este projeto.');
    }

    // 2. Filtro de exclusividade (Membros comuns vêem apenas o que pertence à sua equipe ou participam)
    const podeVerTodasTarefas = await verificarPermissaoManual(c, 'tarefas:visualizar_todas');
    if (!podeVerTodasTarefas) {
        filtros.participacaoUsuarioId = usuario.id;
        // Limpa o responsavelId anterior para não conflitar com o filtro holístico
        delete filtros.responsavelId;
    }

    // 3. Busca tarefas no repositório
    const tarefas = await repo.buscarTarefas(DB, { ...filtros, projetoId }) as any[];

    if (tarefas.length === 0) return [];

    // 4. Busca responsáveis de forma otimizada (Batch Load)
    const idsTarefas = tarefas.map(t => String(t.id));
    const todosResponsaveis = await repo.buscarResponsaveisPorTarefas(DB, idsTarefas);

    // 5. Mapeia responsáveis para cada tarefa correspondente
    const mapaResponsaveis: Record<string, ResponsavelMapeado[]> = {};
    
    (todosResponsaveis as any[]).forEach(r => {
        if (!mapaResponsaveis[r.tarefa_id]) {
            mapaResponsaveis[r.tarefa_id] = [];
        }
        mapaResponsaveis[r.tarefa_id].push({
            id: r.id,
            nome: r.nome,
            foto: r.foto
        });
    });

    return tarefas.map(t => ({
        ...t,
        responsaveis: mapaResponsaveis[String(t.id)] || []
    }));
}

/**
 * Gerencia a trava (lock/unlock) de edição de uma tarefa via KV (Governança de Edição Simultânea).
 * 
 * @param KV - Namespace KV do Cloudflare
 * @param tarefaId - UUID da tarefa a ser travada
 * @param usuarioId - UUID do usuário solicitante
 * @param acao - Operação de trava ('lock' ou 'unlock')
 * @returns {Promise<boolean>} Sucesso da operação
 * @throws {Error} Se a tarefa já estiver sendo editada por outro usuário
 */
export async function gerenciarTravaTarefa(
    KV: KVNamespace | undefined, 
    tarefaId: string, 
    usuarioId: string, 
    acao: 'lock' | 'unlock'
) {
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

