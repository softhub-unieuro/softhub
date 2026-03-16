import { ambiente } from \'@/configuracoes/ambiente\';
import { logger } from \'@/utilitarios/gerenciador-logs\';

class ApiError extends Error {
    response?: { data: any, status: number };
    constructor(message: string, data: any, status: number) {
        super(message);
        this.response = { data, status };
    }
}

async function doFetch(method: string, url: string, data?: any, config?: any) {
    const token = localStorage.getItem(\'softhub_token\');
    const headers: Record<string, string> = {
        \'Content-Type\': \'application/json\',
        ...config?.headers,
    };

    if (token) {
        headers[\'Authorization\'] = `Bearer ${token}`;\
    }

    const fetchOptions: RequestInit = {
        method,
        headers,
    };

    let fullUrl = url.startsWith(\'http\') ? url : `${ambiente.apiUrl}${url}`;

    if (method === \'GET\' || method === \'DELETE\') {
        if (config?.params) {
            const query = new URLSearchParams(config.params);
            fullUrl += `?${query.toString()}`;\
        }
    } else { // POST, PUT, PATCH
        if (data) {
            fetchOptions.body = JSON.stringify(data);
        }
    }

    const res = await fetch(fullUrl, fetchOptions);

    const isAuthRoute = url.includes(\'/api/auth\') || url.includes(\'/api/configuracoes/publico\');
    const isNoLogin = typeof window !== \'undefined\' && window.location.pathname === \'/login\';

    if (res.status === 401 && !isAuthRoute && !isNoLogin) {
        logger.aviso(\'API\', \'Sessão expirada (401). Redirecionando para login.\');
        localStorage.removeItem(\'softhub_token\');
        localStorage.removeItem(\'softhub_usuario\');
        if (typeof window !== \'undefined\') {
            window.location.href = \'/login\';
        }
        throw new ApiError(\'Não autorizado\', { erro: \'Não autorizado\' }, 401);
    }

    let resData;
    try {
        resData = await res.json();
    } catch {
        resData = null;
    }

    if (!res.ok) {
        throw new ApiError(`Erro HTTP ${res.status}`, resData, res.status);
    }

    return { data: resData, status: res.status };
}

export const api = {
    get: (url: string, config?: any) => doFetch(\'GET\', url, undefined, config),
    post: (url: string, data?: any, config?: any) => doFetch(\'POST\', url, data, config),
    put: (url: string, data?: any, config?: any) => doFetch(\'PUT\', url, data, config),
    patch: (url: string, data?: any, config?: any) => doFetch(\'PATCH\', url, data, config),
    delete: (url: string, config?: any) => doFetch(\'DELETE\', url, undefined, config),
};
