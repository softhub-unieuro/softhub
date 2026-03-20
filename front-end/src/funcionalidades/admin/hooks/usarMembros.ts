import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api } from '@/compartilhado/servicos/api';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';

/** Representação de um membro do sistema. */
export interface Membro {
    id: string;
    nome: string;
    email: string;
    role: string;
    foto_perfil: string | null;
    equipe_id: string | null;
    equipe_nome: string | null;
    grupo_id: string | null;
    criado_em: string;
    is_bootstrap?: boolean; // Flag para administradores protegidos pelo sistema (Bootstrap)
}

/**
 * Hook para gerenciar membros do sistema.
 * Busca a lista de membros e expõe operações CRUD.
 */
export function usarMembros() {
    const queryClient = useQueryClient();

    const podeAcessar = usarPermissaoAcesso('membros:gerenciar');
    const { data: membros = [], isLoading: carregando, error } = useQuery<Membro[]>({
        queryKey: ['membros'],
        enabled: podeAcessar,
        queryFn: async () => {
            const res = await api.get('/api/usuarios');
            return res.data.membros ?? [];
        },
        staleTime: 30000,
    });

    const erro = error ? (error as any).response?.data?.erro || 'Erro ao carregar membros' : null;

    const recarregar = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ['membros'] });
    }, [queryClient]);

    /** Atualiza um membro no cache local (otimista). */
    const atualizarMembro = useCallback((membroAtualizado: Membro) => {
        queryClient.setQueryData<Membro[]>(['membros'], (antigos = []) =>
            antigos.map(m => m.id === membroAtualizado.id ? membroAtualizado : m)
        );
    }, [queryClient]);

    /** Adiciona (autoriza) um novo membro via API. */
    const adicionarMembro = useCallback(async (dados: { email: string; role: string }) => {
        try {
            await api.post('/api/usuarios', dados);
            return { sucesso: true };
        } catch (e: any) {
            return { sucesso: false, erro: e.response?.data?.erro || 'Erro ao cadastrar membro.' };
        }
    }, []);

    /** Remove permanentemente o acesso de um membro. */
    const deletarMembro = useCallback(async (id: string) => {
        try {
            await api.delete(`/api/usuarios/${id}`);
            return { sucesso: true };
        } catch (e: any) {
            return { sucesso: false, erro: e.response?.data?.erro || 'Erro ao remover membro.' };
        }
    }, []);

    return {
        membros,
        carregando,
        erro,
        recarregar,
        adicionarMembro,
        deletarMembro,
        atualizarMembro,
    };
}
