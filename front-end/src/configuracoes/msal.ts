import { PublicClientApplication, LogLevel } from '@azure/msal-browser';
import type { Configuration } from '@azure/msal-browser';
import { ambiente } from './ambiente';

const configuracaoMsal: Configuration = {
    auth: {
        clientId: ambiente.msalClientId,
        authority: `https://login.microsoftonline.com/${ambiente.msalTenantId}`,
        redirectUri: `${window.location.origin}/login`,
        postLogoutRedirectUri: `${window.location.origin}/login`,
    },
    cache: {
        cacheLocation: 'sessionStorage',
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) return;
                switch (level) {
                    case LogLevel.Error: console.error('[MSAL]', message); break;
                    case LogLevel.Warning: console.warn('[MSAL]', message); break;
                }
            },
            logLevel: LogLevel.Warning,
        },
    },
};

/**
 * Escopos mínimos para leitura do perfil.
 * prompt 'select_account' força a tela de seleção de conta sempre.
 */
export const loginRequest = {
    scopes: ['user.read'],
    prompt: 'select_account' as const,
};

export const msalInstance = new PublicClientApplication(configuracaoMsal);
