import { useMsal } from '@azure/msal-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { loginRequest } from '../../../configuracoes/msal';
import { usarAutenticacao } from '../../../contexto/ContextoAutenticacao';
import { api } from '../../../compartilhado/servicos/api';
import { logger } from '../../../utilitarios/gerenciador-logs';

/**
 * Hook dedicado para o fluxo de autenticação MSAL (Checklist Frontend Part 4).
 * Gerencia a interação com a Microsoft e a sincronização com o backend.
 */
export function usarMsalAuth() {
    const { instance: instancia, accounts: contas, inProgress: emAndamento } = useMsal();
    const navegar = useNavigate();
    const { entrar, sair, estaAutenticado } = usarAutenticacao();

    /**
     * Inicia o fluxo de login via redirect (Mais seguro e PWA-friendly).
     * Redireciona o usuário para a página de login da Microsoft.
     */
    const loginComMicrosoft = useCallback(async () => {
        try {
            await instancia.loginRedirect(loginRequest);
        } catch (erro) {
            logger.erro('MSAL', 'Falha ao iniciar login redirect', erro);
            throw erro;
        }
    }, [instancia]);

    /**
     * Realiza o logout total (App local + Microsoft).
     * Revoga tokens no backend e redireciona para o logout da Microsoft.
     */
    const logoutTotal = useCallback(async () => {
        try {
            // 1. Limpa sessão no backend
            await api.post('/api/auth/logout');

            // 2. Limpa contexto local
            sair();

            // 3. Logout na Microsoft (Checklist: Logout sincronizado)
            await instancia.logoutRedirect({
                postLogoutRedirectUri: window.location.origin + '/login',
            });
        } catch (erro) {
            logger.erro('MSAL', 'Erro durante logout parcial/total', erro);
            // Mesmo com erro na MSAL, deslogamos localmente para garantir segurança
            sair();
            navegar('/login');
        }
    }, [instancia, sair, navegar]);

    /**
     * Processa o resultado do login e troca o token com o backend para obter um JWT próprio.
     * @param conta - Objeto da conta retornado pela Microsoft
     * @returns Objeto com status de sucesso e erro se disponível
     */
    const processarLoginNoBackend = useCallback(async (conta: any) => {
        try {
            // Adquire o token silenciosamente (Audit Checklist: acquireTokenSilent)
            const respostaToken = await instancia.acquireTokenSilent({
                ...loginRequest,
                account: conta
            });

            // Valida no nosso backend e emite JWT próprio (Checklist Backend Part 1)
            // Usamos o idToken para validação de identidade e claims institucionais
            const resposta = await api.post('/api/auth/msal', {
                idToken: respostaToken.idToken
            });

            const dados = resposta.data;

            // Armazena tokens da sessão SoftHub para rotação (SEG-012)
            if (dados.refreshToken) localStorage.setItem('softhub_refresh_token', dados.refreshToken);
            localStorage.setItem('softhub_token', dados.token);
            
            entrar(dados.usuario, dados.token);
            navegar('/app/dashboard', { replace: true });

            return { sucesso: true };
        } catch (erro: any) {
            logger.erro('MSAL', 'Falha ao sincronizar com backend', erro);
            return { 
                sucesso: false, 
                erro: erro.resposta?.dados?.erro || 'Falha na validação institucional do servidor. Verifique se você usou @unieuro.edu.br.' 
            };
        }
    }, [instancia, entrar, navegar]);

    return {
        contas,
        emAndamento,
        loginComMicrosoft,
        logoutTotal,
        processarLoginNoBackend,
        estaAutenticado
    };
}

