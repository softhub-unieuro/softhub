import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import { usarToast } from '@/compartilhado/hooks/usarToast';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import type { PerfilData } from '../hooks/usarPerfil';

export interface PerfilContextType {
    perfil: PerfilData['perfil'] | undefined;
    stats: PerfilData['stats'] | undefined;
    carregando: boolean;
    erro: string | null;
    atualizarPerfil: (dados: any) => Promise<any>;
    salvando: boolean;
    refetch: () => void;
}

const PerfilContext = createContext<PerfilContextType | undefined>(undefined);

/**
 * Provedor do Contexto de Perfil.
 * Permite injetar um customUsuarioId para visualizar perfis de terceiros.
 */
export function PerfilProvider({ children, customUsuarioId }: { children: ReactNode, customUsuarioId?: string }) {
    const queryClient = useQueryClient();
    const { exibirToast } = usarToast();
    const { estaAutenticado, projetoAtivoId } = usarAutenticacao();
    const queryKey = useMemo(() => customUsuarioId ? ['perfil', customUsuarioId, projetoAtivoId] : ['perfil_me', projetoAtivoId], [customUsuarioId, projetoAtivoId]);
 
    const { data, isLoading: carregando, error, refetch } = useQuery<PerfilData>({
        queryKey,
        queryFn: async ({ signal }) => {
            const url = customUsuarioId ? `/api/perfil/${customUsuarioId}` : '/api/perfil/me';
            const res = await api.get(url, { 
                params: { projetoId: projetoAtivoId || 'global' },
                signal
            });
            return res.data;
        },
        enabled: estaAutenticado || !!customUsuarioId
    });

    const mutacao = useMutation({
        mutationFn: async (dados: any) => {
            const url = customUsuarioId ? `/api/perfil/${customUsuarioId}` : '/api/perfil/me';
            return api.patch(url, dados);
        },
        onSuccess: () => {
            exibirToast('Perfil atualizado com sucesso!');
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (err: any) => {
            exibirToast(err.response?.data?.erro || 'Erro ao atualizar perfil', 'erro');
        }
    });

    const erro = error ? (error as any).response?.data?.erro || 'Falha ao carregar perfil' : null;

    const value = {
        perfil: data?.perfil,
        stats: data?.stats,
        carregando,
        erro,
        atualizarPerfil: mutacao.mutateAsync,
        salvando: mutacao.isPending,
        refetch
    };

    return <PerfilContext.Provider value={value}>{children}</PerfilContext.Provider>;
}

export function usarPerfilContexto() {
    const context = useContext(PerfilContext);
    if (context === undefined) {
        throw new Error('usarPerfilContexto deve ser usado dentro de um PerfilProvider');
    }
    return context;
}
