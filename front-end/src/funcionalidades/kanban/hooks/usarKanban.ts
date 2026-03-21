import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';

export interface Tarefa {
    id: string;
    titulo: string;
    descricao: string | null;
    status: 'backlog' | 'todo' | 'in_progress' | 'em_revisao' | 'concluida';
    prioridade: 'urgente' | 'alta' | 'media' | 'baixa';
    pontos: number | null;
    feedback_lider?: string | null;
    nota_aprendizado?: number | null;
    data_conclusao?: string | null;
    equipe_id?: string | null;
    equipe_nome?: string | null;
    responsaveis: Array<{
        id: string;
        nome: string;
        foto?: string;
        nivel?: string;
    }>;
}

export interface FiltrosKanban {
    busca?: string;
    prioridades?: string[];
    responsavelId?: string;
}

/**
 * Hook com responsabilidade única de gerenciar as tarefas do Kanban de um Projeto.
 * Encapsula lógica de busca, filtros, movimentação e blindagem de estado (optimistic updates).
 */
export function usarKanban(projetoId?: string, filtros?: FiltrosKanban) {
    const queryClient = useQueryClient();

    const filtroBusca = filtros?.busca;
    const filtroPrioridades = filtros?.prioridades?.join(',') || undefined;
    const filtroResponsavelId = filtros?.responsavelId;

    const queryKey = ['tarefas', projetoId, filtroBusca, filtroPrioridades, filtroResponsavelId];

    const { 
        data: tarefas = [], 
        isLoading: carregando, 
        error 
    } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!projetoId) return [];
            const params: Record<string, any> = { projetoId };
            if (filtroBusca) params.busca = filtroBusca;
            if (filtroPrioridades) params.prioridade = filtroPrioridades;
            if (filtroResponsavelId) params.responsavelId = filtroResponsavelId;

            const res = await api.get('/api/tarefas', { params });
            return res.data || [];
        },
        enabled: !!projetoId,
        staleTime: 30000, // 30 segundos
    });

    const erro = error ? (error as any).response?.data?.erro || 'Erro ao carregar tarefas' : null;

    // Mutação para mover o card (Optimistic Update)
    const mutacaoMover = useMutation({
        mutationFn: async ({ tarefaId, status }: { tarefaId: string; status: Tarefa['status'] }) => {
            return api.patch(`/api/tarefas/${tarefaId}/mover`, { status });
        },
        onMutate: async ({ tarefaId, status }) => {
            // Cancela refetches em andamento para não sobrescrever o update otimista
            await queryClient.cancelQueries({ queryKey });

            // Snapshot do estado anterior
            const estadoAnterior = queryClient.getQueryData<Tarefa[]>(queryKey);

            // Update otimista no cache
            queryClient.setQueryData<Tarefa[]>(queryKey, (antigo) => 
                antigo?.map(t => t.id === tarefaId ? { ...t, status } : t)
            );

            return { estadoAnterior };
        },
        onError: (_err, _variaveis, contexto) => {
            // Rollback em caso de erro
            if (contexto?.estadoAnterior) {
                queryClient.setQueryData(queryKey, contexto.estadoAnterior);
            }
        },
        onSettled: () => {
            // Revalida sempre ao final
            queryClient.invalidateQueries({ queryKey });
        },
    });

    const moverCard = async (tarefaId: string, colunaDestino: Tarefa['status']) => {
        return mutacaoMover.mutateAsync({ tarefaId, status: colunaDestino });
    };

    const atualizarTarefaLocal = useCallback((tarefa: Tarefa) => {
        queryClient.setQueryData<Tarefa[]>(queryKey, (antigo) => 
            antigo?.map(t => t.id === tarefa.id ? tarefa : t)
        );
    }, [queryClient, queryKey]);

    return { 
        tarefas, 
        carregando, 
        erro, 
        moverCard, 
        recarregar: () => queryClient.invalidateQueries({ queryKey }),
        atualizarTarefaLocal 
    };
}

