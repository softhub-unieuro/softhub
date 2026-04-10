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
    ehDonoReal?: boolean;
    escala_tipo?: string;
    escala_dias?: string | null;
}

export interface IConfiguracoesUX {
    hierarquia_roles: string[];
    permissoes_roles: Record<string, Record<string, boolean>>;
    labels_roles: Record<string, string>;
    dias_trabalho: number[];
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
 * Fornece dados do usuário, token e funções de gerenciamento de sessão.
 */
export function usarAutenticacao() {
    const contexto = useContext(ContextoAutenticacao);
    if (!contexto) throw new Error('usarAutenticacao deve ser usado dentro de ProvedorAutenticacao');

    // Calcula ehDonoReal em tempo real para segurança total na UI
    const ehDonoReal = contexto.usuarioEfetivo?.role === 'ADMIN' &&
        contexto.usuarioEfetivo?.ehDonoReal === true;

    return {
        ...contexto,
        usuario: contexto.usuarioEfetivo,
        ehDonoReal // Exposto para componentes usarem diretamente
    };
}

/**
 * Provedor do contexto de autenticação que envolve toda a aplicação.
 */
export function ProvedorAutenticacao({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem(CHAVE_TOKEN));
    const [usuarioOriginal, setUsuarioOriginal] = useState<Usuario | null>(() => {
        const salvo = localStorage.getItem(CHAVE_USUARIO);
        if (salvo) { try { return JSON.parse(salvo); } catch { return null; } }
        return null;
    });

    const [configuracoes, setConfiguracoes] = useState<IConfiguracoesUX>(() => {
        const salvo = localStorage.getItem(CHAVE_CONFIGS);
        if (salvo) { try { return JSON.parse(salvo); } catch { return { hierarquia_roles: [], permissoes_roles: {}, labels_roles: {}, dias_trabalho: [1, 2, 3, 4, 5] }; } }
        return { hierarquia_roles: [], permissoes_roles: {}, labels_roles: {}, dias_trabalho: [1, 2, 3, 4, 5] };
    });

    const [carregando, setCarregando] = useState(() => !!localStorage.getItem(CHAVE_TOKEN) && !localStorage.getItem(CHAVE_CONFIGS));
    const [projetoAtivoId, setProjetoAtivoIdInterno] = useState<string>(() => localStorage.getItem(CHAVE_PROJETO) || '');
    const [roleVisualizacao, setRoleVisualizacao] = useState<string | null>(() => sessionStorage.getItem(CHAVE_PREVIEW_ROLE));

    // Usuário calculado para a UI (considera simulação de cargo por administradores)
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

    /**
     * Finaliza a sessão do usuário e limpa todos os armazenamentos locais.
     */
    const sair = useCallback(() => {
        setUsuarioOriginal(null);
        setToken(null);
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
    }, []);

    /**
     * Sincroniza os dados do perfil atual com o servidor.
     */
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
                    ehDonoReal: data.perfil.role === 'ADMIN' && data.perfil.is_bootstrap !== false,
                    escala_tipo: data.perfil.escala_tipo,
                    escala_dias: data.perfil.escala_dias
                };
                setUsuarioOriginal(perfilAtualizado);
                localStorage.setItem(CHAVE_USUARIO, JSON.stringify(perfilAtualizado));
            }
        } catch (erro: any) {
            if (erro.resposta?.status === 401 || erro.resposta?.status === 404) sair();
        }
    }, [sair]);

    /**
     * Define uma role simulada para visualização (restrito a administradores).
     */
    const setRoleVisualizacaoProtegido = useCallback((role: string | null) => {
        if (usuarioOriginal?.role === 'ADMIN' || role === null) {
            setRoleVisualizacao(role);
            if (role) sessionStorage.setItem(CHAVE_PREVIEW_ROLE, role);
            else sessionStorage.removeItem(CHAVE_PREVIEW_ROLE);
        } else {
            logger.erro('Segurança', 'Usuário não tem permissão para simular cargos.');
        }
    }, [usuarioOriginal]);

    /**
     * Busca as configurações públicas e governança do servidor.
     */
    const buscarConfiguracoesPublicas = useCallback(async () => {
        try {
            const { data } = await api.get('/api/configuracoes/publico');
            const novasConfigs: IConfiguracoesUX = {
                hierarquia_roles: data.hierarquia_roles || [],
                permissoes_roles: data.permissoes_roles || {},
                labels_roles: data.labels_roles || {},
                dias_trabalho: data.dias_trabalho || [1, 2, 3, 4, 5],
            };

            const chavesMatrix = Object.keys(novasConfigs.permissoes_roles);
            let hierarquiaFinal = (novasConfigs.hierarquia_roles || []).filter(r => r === 'ADMIN' || chavesMatrix.includes(r));
            const faltantes = chavesMatrix.filter(k => k !== 'TODOS' && !hierarquiaFinal.includes(k));

            const indexAdmin = hierarquiaFinal.indexOf('ADMIN');
            if (indexAdmin !== -1) hierarquiaFinal.splice(indexAdmin, 0, ...faltantes);
            else hierarquiaFinal.push(...faltantes);

            novasConfigs.hierarquia_roles = Array.from(new Set(hierarquiaFinal));

            setConfiguracoes(novasConfigs);
            localStorage.setItem(CHAVE_CONFIGS, JSON.stringify(novasConfigs));
        } catch (erro) {
            logger.erro("Auth", "Falha ao carregar matriz de governança", erro);
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

    /**
     * Inicia a sessão no frontend com os dados recebidos do login.
     */
    const entrar = useCallback((novoUsuario: any, novoToken: string) => {
        logger.sucesso('Sessão', `Usuário conectado: ${novoUsuario?.email}`);

        const formatado: Usuario = {
            ...novoUsuario,
            ehDonoReal: novoUsuario.is_bootstrap === true
        };

        setUsuarioOriginal(formatado);
        setToken(novoToken);
        localStorage.setItem(CHAVE_TOKEN, novoToken);
        localStorage.setItem(CHAVE_USUARIO, JSON.stringify(formatado));

        sincronizarPerfil();
    }, [sincronizarPerfil]);

    const atualizarUsuarioLocalmente = useCallback((atualizado: Usuario) => {
        setUsuarioOriginal(atualizado);
        localStorage.setItem(CHAVE_USUARIO, JSON.stringify(atualizado));
    }, []);

    // Pulsação de presença para o ponto eletrônico (SEG-015)
    useEffect(() => {
        if (!token || !usuarioOriginal) return;
        const enviarPulsacao = async () => {
            try { await api.post('/api/ponto/presenca'); } catch (e) { /* Suprime logs silenciosos */ }
        };
        enviarPulsacao();
        const intervalo = setInterval(enviarPulsacao, 300000); // 5 minutos
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
            entrar,
            sair,
            sincronizarPerfil,
            atualizarUsuarioLocalmente,
        }}>
            {children}
        </ContextoAutenticacao.Provider>
    );
}

