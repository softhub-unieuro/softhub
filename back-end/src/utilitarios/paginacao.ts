import { Context } from 'hono';

export interface PaginacaoParams {
    limit: number;
    offset: number;
    page: number;
}

export interface MetaPaginacao {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

/**
 * Extrai parâmetros de paginação de uma requisição Hono.
 * Fallbacks padrão: page=1, limit=20.
 */
export function extrairPaginacao(c: Context): PaginacaoParams {
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(c.req.query('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    return { limit, offset, page };
}

/**
 * Formata a resposta paginada com metadados padrão.
 */
export function formatarRespostaPaginada<T>(dados: T[], total: number, params: PaginacaoParams) {
    const total_pages = Math.ceil(total / params.limit);

    return {
        dados,
        meta: {
            total,
            page: params.page,
            limit: params.limit,
            total_pages
        }
    };
}
