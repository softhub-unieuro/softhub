/**
 * Middleware Unificado de Permissões (CODE-002).
 * Consolida a lógica de verificação de permissões do sistema.
 */

import { Context, Next } from 'hono';
import { autenticacaoRequerida, verificarPermissao } from './auth';

/**
 * Middleware que verifica se o usuário possui uma ou mais permissões específicas.
 * @param permissoes Uma permissão (string) ou lista de permissões.
 */
export function requerPermissao(permissoes: string | string[]) {
    // Reutiliza o middleware existente de auth.ts que já implementa a matriz de permissões
    return verificarPermissao(permissoes);
}

/**
 * Middleware que verifica se o usuário possui um nível hierárquico mínimo.
 * @param roleMinima O cargo mínimo exigido (ex: 'LIDER').
 */
export function requerCargo(roleMinima: string) {
    return autenticacaoRequerida(roleMinima);
}
