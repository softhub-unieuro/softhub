import { useMemo } from 'react';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';

/**
 * Hook utilitário APENAS para UX (mostrar/esconder botões e seções).
 * 🔥 SEGURANÇA REAL É NO BACKEND. Este hook é apenas para melhorar a experiência do usuário.
 */
export function usarPermissao(roleMinimoRequerido: string | null): boolean {
    const { usuario, configuracoes, roleVisualizacao } = usarAutenticacao();
    const { hierarquia_roles } = configuracoes;

    return useMemo(() => {
        if (!roleMinimoRequerido) return true;

        // Cargo efetivo (se estiver simulando, usa o simulado)
        const roleEfetiva = roleVisualizacao || usuario?.role;

        if (!roleEfetiva) return false;

        // 🛡️ REGRA DE OURO FRONTEND: O cargo 'ADMIN' ignora hierarquia e tem acesso total.
        // Se o usuário real (original) for ADMIN (mesmo via Bootstrap) ele passa se não estiver simulando algo menor.
        if (roleEfetiva === 'ADMIN') return true;

        const indiceUsuario = hierarquia_roles.indexOf(roleEfetiva);
        const indiceRequerido = hierarquia_roles.indexOf(roleMinimoRequerido);

        if (indiceUsuario === -1 || indiceRequerido === -1) {
            // Se a role mínima requerida não existe na hierarquia, bloqueamos por segurança.
            return false;
        }

        return indiceUsuario >= indiceRequerido;
    }, [usuario, roleMinimoRequerido, hierarquia_roles, roleVisualizacao]);
}

/**
 * Checa permissão específica na Matriz de Controle de Acesso (Ex: 'tarefas:criar').
 */
export function usarPermissaoAcesso(chavePermissao: string): boolean {
    const { usuario, configuracoes, roleVisualizacao } = usarAutenticacao();
    const { permissoes_roles } = configuracoes;

    // Se estiver simulando, a roleEfetiva é a simulada.
    // Se não, é a real.
    const roleEfetiva = roleVisualizacao || usuario?.role || 'MEMBRO';

    return useMemo(() => {
        // 🥇 ADMIN (Real ou Bootstrap sem simulação) sempre tem acesso total a qualquer chave na UI.
        if (roleEfetiva === 'ADMIN') return true;

        if (!permissoes_roles) return false;

        const permissoesDaRole = permissoes_roles[roleEfetiva] || {};
        const permissoesTodos = permissoes_roles['TODOS'] || {};

        // 🛡️ Suporte a curingas (*) também no Frontend
        if (permissoesDaRole['*'] === true || permissoesTodos['*'] === true) return true;

        const [modulo] = chavePermissao.split(':');
        if (permissoesDaRole[`${modulo}:*`] === true || permissoesTodos[`${modulo}:*`] === true) return true;

        // Check exato: 'modulo:acao' ou { modulo: { acao: true } }
        return permissoesDaRole[chavePermissao] === true || 
               permissoesTodos[chavePermissao] === true ||
               (permissoesDaRole[modulo] && typeof permissoesDaRole[modulo] === 'object' && (permissoesDaRole[modulo] as any)[chavePermissao.split(':')[1]] === true) ||
               (permissoesTodos[modulo] && typeof permissoesTodos[modulo] === 'object' && (permissoesTodos[modulo] as any)[chavePermissao.split(':')[1]] === true);

    }, [roleEfetiva, chavePermissao, permissoes_roles]);
}

/**
 * Checa se o usuário possui PELO MENOS UMA das permissões listadas.
 */
export function usarQualquerPermissaoAcesso(chaves: string[]): boolean {
    const { usuario, configuracoes, roleVisualizacao } = usarAutenticacao();
    const { permissoes_roles } = configuracoes;

    const roleEfetiva = roleVisualizacao || usuario?.role || 'MEMBRO';

    return useMemo(() => {
        if (roleEfetiva === 'ADMIN') return true;
        if (!permissoes_roles) return false;

        const permissoesDaRole = permissoes_roles[roleEfetiva] || {};
        const permissoesTodos = permissoes_roles['TODOS'] || {};

        if (permissoesDaRole['*'] === true || permissoesTodos['*'] === true) return true;

        for (const chave of chaves) {
            const [modulo] = chave.split(':');
            if (permissoesDaRole[`${modulo}:*`] === true || permissoesTodos[`${modulo}:*`] === true) return true;
            
            if (
                permissoesDaRole[chave] === true || 
                permissoesTodos[chave] === true ||
                (permissoesDaRole[modulo] && typeof permissoesDaRole[modulo] === 'object' && (permissoesDaRole[modulo] as any)[chave.split(':')[1]] === true) ||
                (permissoesTodos[modulo] && typeof permissoesTodos[modulo] === 'object' && (permissoesTodos[modulo] as any)[chave.split(':')[1]] === true)
            ) {
                return true;
            }
        }

        return false;
    }, [roleEfetiva, chaves.join(','), permissoes_roles]);
}
