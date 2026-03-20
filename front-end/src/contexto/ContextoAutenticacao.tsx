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
const CHAVE_LEMBRAR = 'softhub_lembrar_membro';
const CHAVE_PREVIEW_ROLE = 'softhub_preview_role'; // Para que a API possa ler

/**
 * Hook central de autenticação e governança.
 */
export function usarAutenticacao() {
    const ctx = useContext(ContextoAutenticacao);
    if (!ctx) throw new Error('usarAutenticacao deve ser usado dentro de ProvedorAutenticacao');
    
    return {
        ...ctx,
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
    
    // Estado para "Ver como cargo" (Preview de role) - Persistido por sessão (sessionStorage)
    const [roleVisualizacao, setRoleVisualizacao] = useState<string | null>(() => sessionStorage.getItem(CHAVE_PREVIEW_ROLE));

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
                const perfilAtualizado = {
                    id: data.perfil.id,
                    nome: data.perfil.nome,
                    email: data.perfil.email,
                    role: data.perfil.role,
                    foto_perfil: data.perfil.foto_perfil
                };
                setUsuarioOriginal(perfilAtualizado);
                localStorage.setItem(CHAVE_USUARIO, JSON.stringify(perfilAtualizado));
            }
        } catch (error: any) {
            if (error.response?.status === 401 || error.response?.status === 404) sair();
        }
    }, [sair]);

    const setRoleVisualizacaoProtegido = useCallback((role: string | null) => {
        if (usuarioOriginal?.role === 'ADMIN' || role === null) {
            setRoleVisualizacao(role);
            if (role) sessionStorage.setItem(CHAVE_PREVIEW_ROLE, role);
            else sessionStorage.removeItem(CHAVE_PREVIEW_ROLE);
        } else {
            console.warn('[Segurança] Tentativa não autorizada de ativar previsualização de cargo.');
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
    }, []);

    const atualizarUsuarioLocalmente = useCallback((atualizado: Usuario) => {
        setUsuarioOriginal(atualizado);
        localStorage.setItem(CHAVE_USUARIO, JSON.stringify(atualizado));
    }, []);

    useEffect(() => {
        if (!token || !usuarioOriginal) return;
        const enviarPulsacao = async () => {
            try { await api.post('/api/ponto/presenca'); } catch (e) { console.warn('[Heartbeat] Falha na pulsação de presença'); }
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
            entrar, sair,
            sincronizarPerfil,
            atualizarUsuarioLocalmente,
        }}>
            {children}
        </ContextoAutenticacao.Provider>
    );
}
