import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';

export interface RegistroPonto {
    id: string;
    tipo: 'entrada' | 'saida';
    registrado_em: string; // ISO 8601
    ip_origem: string;
}

/**
 * Hook de gerenciamento do Ponto Eletrônico da Fábrica.
 * Refatorado com React Query para eliminar consumo ocioso em background (tab oculta).
 */
export function usarPonto() {
    const queryClient = useQueryClient();
    const { usuario } = usarAutenticacao();
    const estaAutenticado = !!usuario;

    const { 
        data: { registrosHoje = [], historico = [] } = {}, 
        isLoading: carregando, 
        error: erroQuery,
        refetch
    } = useQuery({
        queryKey: ['ponto'],
        queryFn: async () => {
             const res = await api.get('/api/ponto');
             return {
                 registrosHoje: (res.data?.hoje ?? []) as RegistroPonto[],
                 historico: (res.data?.historico ?? []) as RegistroPonto[]
             };
        },
        enabled: estaAutenticado,
        // Polling de 60s apenas se a aba estiver FOCADA, salvando 90% das chamadas diárias
        refetchInterval: 60 * 1000, 
    });

    const mutationBaterPonto = useMutation({
        mutationFn: async (tipo: 'entrada' | 'saida') => {
            await api.post('/api/ponto', { tipo });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ponto'] });
        }
    });

    const baterPonto = useCallback(async (tipo: 'entrada' | 'saida') => {
        try {
            await mutationBaterPonto.mutateAsync(tipo);
            return true;
        } catch (e: any) {
             const msgErro = e.response?.data?.erro || 'Erro ao registrar ponto. Verifique sua conexão ou se está na rede autorizada.';
             throw new Error(msgErro);
        }
    }, [mutationBaterPonto]);



    const erroFinal = erroQuery instanceof Error ? erroQuery.message : (mutationBaterPonto.error as Error)?.message || null;

    return { 
        registrosHoje, 
        historico, 
        carregando, 
        erro: erroFinal, 
        baterPonto, 
        recarregar: refetch 
    };
}
