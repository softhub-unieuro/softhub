import { useMemo } from 'react';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';

/**
 * Hook utilitário APENAS para UX (mostrar/esconder botões e seções).
 *
 * ⚠️  SEGURANÇA REAL É SEMPRE FEITA NO BACKEND — este hook é somente para UI.
 *
 * Compara a role do usuário com uma role mínima requerida, baseado na hierarquia
 * de roles definida no banco de dados (configuracoes_sistema).
 *
 * Uso: const podeEditar = usarPermissao('LIDER');
 */
export function usarPermissao(roleMinimoRequerido: string | null): boolean {
    const { usuario, configuracoes, roleVisualizacao } = usarAutenticacao();
    const { hierarquia_roles } = configuracoes;

    return useMemo(() => {
        // Sem role mínimo requerido — qualquer autenticado tem acesso
        if (!roleMinimoRequerido) return true;

        // Se estiver em modo de previsualização, usa a role mockada
        const roleEfetiva = roleVisualizacao || usuario?.role;

        // Sem usuário ou sem role — nega
        if (!roleEfetiva) return false;

        // ADMIN sempre tem permissão total por hierarquia (cargo real ou visualizado)
        if (roleEfetiva === 'ADMIN') return true;

        const indiceUsuario = hierarquia_roles.indexOf(roleEfetiva);
        const indiceRequerido = hierarquia_roles.indexOf(roleMinimoRequerido);

        // Role inválido (não existe na hierarquia) — nega por segurança
        if (indiceUsuario === -1 || indiceRequerido === -1) return false;

        return indiceUsuario >= indiceRequerido;
    }, [usuario, roleMinimoRequerido, hierarquia_roles, roleVisualizacao]);
}


/**
 * Hook utilitário para checar uma permissão específica ativada na Matriz de Controle de Acesso.
 * As permissões são carregadas do contexto `ContextoConfiguracoes`.
 * @example const podeCriarTarefa = usarPermissaoAcesso('tarefas:criar');
 */
export function usarPermissaoAcesso(chavePermissao: string): boolean {
    const { usuario, configuracoes, roleVisualizacao } = usarAutenticacao();
    const { permissoes_roles } = configuracoes;
    const roleEfetiva = roleVisualizacao || usuario?.role || 'MEMBRO';

    // ADMIN sempre tem acesso total, independente da matriz.
    if (roleEfetiva === 'ADMIN') {
        return true;
    }

    // useMemo para evitar recálculos a cada renderização
    return useMemo(() => {
        if (!permissoes_roles) {
            return false; // Retorna false se as permissões ainda não foram carregadas
        }

        // Verifica se a permissão está habilitada para a role específica do usuário
        const temPermissaoRole = permissoes_roles[roleEfetiva]?.[chavePermissao] === true;

        // Verifica se a permissão é universal (habilitada para 'TODOS')
        const temPermissaoUniversal = permissoes_roles['TODOS']?.[chavePermissao] === true;

        return temPermissaoRole || temPermissaoUniversal;

    }, [roleEfetiva, chavePermissao, permissoes_roles]);
}
