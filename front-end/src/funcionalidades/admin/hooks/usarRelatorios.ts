import { useQuery } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';

export interface RelatorioEquipes {
    grupos: {
        id: string;
        nome: string;
        equipe_nome: string | null;
        total_membros: number;
    }[];
    equipes: {
        id: string;
        nome: string;
        lider_nome: string | null;
        total_membros: number;
    }[];
}

export interface RelatorioFrequenciaGeral {
    tendencia: {
        data: string;
        total_presentes: number;
    }[];
    statusJustificativas: {
        status: string;
        total: number;
    }[];
    tiposJustificativas: {
        tipo: string;
        total: number;
    }[];
    justificativasLista: {
        id: string;
        usuario_nome: string;
        tipo: string;
        status: string;
        descricao: string;
        criado_em: string;
    }[];
}

export interface RelatorioFrequenciaMembro {
    id: string;
    nome: string;
    email: string;
    equipe_nome: string | null;
    grupo_nome: string | null;
    dias_presentes: number;
    datas_presenca: string | null;
    justificativas_aprovadas: number;
    ultima_batida: string | null;
}

/**
 * Hook para buscar relatórios gerenciais com React Query.
 * Suporta filtragem por período de data.
 */
export function usarRelatorios(dataInicio?: string, dataFim?: string) {
    
    const podeVisualizarRelatorios = usarPermissaoAcesso("relatorios:visualizar");

    // 1. Relatório de Estrutura (Estático, muda pouco)
    const queryEquipes = useQuery<RelatorioEquipes>({
        queryKey: ['relatorios', 'equipes'],
        enabled: podeVisualizarRelatorios,
        queryFn: async () => {
            const res = await api.get('/api/relatorios/equipes');
            return res.data;
        },
        staleTime: 10 * 60 * 1000, // 10 minutos
    });

    // 2. Relatório de Frequência Geral (Dinâmico p/ período)
    const queryFrequenciaGeral = useQuery<RelatorioFrequenciaGeral>({
        queryKey: ['relatorios', 'frequencia', 'geral', dataInicio, dataFim],
        enabled: podeVisualizarRelatorios,
        queryFn: async () => {
            const res = await api.get('/api/relatorios/frequencia/geral', {
                params: { data_inicio: dataInicio, data_fim: dataFim }
            });
            return res.data;
        },
    });

    // 3. Relatório de Membros (Dinâmico p/ período)
    const queryFrequenciaMembros = useQuery<RelatorioFrequenciaMembro[]>({
        queryKey: ['relatorios', 'frequencia', 'membros', dataInicio, dataFim],
        enabled: podeVisualizarRelatorios,
        queryFn: async () => {
            const res = await api.get('/api/relatorios/frequencia/membros', {
                params: { data_inicio: dataInicio, data_fim: dataFim }
            });
            return res.data.membros || [];
        },
    });

    const carregando = queryEquipes.isLoading || queryFrequenciaGeral.isLoading || queryFrequenciaMembros.isLoading;
    const erro = (
        (queryEquipes.error as any)?.response?.data?.erro || 
        (queryFrequenciaGeral.error as any)?.response?.data?.erro || 
        (queryFrequenciaMembros.error as any)?.response?.data?.erro || 
        null
    );

    return {
        equipesRelatorio: queryEquipes.data || null,
        frequenciaGeral: queryFrequenciaGeral.data || null,
        frequenciaMembros: queryFrequenciaMembros.data || [],
        carregando,
        erro,
        recarregar: () => {
            queryEquipes.refetch();
            queryFrequenciaGeral.refetch();
            queryFrequenciaMembros.refetch();
        }
    };
}
