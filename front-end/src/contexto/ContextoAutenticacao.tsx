import { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/compartilhado/servicos/api';
import { logger } from '@/utilitarios/gerenciador-logs';

export interface Usuario {
    id: string;
    nome: string;
    email: string;
    role: string;
    foto_perfil?: string;
    ehDonoReal?: boolean; // 🛡️ Flag vinda do Backend (Bootstrap)
}

export interface IConfiguracoesUX {
    hierarquia_roles: string[];
    permissoes_roles: Record<string, Record<string, boolean>>;
}

interface ContextoAutenticacaoContrato {
    usuario: Usuario | null; 
    usuarioEfetivo: Usuario | null; 
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
    sincronizarPerfil: () => Promise<void>;
    atualizarUsuarioLocalmente: (usuario: Usuario) => void;
}

export const ContextoAutenticacao = createContext<ContextoAutenticacaoContrato | null>(null);

const CHAVE_TOKEN = 'softhub_token';
const CHAVE_USUARIO = 'softhub_usuario';
const CHAVE_PROJETO = 'softhub_projeto_ativo';
const CHAVE_CONFIGS = 'softhub_configs_ux';
const CHAVE_PREVIEW_ROLE = 'softhub_preview_role';

/**
 * Hook central de autenticação e governança.
 */
export function usarAutenticacao() {
    const ctx = useContext(ContextoAutenticacao);
    if (!ctx) throw new Error('usarAutenticacao deve ser usado dentro de ProvedorAutenticacao');
    
    return {
        ...ctx,
        // O resto do sistema usa 'usuario' para checar permissões de UI.
        // Se estiver simulando, a role visualizada substitui a real.
        usuario: ctx.usuarioEfetivo 
    };
}

export function ProvedorAutenticacao({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem(CHAVE_TOKEN));
    const [usuarioOriginal, setUsuarioOriginal] = useState<Usuario | null>(() => {
        const salvo = localStorage.getItem(CHAVE_USUARIO);
        if (salvo) { try { return JSON.parse(salvo); } catch { return null; } }
        return null;
    });

    const [configuracoes, setConfiguracoes] = useState<IConfiguracoesUX>(() => {
        const salvo = localStorage.getItem(CHAVE_CONFIGS);
        if (salvo) { try { return JSON.parse(salvo); } catch { return { hierarquia_roles: [], permissoes_roles: {} }; } }
        return { hierarquia_roles: [], permissoes_roles: {} };
    });

    const [carregando, setCarregando] = useState(() => !!localStorage.getItem(CHAVE_TOKEN) && !localStorage.getItem(CHAVE_CONFIGS));
    const [projetoAtivoId, setProjetoAtivoIdInterno] = useState<string>(() => localStorage.getItem(CHAVE_PROJETO) || '');
    const [roleVisualizacao, setRoleVisualizacao] = useState<string | null>(() => sessionStorage.getItem(CHAVE_PREVIEW_ROLE));

    // Usuário calculado para a UI (considera simulação de cargo)
    const usuarioEfetivo = useMemo(() => {
        if (!usuarioOriginal) return null;
        if (!roleVisualizacao) return usuarioOriginal;
        return { ...usuarioOriginal, role: roleVisualizacao };
    }, [usuarioOriginal, roleVisualizacao]);

    const setProjetoAtivoId = useCallback((id: string) => {
        setProjetoAtivoIdInterno(id);
        if (id) localStorage.setItem(CHAVE_PROJETO, id);
        else localStorage.removeItem(CHAVE_PROJETO);
    }, []);

    const sair = useCallback(() => {
        setUsuarioOriginal(null);
        setToken(null);
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
    }, []);

    const sincronizarPerfil = useCallback(async () => {
        if (!localStorage.getItem(CHAVE_TOKEN)) return;
        try {
            const { data } = await api.get('/api/perfil/me');
            if (data.perfil) {
                const perfilAtualizado: Usuario = {
                    id: data.perfil.id,
                    nome: data.perfil.nome,
                    email: data.perfil.email,
                    role: data.perfil.role,
                    foto_perfil: data.perfil.foto_perfil,
                    ehDonoReal: data.perfil.role === 'ADMIN' && data.perfil.is_bootstrap !== false // Backend envia no /me
                };
                setUsuarioOriginal(perfilAtualizado);
                localStorage.setItem(CHAVE_USUARIO, JSON.stringify(perfilAtualizado));
            }
        } catch (error: any) {
            if (error.response?.status === 401 || error.response?.status === 404) sair();
        }
    }, [sair]);

    const setRoleVisualizacaoProtegido = useCallback((role: string | null) => {
        // Apenas ADMINS reais (mesmo que no banco diga MEMBRO) podem simular.
        // O usuarioOriginal.role virá como 'ADMIN' se for Bootstrap.
        if (usuarioOriginal?.role === 'ADMIN' || role === null) {
            setRoleVisualizacao(role);
            if (role) sessionStorage.setItem(CHAVE_PREVIEW_ROLE, role);
            else sessionStorage.removeItem(CHAVE_PREVIEW_ROLE);
        } else {
            logger.erro('Segurança', 'Usuário não tem permissão para simular cargos.');
        }
    }, [usuarioOriginal]);

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
            sincronizarPerfil();
        } else {
            setCarregando(false);
        }
    }, [token, buscarConfiguracoesPublicas, sincronizarPerfil]);

    const entrar = useCallback((novoUsuario: Usuario, novoToken: string) => {
        logger.sucesso('Sessão', `Usuário conectado: ${novoUsuario?.email}`);
        setUsuarioOriginal(novoUsuario);
        setToken(novoToken);
        localStorage.setItem(CHAVE_TOKEN, novoToken);
        localStorage.setItem(CHAVE_USUARIO, JSON.stringify(novoUsuario));
        
        // Dispara sincronização imediata para verificar override de Bootstrap
        sincronizarPerfil();
    }, [sincronizarPerfil]);

    const atualizarUsuarioLocalmente = useCallback((atualizado: Usuario) => {
        setUsuarioOriginal(atualizado);
        localStorage.setItem(CHAVE_USUARIO, JSON.stringify(atualizado));
    }, []);

    useEffect(() => {
        if (!token || !usuarioOriginal) return;
        const enviarPulsacao = async () => {
            try { await api.post('/api/ponto/presenca'); } catch (e) { /* Suprime logs de batida de ponto */ }
        };
        enviarPulsacao();
        const intervalo = setInterval(enviarPulsacao, 45000);
        return () => clearInterval(intervalo);
    }, [token, usuarioOriginal]);

    return (
        <ContextoAutenticacao.Provider value={{
            usuario: usuarioOriginal, 
            usuarioEfetivo,
            token,
            estaAutenticado: !!token && !!usuarioOriginal,
            carregando,
            configuracoes,
            projetoAtivoId,
            roleVisualizacao,
            setProjetoAtivoId,
            setRoleVisualizacao: setRoleVisualizacaoProtegido,
            entrar, salir: sair, // Alinhado com a interface (sair)
            sincronizarPerfil,
            atualizarUsuarioLocalmente,
            sair // Alias importante
        } as any}>
            {children}
        </ContextoAutenticacao.Provider>
    );
}
