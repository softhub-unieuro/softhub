import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/compartilhado/servicos/api';
import { logger } from '@/utilitarios/gerenciador-logs';

export interface Usuario {
    id: string;
    nome: string;
    email: string;
    role: string;
    foto_perfil?: string;
}

export interface IConfiguracoesUX {
    hierarquia_roles: string[];
    permissoes_roles: Record<string, Record<string, boolean>>;
}

interface ContextoAutenticacaoContrato {
    usuario: Usuario | null;
    token: string | null;
    estaAutenticado: boolean;
    carregando: boolean;
    configuracoes: IConfiguracoesUX;
    projetoAtivoId: string;
    roleVisualizacao: string | null;
    setProjetoAtivoId: (id: string) => void;
    setRoleVisualizacao: (role: string | null) => void;
    entrar: (usuario: Usuario, token: string) => void;
    sair: () => void;
    atualizarUsuarioLocalmente: (usuario: Usuario) => void;
}

export const ContextoAutenticacao = createContext<ContextoAutenticacaoContrato | null>(null);

/**
 * Hook central de autenticação e governança.
 * Substitui o antigo 'usarAutenticacaoContexto' e o duplicado em 'autenticacao/hooks'.
 */
export function usarAutenticacao() {
    const ctx = useContext(ContextoAutenticacao);
    if (!ctx) throw new Error('usarAutenticacao deve ser usado dentro de ProvedorAutenticacao');
    return ctx;
}

const CHAVE_TOKEN = 'softhub_token';
const CHAVE_USUARIO = 'softhub_usuario';
const CHAVE_PROJETO = 'softhub_projeto_ativo';
const CHAVE_CONFIGS = 'softhub_configs_ux';
const CHAVE_LEMBRAR = 'softhub_lembrar_membro';

/**
 * ProvedorAutenticacao NÃO usa useNavigate — ele vive fora do RouterProvider.
 * A navegação após login é feita pelo componente ProcessadorLoginMsal
 * que fica DENTRO do router (em rotas.tsx).
 */
export function ProvedorAutenticacao({ children }: { children: ReactNode }) {
    // Restaura sessão do localStorage de forma SÍNCRONA no estado inicial
    const [token, setToken] = useState<string | null>(() => {
        return localStorage.getItem(CHAVE_TOKEN);
    });

    const [usuario, setUsuario] = useState<Usuario | null>(() => {
        const salvo = localStorage.getItem(CHAVE_USUARIO);
        if (salvo) {
            try { return JSON.parse(salvo); } catch { return null; }
        }
        return null;
    });

    const [configuracoes, setConfiguracoes] = useState<IConfiguracoesUX>(() => {
        const salvo = localStorage.getItem(CHAVE_CONFIGS);
        if (salvo) {
            try { return JSON.parse(salvo); } catch { return { hierarquia_roles: [], permissoes_roles: {} }; }
        }
        return { hierarquia_roles: [], permissoes_roles: {} };
    });

    // Se já temos usuário e configurações no cache, podemos começar sem loading
    const [carregando, setCarregando] = useState(() => {
        const temConfig = localStorage.getItem(CHAVE_CONFIGS);
        const temToken = localStorage.getItem(CHAVE_TOKEN);
        // Só carrega se tiver token mas não tiver configs ainda
        return !!temToken && !temConfig;
    });

    const [projetoAtivoId, setProjetoAtivoIdInterno] = useState<string>(() => {
        return localStorage.getItem(CHAVE_PROJETO) || '';
    });

    // Estado para "Ver como cargo" (Preview de role)
    const [roleVisualizacao, setRoleVisualizacao] = useState<string | null>(null);

    const setProjetoAtivoId = useCallback((id: string) => {
        setProjetoAtivoIdInterno(id);
        if (id) {
            localStorage.setItem(CHAVE_PROJETO, id);
        } else {
            localStorage.removeItem(CHAVE_PROJETO);
        }
    }, []);

    const setRoleVisualizacaoProtegido = useCallback((role: string | null) => {
        // Regra Crítica: Apenas quem é ADMIN REAL pode usar o modo de previsualização
        // Se role for null, estamos desativando o modo, o que é sempre permitido.
        if (usuario?.role === 'ADMIN' || role === null) {
            setRoleVisualizacao(role);
        } else {
            console.warn('[Segurança] Tentativa não autorizada de ativar previsualização de cargo.');
        }
    }, [usuario]);

    const buscarConfiguracoesPublicas = useCallback(async () => {
        try {
            const { data } = await api.get('/api/configuracoes/publico');
            const novasConfigs = {
                hierarquia_roles: data.hierarquia_roles || [],
                permissoes_roles: data.permissoes_roles || {},
            };
            setConfiguracoes(novasConfigs);
            localStorage.setItem(CHAVE_CONFIGS, JSON.stringify(novasConfigs));
        } catch (error) {
            console.error("[Auth] Falha ao carregar matriz de governança:", error);
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        if (token) {
            buscarConfiguracoesPublicas();
        } else {
            setCarregando(false);
        }
    }, [token, buscarConfiguracoesPublicas]);

    const entrar = useCallback((novoUsuario: Usuario, novoToken: string) => {
        logger.sucesso('Sessão', `Usuário conectado: ${novoUsuario?.email}`);
        if (!novoUsuario || !novoToken) {
            logger.erro('Auth', 'Tentativa de login com dados incompletos');
            return;
        }
        setUsuario(novoUsuario);
        setToken(novoToken);
        localStorage.setItem(CHAVE_TOKEN, novoToken);
        localStorage.setItem(CHAVE_USUARIO, JSON.stringify(novoUsuario));
        localStorage.setItem(CHAVE_LEMBRAR, 'true');
    }, []);

    const sair = useCallback(() => {
        setUsuario(null);
        setToken(null);
        localStorage.removeItem(CHAVE_TOKEN);
        localStorage.removeItem(CHAVE_USUARIO);
        localStorage.removeItem(CHAVE_CONFIGS);
        localStorage.removeItem(CHAVE_PROJETO);

        // Apenas redireciona localmente, sem deslogar da conta Microsoft global
        window.location.href = '/login';
    }, []);

    const atualizarUsuarioLocalmente = useCallback((atualizado: Usuario) => {
        setUsuario(atualizado);
        localStorage.setItem(CHAVE_USUARIO, JSON.stringify(atualizado));
    }, []);

    // Nunca retorne null aqui para evitar que o Outlet em rotas.tsx suma.
    // O RotaProtegida já cuida do estado de carregamento visual se necessário.

    /**
     * HEARTBEAT DE PRESENÇA (Sinal de Vida)
     * Mantém o usuário como 'online' no sistema enquanto a aba estiver aberta.
     */
    useEffect(() => {
        if (!token || !usuario) return;

        const enviarPulsacao = async () => {
            try {
                // Endpoint silencioso apenas para registrar sinal de vida
                await api.post('/api/ponto/presenca');
            } catch (e) {
                // Falha silenciosa para não incomodar o usuário
                console.warn('[Heartbeat] Falha na pulsação de presença');
            }
        };

        // Pulsação inicial
        enviarPulsacao();

        // Pulsação a cada 45 segundos (KV expira em 60s)
        const intervalo = setInterval(enviarPulsacao, 45000);
        
        return () => clearInterval(intervalo);
    }, [token, usuario]);

    return (
        <ContextoAutenticacao.Provider value={{
            usuario, token,
            estaAutenticado: !!token && !!usuario,
            carregando,
            configuracoes,
            projetoAtivoId,
            roleVisualizacao,
            setProjetoAtivoId,
            setRoleVisualizacao: setRoleVisualizacaoProtegido,
            entrar, sair,
            atualizarUsuarioLocalmente,
        }}>
            {children}
        </ContextoAutenticacao.Provider>
    );
}
