import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { usarPermissao, usarQualquerPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';

interface RotaProtegidaProps {
    children: ReactNode;
    roleMinimo?: string; // Mantido para compatibilidade onde estritamente necessário
    permissaoRequerida?: string;
}

/**
 * Guarda de rota que garante:
 * 1. Sessão restaurada do localStorage antes de tomar qualquer decisão
 * 2. Usuário autenticado — senão redireciona para /login guardando intenção original
 * 3. Role suficiente — senão redireciona para /app/dashboard
 */
export function RotaProtegida({ children, roleMinimo, permissaoRequerida }: RotaProtegidaProps) {
    const { estaAutenticado, carregando } = usarAutenticacao();
    const location = useLocation();
    const temPermissaoRole = usarPermissao(roleMinimo ?? null);

    const checkPermissoes = useMemo(() => {
        if (!permissaoRequerida) return [];
        return permissaoRequerida.split(',').map(p => p.trim());
    }, [permissaoRequerida]);

    const temPermissaoEspecifica = usarQualquerPermissaoAcesso(checkPermissoes);

    if (carregando) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            </div>
        );
    }

    if (!estaAutenticado) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (roleMinimo && !temPermissaoRole) {
        return <Navigate to="/app/dashboard" replace />;
    }

    if (permissaoRequerida && !temPermissaoEspecifica) {
        return <Navigate to="/app/dashboard" replace state={{ acessoNegado: true }} />;
    }

    return <>{children}</>;
}
