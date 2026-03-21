import { useQuery } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import type { Aviso } from '@/funcionalidades/avisos/hooks/usarAvisos';

export interface MetricaDashboard {
    totalTarefas: number;
    tarefasConcluidas: number;
    tarefasAtrasadas: number;
    horasRegistradasHoje: number;
    progressoGeral: number; // 0 a 100
}

export interface TarefaDashboard {
    id: string;
    titulo: string;
    prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
    status: string;
}

export interface ProjetoDashboard {
    id: string;
    nome: string;
}

export interface DadosDashboard {
    metricas: MetricaDashboard;
    avisos: Aviso[];
    minhasTarefas: TarefaDashboard[];
    projetosAtivos: ProjetoDashboard[];
}

/**
 * Hook de gerenciamento dos dados do Dashboard Principal.
 * Utiliza React Query para cache e gerenciamento de estado de carregamento.
 */
export function usarDashboard(projetoId?: string) {
    const { 
        data, 
        isLoading: carregando, 
        error 
    } = useQuery<DadosDashboard>({
        queryKey: ['dashboard', projetoId || 'global'],
        queryFn: async () => {
            const res = await api.get('/api/dashboard', { 
                params: { projetoId: projetoId || 'global' } 
            });
            return res.data;
        },
        staleTime: 15_000,        // 15s — dados ficam "frescos" por pouco tempo
        refetchOnWindowFocus: true, // re-busca ao voltar à aba
    });

    const erro = error ? (error as any).response?.data?.erro || 'Erro ao carregar dashboard' : null;

    return { 
        metricas: data?.metricas || null, 
        avisos: data?.avisos || [], 
        minhasTarefas: data?.minhasTarefas || [], 
        projetosAtivos: data?.projetosAtivos || [],
        carregando, 
        erro 
    };
}




