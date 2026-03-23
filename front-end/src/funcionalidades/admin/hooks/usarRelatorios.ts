import { useQuery } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';


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

export interface RelatorioProjeto {
    id: string;
    nome: string;
    publico: number;
    total_tarefas: number;
    concluidas: number;
    em_aberto: number;
    urgentes_pendentes: number;
}

export interface RelatorioDesempenhoMembro {
    id: string;
    nome: string;
    email: string;
    entregas_totais: number;
    em_andamento: number;
    ultima_entrega: string | null;
}

/**
 * Hook para buscar relatórios gerenciais com React Query.
 * Suporta filtragem por período de data.
 */
export function usarRelatorios(dataInicio?: string, dataFim?: string) {
    
    const podeVisualizarRelatorios = usarPermissaoAcesso("relatorios:visualizar");

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

    // 4. Relatório de Projetos
    const queryProjetos = useQuery<{ projetos: RelatorioProjeto[] }>({
        queryKey: ['relatorios', 'projetos'],
        enabled: podeVisualizarRelatorios,
        queryFn: async () => {
            const res = await api.get('/api/relatorios/projetos');
            return res.data;
        },
    });

    // 5. Relatório de Desempenho de Membros
    const queryDesempenho = useQuery<{ desempenho: RelatorioDesempenhoMembro[] }>({
        queryKey: ['relatorios', 'desempenho'],
        enabled: podeVisualizarRelatorios,
        queryFn: async () => {
            const res = await api.get('/api/relatorios/desempenho-membros');
            return res.data;
        },
    });

    const exportarPonto = async () => {
        try {
            const res = await api.get('/api/relatorios/exportar/ponto', {
                params: { data_inicio: dataInicio, data_fim: dataFim },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatorio_ponto_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            console.error('Erro ao exportar:', e);
        }
    };

    const carregando = queryFrequenciaGeral.isLoading || queryFrequenciaMembros.isLoading || queryProjetos.isLoading || queryDesempenho.isLoading;
    const erro = (
        (queryFrequenciaGeral.error as any)?.response?.data?.erro || 
        (queryFrequenciaMembros.error as any)?.response?.data?.erro || 
        (queryProjetos.error as any)?.response?.data?.erro || 
        (queryDesempenho.error as any)?.response?.data?.erro || 
        null
    );

    const buscarFrequenciaMembro = async (membroId: string) => {
        if (!membroId) return [];
        const params: any = {};
        if (dataInicio) params.inicio = dataInicio;
        if (dataFim) params.fim = dataFim;
        const res = await api.get(`/api/relatorios/membro/${membroId}/frequencia`, { params });
        return res.data.registros || [];
    };

    const exportarPontoMembro = async (membroId: string) => {
        try {
            const res = await api.get(`/api/relatorios/exportar/ponto/membro/${membroId}`, {
                params: { inicio: dataInicio, fim: dataFim },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `extrato_membro_${membroId}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            console.error('Erro ao exportar:', e);
        }
    };

    const exportarMapaSemestral = async () => {
        try {
            const res = await api.get('/api/relatorios/exportar/mapa-semestral', {
                params: { inicio: dataInicio, fim: dataFim },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `mapa_frequencia_${dataInicio || 'semestre'}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            console.error('Erro ao exportar mapa:', e);
        }
    };

    return {
        frequenciaGeral: queryFrequenciaGeral.data || null,
        frequenciaMembros: queryFrequenciaMembros.data || [],
        projetosRelatorio: queryProjetos.data?.projetos || [],
        desempenhoRelatorio: queryDesempenho.data?.desempenho || [],
        carregando,
        erro,
        exportarPonto,
        buscarFrequenciaMembro,
        exportarPontoMembro,
        exportarMapaSemestral,
        recarregar: () => {
            queryFrequenciaGeral.refetch();
            queryFrequenciaMembros.refetch();
            queryProjetos.refetch();
            queryDesempenho.refetch();
        }
    };
}
