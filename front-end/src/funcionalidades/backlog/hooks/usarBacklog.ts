import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import type { Tarefa } from '@/funcionalidades/kanban/hooks/usarKanban';
import { PROJETO_PADRAO_ID } from '@/utilitarios/constantes';

export interface FiltrosBacklog {
    busca?: string;
    prioridades?: string[];
    status?: string[];
    modulo?: string;
    responsavelId?: string;
    participacaoUsuarioId?: string; // Novo: Pertence ou Participa
}

/**
 * Hook para gerenciar o Backlog (Lista de Tarefas) com filtros avançados.
 */
export function usarBacklog(projetoId: string = PROJETO_PADRAO_ID, filtros: FiltrosBacklog = {}) {
    const queryClient = useQueryClient();

    const queryKey = ['backlog', projetoId, filtros];

    const { data: tarefas = [], isLoading: carregando, error } = useQuery<Tarefa[]>({
        queryKey,
        queryFn: async () => {
            const params: Record<string, any> = { projetoId };
            if (filtros.busca) params.busca = filtros.busca;
            if (filtros.prioridades?.length) params.prioridade = filtros.prioridades.join(',');
            if (filtros.modulo) params.modulo = filtros.modulo;
            if (filtros.responsavelId) params.responsavelId = filtros.responsavelId;
            if (filtros.participacaoUsuarioId) params.participacaoUsuarioId = filtros.participacaoUsuarioId;

            const res = await api.get('/api/tarefas', { params });
            const data = res.data || [];
            
            // Filtro de status no frontend se múltiplos forem selecionados (ou se a api não suportar lista)
            if (filtros.status?.length) {
                return data.filter((t: Tarefa) => filtros.status?.includes(t.status));
            }
            
            return data;
        },
        staleTime: 30000,
        enabled: !!projetoId,
    });

    // Mutação para criar tarefa
    const mutacaoCriar = useMutation({
        mutationFn: async (novaTarefa: Partial<Tarefa>) => {
            const res = await api.post('/api/tarefas', { ...novaTarefa, projeto_id: projetoId });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backlog'] });
            queryClient.invalidateQueries({ queryKey: ['tarefas'] });
        }
    });

    return {
        tarefas,
        carregando,
        erro: error ? (error as any).response?.data?.erro || 'Erro ao carregar backlog' : null,
        criarTarefa: mutacaoCriar.mutateAsync,
        criando: mutacaoCriar.isPending,
        recarregar: () => queryClient.invalidateQueries({ queryKey })
    };
}
