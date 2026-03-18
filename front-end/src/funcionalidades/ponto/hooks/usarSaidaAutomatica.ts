import { useEffect } from 'react';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { ambiente } from '@/configuracoes/ambiente';
import { useQueryClient } from '@tanstack/react-query';
import type { RegistroPonto } from './usarPonto';

/**
 * Hook que monitora o fechamento da página para registrar a saída do ponto.
 * Dispara apenas quando a aba é fechada ou descarregada.
 */
export function usarSaidaAutomatica() {
    const { usuario } = usarAutenticacao();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!usuario) return;

        const registrarSaida = () => {
            const token = localStorage.getItem('token_acesso');
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
                // Se a pagina fechou antes de carregar o ponto (ex: na dashboard), 
                // não enviamos cegamente para não bagunçar com orfãos.
                return;
            }

            // Usamos keepalive=true para que a conexao continue apos fechar a pagina
            const url = `${ambiente.apiUrl}/api/ponto`;
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ tipo: 'saida' }),
                keepalive: true
            }).catch(() => {
                // Não logamos erro pois a página já estará sendo fechada
            });
        };

        // pagehide e beforeunload cobrem tanto navegadores mobile como desktop
        window.addEventListener('pagehide', registrarSaida);
        // beforeunload as vezes é mais rapido no desktop
        window.addEventListener('beforeunload', registrarSaida);
        
        return () => {
             window.removeEventListener('pagehide', registrarSaida);
             window.removeEventListener('beforeunload', registrarSaida);
        };
    }, [usuario, queryClient]);
}
