import { useState, useCallback } from 'react';
import { api } from '../../../compartilhado/servicos/api';
import { usarAutenticacao } from '../../../contexto/ContextoAutenticacao';
import { useNavigate } from 'react-router';
import { logger } from '../../../utilitarios/gerenciador-logs';

/**
 * Hook para o fluxo de login tradicional (Email + Senha).
 * Utilizado como fallback ou para contas de serviço/admin.
 */
export function usarAutenticacaoLocal() {
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const { entrar } = usarAutenticacao();
    const navigate = useNavigate();

    const loginLocal = useCallback(async (email: string, senha: string) => {
        setCarregando(true);
        setErro(null);

        try {
            const response = await api.post('/api/auth/local', { email, senha });
            const { usuario, token, refreshToken } = response.data;

            if (refreshToken) {
                localStorage.setItem('softhub_refresh_token', refreshToken);
            }

            entrar(usuario, token);
            navigate('/app/dashboard', { replace: true });
        } catch (error: any) {
            const msg = error.response?.data?.erro || 'E-mail ou senha incorretos.';
            setErro(msg);
            logger.warn('AuthLocal', 'Falha no login local', { email, erro: msg });
        } finally {
            setCarregando(false);
        }
    }, [entrar, navigate]);

    return {
        loginLocal,
        carregando,
        erro,
        setErro
    };
}
