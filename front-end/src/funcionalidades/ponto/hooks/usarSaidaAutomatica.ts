import { useEffect, useRef } from 'react';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { ambiente } from '@/configuracoes/ambiente';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import { logger } from '@/utilitarios/gerenciador-logs';
import type { RegistroPonto } from './usarPonto';

/**
 * Hook que monitora o fechamento da página e o fim do expediente para registrar a saída do ponto.
 * Dispara quando a aba é fechada ou quando o horário limite de saída é atingido.
 */
export function usarSaidaAutomatica() {
    const { usuario } = usarAutenticacao();
    const queryClient = useQueryClient();
    const jaProcessouFimExpediente = useRef(false);

    useEffect(() => {
        if (!usuario) return;

        const registrarSaida = async (motivo: 'fechamento' | 'expediente' = 'fechamento') => {
            const token = localStorage.getItem('softhub_token');
            if (!token) return;

            // Só tenta sair se a última batida foi uma entrada para evitar registros desnecessários
            const queryData = queryClient.getQueryData<{
                registrosHoje: RegistroPonto[];
                historico: RegistroPonto[];
            }>(['ponto']);

            // Se ainda não carregou ou não tem entrada pendente, não faz nada
            if (queryData && queryData.registrosHoje) {
                const ultimoRegistro = queryData.registrosHoje[0];
                if (!ultimoRegistro || ultimoRegistro.tipo === 'saida') {
                    return;
                }
            } else {
                return;
            }

            logger.info('Ponto', `Registrando saída automática (${motivo})...`);

            try {
                // api.post do axios nativo não intercepta Unload Events com 'keepalive' de forma estável,
                // mas nosso api.ts (que implementa um wrapper manual por cima do Fetch) agora aceita o parâmetro keepalive.
                await api.post('/api/ponto', { tipo: 'saida' }, { keepalive: true });
                
                // Se for por expediente, invalidamos o cache para atualizar a UI
                if (motivo === 'expediente') {
                    queryClient.invalidateQueries({ queryKey: ['ponto'] });
                }
            } catch (e) {
                // Silencioso
            }
        };

        // 1. Monitoramento de Horário (Fim de Expediente)
        const monitorarHorario = async (signal?: AbortSignal) => {
            try {
                const res = await api.get('/api/configuracoes/publico', { signal });
                const horaFim = res.data.hora_fim_ponto;
                if (!horaFim) return;

                const [hFim, mFim] = horaFim.split(':').map(Number);
                const agora = new Date();
                const hAgora = agora.getHours();
                const mAgora = agora.getMinutes();

                // Se já passou do horário e ainda não processamos nesta sessão
                if ((hAgora > hFim || (hAgora === hFim && mAgora >= mFim)) && !jaProcessouFimExpediente.current) {
                    jaProcessouFimExpediente.current = true;
                    registrarSaida('expediente');
                }
            } catch (e: any) {
                if (e.name === 'AbortError') return;
            }
        };

        const controlador = new AbortController();
        // Verifica a cada 1 minuto
        const interval = setInterval(() => monitorarHorario(controlador.signal), 60000);
        monitorarHorario(controlador.signal); // Check inicial

        const handleFechamento = () => registrarSaida('fechamento');

        // 2. Monitoramento de Fechamento de Aba
        window.addEventListener('pagehide', handleFechamento);
        window.addEventListener('beforeunload', handleFechamento);
        
        return () => {
             controlador.abort();
             clearInterval(interval);
             window.removeEventListener('pagehide', handleFechamento);
             window.removeEventListener('beforeunload', handleFechamento);
        };
    }, [usuario, queryClient]);
}
