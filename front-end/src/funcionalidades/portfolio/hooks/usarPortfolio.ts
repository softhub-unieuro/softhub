import { useQuery } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';

/**
 * Hook para buscar dados do portfólio público (projetos com flag publico=1).
 */
export interface ProjetoPublico {
    id: string;
    nome: string;
    descricao: string;
    github_repo?: string;
    documentacao_url?: string;
    figma_url?: string;
    criado_em: string;
}

export interface EquipeResumo {
    total: number;
    membros: {
        id: string;
        nome: string;
        role: string;
        foto_perfil: string | null;
    }[];
}

export function usarPortfolio() {
    const { data: projetos, isLoading: carregando, error } = useQuery<ProjetoPublico[]>({
        queryKey: ['portfolio_publico'],
        queryFn: async () => {
            const res = await api.get('/api/projetos/publicos');
            return res.data;
        }
    });

    return {
        projetos: projetos || [],
        carregando,
        erro: error ? 'Falha ao conectar com a Fábrica' : null
    };
}

export function usarEquipe() {
    const { data: equipe, isLoading } = useQuery<EquipeResumo>({
        queryKey: ['equipe_publica'],
        queryFn: async () => {
            const res = await api.get('/api/projetos/equipe-publica');
            return res.data;
        }
    });

    return {
        total: equipe?.total ?? 0,
        membros: equipe?.membros ?? [],
        carregando: isLoading
    };
}
