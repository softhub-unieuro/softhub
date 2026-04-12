import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import { logger } from '@/utilitarios/gerenciador-logs';

export interface MembroResumo {
    nome: string;
    foto: string | null;
}

export interface ProjetoEquipe {
    equipe_id: string;
    acesso: 'LEITURA' | 'EDICAO' | 'GESTAO';
}

export interface Projeto {
    id: string;
    nome: string;
    descricao: string | null;
    publico: boolean;
    github_repo?: string | null;
    documentacao_url?: string | null;
    figma_url?: string | null;
    setup_url?: string | null;
    total_tarefas?: number;
    tarefas_concluidas?: number;
    equipes?: ProjetoEquipe[];
    membros?: MembroResumo[];
    criado_em: string;
}

/**
 * Hook para gerenciar projetos utilizando React Query para sincronização inteligente.
 */
export function usarProjetos() {
    const queryClient = useQueryClient();
    const queryKey = ['projetos'];

    const { data: projetos = [], isLoading: carregando, error } = useQuery<Projeto[]>({
        queryKey,
        queryFn: async () => {
            const res = await api.get('/api/projetos');
            return res.data || [];
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
    });

    const invalidarCache = () => {
        queryClient.invalidateQueries({ queryKey });
        // Evento global para compatibilidade com partes legadas que ainda usam EventListeners
        window.dispatchEvent(new Event('projetos_atualizados'));
    };

    const mutacaoCriar = useMutation({
        mutationFn: (dados: Partial<Projeto>) => api.post('/api/projetos', dados),
        onSuccess: (res, dados) => {
            invalidarCache();
            logger.sucesso('Projetos', `Projeto "${dados.nome}" criado com sucesso`);
        },
        onError: (e: any) => {
            logger.erro('Projetos', e.response?.data?.erro || 'Erro ao criar projeto', e);
        }
    });

    const mutacaoEditar = useMutation({
        mutationFn: ({ id, dados }: { id: string, dados: Partial<Projeto> }) => api.patch(`/api/projetos/${id}`, dados),
        onSuccess: () => {
            invalidarCache();
            logger.sucesso('Projetos', 'Projeto atualizado com sucesso');
        },
        onError: (e: any) => {
            logger.erro('Projetos', e.response?.data?.erro || 'Erro ao atualizar projeto', e);
        }
    });

    const mutacaoExcluir = useMutation({
        mutationFn: (id: string) => api.delete(`/api/projetos/${id}`),
        onSuccess: () => {
            invalidarCache();
            logger.sucesso('Projetos', 'Projeto excluído permanentemente');
        },
        onError: (e: any) => {
            logger.erro('Projetos', e.response?.data?.erro || 'Erro ao excluir projeto', e);
        }
    });

    return {
        projetos,
        carregando,
        erro: error ? (error as any).response?.data?.erro || 'Erro ao carregar projetos' : null,
        recarregar: invalidarCache,
        criarProjeto: mutacaoCriar.mutateAsync,
        editarProjeto: (id: string, dados: Partial<Projeto>) => mutacaoEditar.mutateAsync({ id, dados }),
        excluirProjeto: mutacaoExcluir.mutateAsync
    };
}
