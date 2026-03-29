// A URL de fallback não deve ter a barra no final para evitar o problema da "barra dupla".
const url = import.meta.env.VITE_API || 'https://api.softhub.workers.dev';

if (!url) {
    console.error(
        '❌ Erro de configuração (Environment Variables):\n' +
        '   - VITE_API: URL da API inválida'
    );
    throw new Error('Variáveis de ambiente inválidas. Verifique o arquivo .env');
}

interface ConfiguracoesAmbiente {
    apiUrl: string;
    msalClientId: string;
    msalTenantId: string;
    IS_DEV: boolean;
    IS_PROD: boolean;
    IS_TEST: boolean;
}

export const ambiente: ConfiguracoesAmbiente = {
    apiUrl: url,
    msalClientId: import.meta.env.VITE_MSAL_CLIENT_ID || '',
    msalTenantId: import.meta.env.VITE_MSAL_TENANT_ID || '',
    IS_DEV: !!import.meta.env.DEV,
    IS_PROD: !!import.meta.env.PROD,
    IS_TEST: !!import.meta.env.VITEST_WORKER_ID,
};
