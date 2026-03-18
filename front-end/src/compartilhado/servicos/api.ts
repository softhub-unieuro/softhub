import { ambiente } from '@/configuracoes/ambiente';
import { logger } from '@/utilitarios/gerenciador-logs';

class ApiError extends Error {
    response?: { data: any, status: number };
    constructor(message: string, data: any, status: number) {
        super(message);
        this.response = { data, status };
    }
}

async function doFetch(method: string, url: string, data?: any, config?: any) {
    const token = localStorage.getItem('softhub_token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...config?.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchOptions: RequestInit = {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
    };

    let fullUrl = url.startsWith('http') ? url : `${ambiente.apiUrl}${url}`;

    if (config?.params) {
        const query = new URLSearchParams();
        Object.entries(config.params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) query.append(key, String(value));
        });
        const separator = fullUrl.includes('?') ? '&' : '?';
        fullUrl += `${separator}${query.toString()}`;
    }

    const res = await fetch(fullUrl, fetchOptions);

    // Redireciona para login se token expirar (401), exceto em rotas de autenticação ou públicas
    const isAuthRoute = url.includes('/api/auth') || url.includes('/api/configuracoes/publico');
    const isNoLogin = typeof window !== 'undefined' && window.location.pathname === '/login';

    if (res.status === 401 && !isAuthRoute && !isNoLogin) {
        logger.aviso('API', 'Sessão expirada (401). Redirecionando para login.');
        localStorage.removeItem('softhub_token');
        localStorage.removeItem('softhub_usuario');
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
        throw new ApiError('Não autorizado', { erro: 'Não autorizado' }, 401);
    }

    let resData;
    try {
        // Tenta fazer o parse JSON
        resData = await res.json();
    } catch {
        resData = null;
    }

    if (!res.ok) {
        throw new ApiError(`Erro HTTP ${res.status}`, resData, res.status);
    }

    // Formato retrocompatível com a codebase legada (sem axios)
    return { data: resData, status: res.status };
}

export const api = {
    get: (url: string, config?: any) => doFetch('GET', url, undefined, config),
    post: (url: string, data?: any, config?: any) => doFetch('POST', url, data, config),
    put: (url: string, data?: any, config?: any) => doFetch('PUT', url, data, config),
    patch: (url: string, data?: any, config?: any) => doFetch('PATCH', url, data, config),
    delete: (url: string, config?: any) => doFetch('DELETE', url, undefined, config),
};
