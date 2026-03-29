import { ambiente } from '@/configuracoes/ambiente';
import { logger } from '@/utilitarios/gerenciador-logs';

class ApiError extends Error {
    response?: { data: any, status: number };
    constructor(message: string, data: any, status: number) {
        super(message);
        this.response = { data, status };
    }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
    refreshSubscribers.map((callback) => callback(token));
    refreshSubscribers = [];
}

async function doFetch(method: string, url: string, data?: any, config?: any): Promise<any> {
    const rolePreview = sessionStorage.getItem('softhub_preview_role');
    const getHeaders = () => {
        const token = localStorage.getItem('softhub_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...config?.headers,
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (rolePreview) headers['X-Role-Simulada'] = rolePreview;
        return headers;
    };

    const fetchOptions: RequestInit = {
        method,
        headers: getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        keepalive: config?.keepalive,
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

    const isAuthRoute = url.includes('/api/auth') || url.includes('/api/configuracoes/publico');
    const isNoLogin = window.location.pathname === '/login';

    if (res.status === 401 && !isAuthRoute && !isNoLogin) {
        const refreshToken = localStorage.getItem('softhub_refresh_token');
        const userSaved = localStorage.getItem('softhub_usuario');
        const user = userSaved ? JSON.parse(userSaved) : null;

        if (!refreshToken || !user?.id) {
            tratarLogout();
            throw new ApiError('Sessão expirada.', { erro: 'Sem tokens de renovação' }, 401);
        }

        if (!isRefreshing) {
            isRefreshing = true;
            try {
                const refreshRes = await fetch(`${ambiente.apiUrl}/api/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken, usuarioId: user.id })
                });

                if (refreshRes.ok) {
                    const refreshData = await refreshRes.json();
                    localStorage.setItem('softhub_token', refreshData.token);
                    if (refreshData.refreshToken) localStorage.setItem('softhub_refresh_token', refreshData.refreshToken);
                    
                    isRefreshing = false;
                    onRefreshed(refreshData.token);
                    
                    // Refaz a requisição original com o novo token
                    return doFetch(method, url, data, config);
                } else {
                    throw new Error('Refresh falhou');
                }
            } catch (e) {
                isRefreshing = false;
                tratarLogout();
                throw new ApiError('Desconectado.', { erro: 'Falha na renovação da sessão' }, 401);
            }
        }

        // Aguarda o refresh em andamento
        return new Promise((resolve) => {
            refreshSubscribers.push((token: string) => {
                resolve(doFetch(method, url, data, config));
            });
        });
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

function tratarLogout() {
    logger.aviso('Sessão', 'Finalizando sessão por expiração ou erro crítico.');
    localStorage.removeItem('softhub_token');
    localStorage.removeItem('softhub_refresh_token');
    localStorage.removeItem('softhub_usuario');
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
}

export const api = {
    get: (url: string, config?: any) => doFetch('GET', url, undefined, config),
    post: (url: string, data?: any, config?: any) => doFetch('POST', url, data, config),
    put: (url: string, data?: any, config?: any) => doFetch('PUT', url, data, config),
    patch: (url: string, data?: any, config?: any) => doFetch('PATCH', url, data, config),
    delete: (url: string, config?: any) => doFetch('DELETE', url, undefined, config),
};
