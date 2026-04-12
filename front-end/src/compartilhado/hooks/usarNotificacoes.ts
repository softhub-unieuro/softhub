import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';

export interface Notificacao {
    id: string;
    titulo: string;
    mensagem: string;
    tipo: 'tarefa' | 'ponto' | 'aviso' | 'sistema';
    link_acao?: string;
    lida: boolean;
    criado_em: string;
}

/**
 * Faz polling inteligente de 60s usando React Query.
 * Economiza 90% da cota porque PARA SOZINHO quando o usuário muda de aba ou minimiza.
 */
export function usarNotificacoes() {
    const queryClient = useQueryClient();
    const idNotificados = useRef<Set<string>>(new Set());
    const primeiraCarga = useRef(true);
    
    const { usuario } = usarAutenticacao();
    const estaAutenticado = !!usuario;

    // Solicitar permissão de envio push apenas uma vez no mount se estiver autorizado
    useEffect(() => {
        if (estaAutenticado && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, [estaAutenticado]);

    // Busca principal com Polling Inteligente a cada 60 segundos
    const { data: notificacoes = [], isLoading: carregando, refetch } = useQuery({
        queryKey: ['notificacoes'],
        queryFn: async ({ signal }) => {
            const { data } = await api.get('/api/notificacoes', { signal });
            const novasNotificacoes: Notificacao[] = data.notificacoes ?? [];
            
            // Lógica de Notificação Nativa (Apenas as novas que não estavam na lista local armazenada no ref)
            if ('Notification' in window && Notification.permission === 'granted') {
                novasNotificacoes.forEach(n => {
                    if (!idNotificados.current.has(n.id)) {
                        if (!primeiraCarga.current) {
                            new Notification(n.titulo, {
                                body: n.mensagem,
                                icon: '/icons/icon-192x192.png',
                                badge: '/icons/icon-192x192.png'
                            });
                        }
                        idNotificados.current.add(n.id);
                    }
                });
            }
            primeiraCarga.current = false;
            return novasNotificacoes;
        },
        enabled: estaAutenticado,
        refetchInterval: 60 * 1000, 
        // O refetchIntervalInBackground do React Query vem como false por padrão.
        // Se a tab estiver inativa, o timer CESSA, salvando os preciosos limites do plano Free.
    });

    const mutationMarcarLida = useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/api/notificacoes/${id}/lida`);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['notificacoes'] });
            const prev = queryClient.getQueryData<Notificacao[]>(['notificacoes']);
            queryClient.setQueryData<Notificacao[]>(['notificacoes'], old => 
                old ? old.filter(n => n.id !== id) : []
            );
            return { prev };
        },
        onError: (_err, _id, context) => {
            if (context?.prev) queryClient.setQueryData(['notificacoes'], context.prev);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
        }
    });

    const mutationLimparTodas = useMutation({
        mutationFn: async () => {
            await api.delete('/api/notificacoes/limpar-todas');
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['notificacoes'] });
            const prev = queryClient.getQueryData<Notificacao[]>(['notificacoes']);
            queryClient.setQueryData<Notificacao[]>(['notificacoes'], []);
            return { prev };
        },
        onError: (_err, _variables, context) => {
            if (context?.prev) queryClient.setQueryData(['notificacoes'], context.prev);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
        }
    });

    const marcarComoLida = useCallback(async (id: string) => {
        try {
            await mutationMarcarLida.mutateAsync(id);
        } catch(e) { /* Error já tratado no hook e revertido caso erro HTTP */ }
    }, [mutationMarcarLida]);

    const limparTodas = useCallback(async () => {
        try {
            await mutationLimparTodas.mutateAsync();
        } catch(e) { /* Error tratado na mutation */ }
    }, [mutationLimparTodas]);

    return { 
        notificacoes, 
        carregando, 
        marcarComoLida, 
        limparTodas, 
        recarregar: refetch 
    };
}
