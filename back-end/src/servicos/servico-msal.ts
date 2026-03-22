import { log } from '../utilitarios/logger';

export interface AzureAdClaims {
    oid: string;  // ID único e imutável do usuário no Azure AD
    upn?: string;  // User Principal Name (email institucional)
    preferred_username?: string;  // Fallback do email
    name?: string;  // Nome para exibição
    tid: string;  // Tenant ID
    aud: string;  // Audience (deve ser nosso clientId)
    iss: string;  // Issuer (deve ser nosso tenant v2.0)
    exp: number;
    iat: number;
}

// ── JWKS URI do Azure AD ──────────────────────────────────────────────────────
export function getJwksUri(tenantId: string): string {
    return `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
}

// ── Validação das claims de negócio ───────────────────────────────────────────
export function validarClaims(
    payload: AzureAdClaims,
    tenantId: string,
    clientId: string,
    dominiosAutorizados: string[] = ['unieuro.com.br', 'unieuro.edu.br']
): string | null {
    // 1. Domínio (Critério Principal)
    const email = (payload.upn || payload.preferred_username || '').toLowerCase();
    const possuiDominioValido = dominiosAutorizados.some(d => email.endsWith(`@${d.toLowerCase()}`));

    if (!possuiDominioValido) {
        return `Domínio não autorizado: ${email}. Use seu e-mail institucional Unieuro.`;
    }

    // 2. Tenant (Flexível se o domínio for Unieuro)
    // Aceita o tenant configurado OU o tenant comum de organizações
    const tenantsAceitos = [tenantId, '9188040d-6c67-4c5b-b112-36a304b66dad']; // ID comum organizações/pessoal
    if (payload.tid !== tenantId && !tenantsAceitos.includes(payload.tid)) {
        log('warn', '[AUTH-MSAL] Tenant diferente detectado', { tid: payload.tid, email });
    }

    // 3. Audience
    const audiencesValidas = [clientId, `api://${clientId}`];
    if (!audiencesValidas.includes(payload.aud)) {
        return `Audience inválido: ${payload.aud}`;
    }

    // 4. Issuer (Aceita o tenant específico ou o comum v2.0)
    // A Microsoft envia issuers com IDs de tenant variáveis dependendo do tipo de conta
    if (!payload.iss.includes(tenantId) && !payload.iss.includes('9188040d-6c67-4c5b-b112-36a304b66dad') && !payload.iss.includes('v2.0')) {
         log('warn', '[AUTH-MSAL] Issuer não reconhecido', { iss: payload.iss, email });
    }

    // 5. Expiração
    const agora = Math.floor(Date.now() / 1000);
    if (payload.exp < agora) {
        return 'Token expirado. Tente logar novamente na Microsoft.';
    }

    return null;
}
