import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { usarConfiguracoes } from '@/funcionalidades/admin/hooks/usarConfiguracoes';

export interface RegistroPonto {
    id: string;
    tipo: 'entrada' | 'saida';
    registrado_em: string; // ISO 8601
    ip_origem: string;
    aviso?: string;
}


/**
 * Hook de gerenciamento do Ponto Eletrônico da Fábrica.
 * Refatorado com React Query para eliminar consumo ocioso em background (tab oculta).
 */
export function usarPonto() {
    const queryClient = useQueryClient();
    const { usuario } = usarAutenticacao();
    const estaAutenticado = !!usuario;

    const { configuracoes } = usarConfiguracoes();
    const intervaloMs = (configuracoes?.intervalo_sincronia_segundos || 30) * 1000;

    const { 
        data: { registrosHoje = [], historico = [], escala = null, escalaTipo = 'fixa' } = {}, 
        isLoading: carregando, 
        error: erroQuery,
        refetch
    } = useQuery({
        queryKey: ['ponto'],
        queryFn: async () => {
             const res = await api.get('/api/ponto');
             return {
                 registrosHoje: (res.data?.hoje ?? []) as RegistroPonto[],
                 historico: (res.data?.historico ?? []) as RegistroPonto[],
                 escala: res.data?.escala as string | null,
                 escalaTipo: res.data?.escalaTipo as string
             };
        },
        enabled: estaAutenticado,
        // Polling dinâmico apenas se a aba estiver FOCADA, salvando recursos
        refetchInterval: intervaloMs, 
    });

    const mutationBaterPonto = useMutation({
        mutationFn: async (tipo: 'entrada' | 'saida') => {
            await api.post('/api/ponto', { tipo });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ponto'] });
        }
    });

    /**
     * Registra um novo ponto de entrada ou saída.
     * @param tipo - 'entrada' ou 'saida'
     * @returns {Promise<boolean>} Sucesso da operação
     */
    const baterPonto = useCallback(async (tipo: 'entrada' | 'saida') => {
        try {
            await mutationBaterPonto.mutateAsync(tipo);
            return true;
        } catch (erro: unknown) {
             let msgErro = 'Erro ao registrar ponto. Verifique sua conexão ou se está na rede autorizada.';
             
             if (erro && typeof erro === 'object' && 'response' in erro) {
                const axiosErr = erro as { response?: { data?: { erro?: string, detalhe?: string, diagnostico?: { seu_ip?: string } } } };
                if (axiosErr.response?.data?.erro) {
                    const data = axiosErr.response.data;
                    msgErro = data.detalhe 
                        ? `${data.erro} ${data.detalhe}` 
                        : data.erro;
                    
                    if (data.diagnostico?.seu_ip) {
                        msgErro += ` (Seu IP Detectado: ${data.diagnostico.seu_ip})`;
                    }
                }
             }

             throw new Error(msgErro);
        }
    }, [mutationBaterPonto]);

    const erroFinal = erroQuery instanceof Error ? erroQuery.message : (mutationBaterPonto.error as Error)?.message || null;

    return { 
        registrosHoje, 
        historico, 
        escala,
        escalaTipo,
        carregando, 
        erro: erroFinal, 
        baterPonto, 
        recarregar: refetch 
    };
}

