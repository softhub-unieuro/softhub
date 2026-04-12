import { ambiente } from '@/configuracoes/ambiente';
import { logger } from '@/utilitarios/gerenciador-logs';

class ErroApi extends Error {
    resposta?: { dados: any, status: number };
    constructor(mensagem: string, dados: any, status: number) {
        super(mensagem);
        this.resposta = { dados, status };
    }
}

let estaAtualizando = false;
let inscritosAtualizacao: ((token: string) => void)[] = [];

/**
 * Notifica todos os inscritos que o token foi renovado.
 * @param token - Novo token de acesso
 */
function aoAtualizar(token: string) {
    inscritosAtualizacao.map((callback) => callback(token));
    inscritosAtualizacao = [];
}

/**
 * Executor central de requisições HTTP usando fetch nativo.
 * Implementa Refresh Token Rotation e tratamento de erros institucional.
 */
async function executarRequisicao(metodo: string, url: string, dados?: any, configuracao?: any): Promise<any> {
    const roleSimulada = sessionStorage.getItem('softhub_preview_role');
    
    const obterCabecalhos = () => {
        const token = localStorage.getItem('softhub_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...configuracao?.headers,
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (roleSimulada) headers['X-Role-Simulada'] = roleSimulada;
        return headers;
    };

    const asOpcoesFetch: RequestInit = {
        method: metodo,
        headers: obterCabecalhos(),
        body: dados ? JSON.stringify(dados) : undefined,
        keepalive: configuracao?.keepalive,
        signal: configuracao?.signal, // Suporte a cancelamento (AbortController)
    };

    let urlCompleta = url.startsWith('http') ? url : `${ambiente.apiUrl}${url}`;
    
    if (configuracao?.params) {
        const query = new URLSearchParams();
        Object.entries(configuracao.params).forEach(([chave, valor]) => {
            if (valor !== undefined && valor !== null) query.append(chave, String(valor));
        });
        const separador = urlCompleta.includes('?') ? '&' : '?';
        urlCompleta += `${separador}${query.toString()}`;
    }

    const resposta = await fetch(urlCompleta, asOpcoesFetch);

    const ehRotaAuth = url.includes('/api/auth') || url.includes('/api/configuracoes/publico');
    const estaNaTelaLogin = window.location.pathname === '/login';

    // 🔄 Lógica de Refresh Token (SEG-012)
    if (resposta.status === 401 && !ehRotaAuth && !estaNaTelaLogin) {
        const refreshToken = localStorage.getItem('softhub_refresh_token');
        const usuarioSalvo = localStorage.getItem('softhub_usuario');
        const usuario = usuarioSalvo ? JSON.parse(usuarioSalvo) : null;

        if (!refreshToken || !usuario?.id) {
            tratarLogout();
            throw new ErroApi('Sessão expirada.', { erro: 'Tokens de renovação ausentes' }, 401);
        }

        if (!estaAtualizando) {
            estaAtualizando = true;
            try {
                const respostaRefresh = await fetch(`${ambiente.apiUrl}/api/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken, usuarioId: usuario.id })
                });

                if (respostaRefresh.ok) {
                    const dadosRefresh = await respostaRefresh.json();
                    localStorage.setItem('softhub_token', dadosRefresh.token);
                    if (dadosRefresh.refreshToken) localStorage.setItem('softhub_refresh_token', dadosRefresh.refreshToken);
                    
                    estaAtualizando = false;
                    aoAtualizar(dadosRefresh.token);
                    
                    // Refaz a requisição original com o novo token
                    return executarRequisicao(metodo, url, dados, configuracao);
                } else {
                    throw new Error('Falha na rotação do token');
                }
            } catch (e) {
                estaAtualizando = false;
                tratarLogout();
                throw new ErroApi('Desconectado.', { erro: 'Não foi possível renovar sua sessão' }, 401);
            }
        }

        // Aguarda a renovação em andamento antes de tentar novamente
        return new Promise((resolve) => {
            inscritosAtualizacao.push((token: string) => {
                resolve(executarRequisicao(metodo, url, dados, configuracao));
            });
        });
    }

    let dadosResposta;
    try {
        dadosResposta = await resposta.json();
    } catch {
        dadosResposta = null;
    }

    if (!resposta.ok) {
        throw new ErroApi(`Erro HTTP ${resposta.status}`, dadosResposta, resposta.status);
    }

    return { data: dadosResposta, status: resposta.status };
}

/**
 * Limpa dados de sessão e redireciona para login.
 */
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
    get: (url: string, config?: any) => executarRequisicao('GET', url, undefined, config),
    post: (url: string, dados?: any, config?: any) => executarRequisicao('POST', url, dados, config),
    put: (url: string, dados?: any, config?: any) => executarRequisicao('PUT', url, dados, config),
    patch: (url: string, dados?: any, config?: any) => executarRequisicao('PATCH', url, dados, config),
    delete: (url: string, config?: any) => executarRequisicao('DELETE', url, undefined, config),
};

