import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';

export interface Grupo {
    id: string;
    nome: string;
    descricao: string | null;
    equipe_id: string | null;
    equipe_nome: string | null;
    lider_nome: string | null;
    sub_lider_nome: string | null;
    total_membros: number;
    criado_em: string;
}

export interface Equipe {
    id: string;
    nome: string;
    descricao: string | null;
    lider_id: string | null;
    lider_nome: string | null;
    sub_lider_id: string | null;
    sub_lider_nome: string | null;
    total_membros: number;
    grupos_nomes: string | null;
    criado_em: string;
}

export interface MembroSimples {
    id: string;
    nome: string;
    email: string;
    role: string;
    foto_perfil: string | null;
    equipe_id: string | null;
    grupo_id: string | null;
    grupos_ids?: string | null;
}

/**
 * Hook para gerenciar grupos, equipes e alocação de membros.
 * Utiliza React Query para sincronização inteligente e feedback em segundo plano.
 */
export function usarEquipes() {
    const queryClient = useQueryClient();

    const podeAcessar = usarPermissaoAcesso('equipes:visualizar');
    const podeAcessarMembros = usarPermissaoAcesso('membros:gerenciar');

    const { data: dadosCache, isLoading: carregando, error } = useQuery({
        queryKey: ['estrutura-organizacional'],
        enabled: podeAcessar,
        queryFn: async () => {
            const [resGrupos, resEquipes] = await Promise.all([
                api.get('/api/equipes/grupos'),
                api.get('/api/equipes/equipes')
            ]);
            
            let membrosData = [];
            // Só busca usuários se tiver permissão, senão o Promise.all falha com 403 e quebra a tela toda
            if (podeAcessarMembros) {
                try {
                    const resMembros = await api.get('/api/usuarios');
                    membrosData = resMembros.data.membros ?? [];
                } catch (e) {
                    console.warn('[usarEquipes] Sem permissão para listar membros detalhados.');
                }
            }

            return {
                grupos: resGrupos.data.grupos ?? [],
                equipes: resEquipes.data.equipes ?? [],
                membros: membrosData,
            };
        },
        staleTime: 60000, // 1 minuto
    });

    const grupos = dadosCache?.grupos ?? [];
    const equipes = dadosCache?.equipes ?? [];
    const membros = dadosCache?.membros ?? [];

    const invalidarCache = () => queryClient.invalidateQueries({ queryKey: ['estrutura-organizacional'] });

    // Mutações
    const mutacaoCriarGrupo = useMutation({
        mutationFn: (dados: any) => api.post('/api/equipes/grupos', dados),
        onSuccess: invalidarCache
    });

    const mutacaoEditarGrupo = useMutation({
        mutationFn: ({ id, dados }: { id: string, dados: any }) => api.patch(`/api/equipes/grupos/${id}`, dados),
        onSuccess: invalidarCache
    });

    const mutacaoDesativarGrupo = useMutation({
        mutationFn: (id: string) => api.delete(`/api/equipes/grupos/${id}`),
        onSuccess: invalidarCache
    });

    const mutacaoCriarEquipe = useMutation({
        mutationFn: (dados: any) => api.post('/api/equipes/equipes', dados),
        onSuccess: invalidarCache
    });

    const mutacaoEditarEquipe = useMutation({
        mutationFn: ({ id, dados }: { id: string, dados: any }) => api.patch(`/api/equipes/equipes/${id}`, dados),
        onSuccess: invalidarCache
    });

    const mutacaoDesativarEquipe = useMutation({
        mutationFn: (id: string) => api.delete(`/api/equipes/equipes/${id}`),
        onSuccess: invalidarCache
    });

    const mutacaoAlocar = useMutation({
        mutationFn: ({ membroId, equipe_id, grupo_id }: any) => api.patch(`/api/equipes/membros/${membroId}/alocar`, { equipe_id, grupo_id }),
        onSuccess: invalidarCache
    });

    const mutacaoAlocarLote = useMutation({
        mutationFn: ({ membrosIds, equipe_id, grupo_id }: any) => api.post(`/api/equipes/membros/alocar-lote`, { membros: membrosIds, equipe_id, grupo_id }),
        onSuccess: invalidarCache
    });

    const mutacaoMover = useMutation({
        mutationFn: ({ membroId, equipe_id, grupo_id, origem_grupo_id }: any) => api.patch(`/api/equipes/membros/${membroId}/mover`, { equipe_id, grupo_id, origem_grupo_id }),
        onSuccess: invalidarCache
    });

    const erro = error ? (error as any).response?.data?.erro || 'Erro ao carregar dados' : null;

    return {
        grupos,
        equipes,
        membros,
        carregando,
        erro,
        carregar: invalidarCache,
        criarGrupo: mutacaoCriarGrupo.mutateAsync,
        editarGrupo: (id: string, dados: any) => mutacaoEditarGrupo.mutateAsync({ id, dados }),
        desativarGrupo: mutacaoDesativarGrupo.mutateAsync,
        criarEquipe: mutacaoCriarEquipe.mutateAsync,
        editarEquipe: (id: string, dados: any) => mutacaoEditarEquipe.mutateAsync({ id, dados }),
        desativarEquipe: mutacaoDesativarEquipe.mutateAsync,
        alocarMembro: (membroId: string, equipe_id: string | null, grupo_id: string | null) => mutacaoAlocar.mutateAsync({ membroId, equipe_id, grupo_id }),
        alocarMembroLote: (membrosIds: string[], equipe_id: string | null, grupo_id: string | null) => mutacaoAlocarLote.mutateAsync({ membrosIds, equipe_id, grupo_id }),
        moverMembro: (membroId: string, equipe_id: string, grupo_id: string, origem_grupo_id: string) => mutacaoMover.mutateAsync({ membroId, equipe_id, grupo_id, origem_grupo_id }),
    };
}
