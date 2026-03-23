import { useMsal } from '@azure/msal-react';
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { loginRequest } from '../../../configuracoes/msal';
import { usarAutenticacao } from '../../../contexto/ContextoAutenticacao';
import { api } from '../../../compartilhado/servicos/api';
import { logger } from '../../../utilitarios/gerenciador-logs';

/**
 * Hook dedicado para o fluxo de autenticação MSAL (Checklist Frontend Part 4).
 */
export function usarMsalAuth() {
    const { instance, accounts, inProgress } = useMsal();
    const navigate = useNavigate();
    const { entrar, sair, estaAutenticado } = usarAutenticacao();

    /**
     * Inicia o fluxo de login via redirect (Mais seguro e PWA-friendly)
     */
    const loginComMicrosoft = useCallback(async () => {
        try {
            await instance.loginRedirect(loginRequest);
        } catch (error) {
            logger.erro('MSAL', 'Falha ao iniciar login redirect', error);
            throw error;
        }
    }, [instance]);

    /**
     * Realiza o logout total (App + Microsoft)
     */
    const logoutTotal = useCallback(async () => {
        try {
            // 1. Limpa sessão no backend
            await api.post('/api/auth/logout');

            // 2. Limpa contexto local
            sair();

            // 3. Logout na Microsoft (Checklist: Logout sincronizado)
            await instance.logoutRedirect({
                postLogoutRedirectUri: window.location.origin + '/login',
            });
        } catch (error) {
            logger.erro('MSAL', 'Erro durante logout parcial/total', error);
            // Mesmo com erro na MSAL, deslogamos localmente
            sair();
            navigate('/login');
        }
    }, [instance, sair, navigate]);

    /**
     * Processa o resultado do login e troca o token com o backend
     */
    const processarLoginNoBackend = useCallback(async (conta: any) => {
        try {
            // Adquire o token silenciosamente (Audit Checklist: acquireTokenSilent)
            const tokenResponse = await instance.acquireTokenSilent({
                ...loginRequest,
                account: conta
            });

            // Valida no nosso backend e emite JWT próprio (Checklist Backend Part 1)
            // Usamos apenas o idToken para validação de identidade e claims
            const response = await api.post('/api/auth/msal', {
                idToken: tokenResponse.idToken
            });

            const { usuario, token, refreshToken } = response.data;

            // Armazena tokens da sessão SoftHub
            if (refreshToken) localStorage.setItem('softhub_refresh_token', refreshToken);
            localStorage.setItem('token_acesso', token);

            entrar(usuario, token);
            navigate('/app/dashboard', { replace: true });

            return { sucesso: true };
        } catch (error: any) {
            logger.erro('MSAL', 'Falha ao sincronizar com backend', error);
            return { sucesso: false, erro: error.response?.data?.erro || 'Falha na validação institucional do servidor' };
        }
    }, [instance, entrar, navigate]);

    return {
        accounts,
        inProgress,
        loginComMicrosoft,
        logoutTotal,
        processarLoginNoBackend,
        estaAutenticado
    };
}
