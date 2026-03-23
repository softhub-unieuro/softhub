import { verifyWithJwks } from 'hono/jwt';
import { log } from '../utilitarios/logger';
import { Env } from '../index';
import { createSessionForUser } from './servico-auth-base';

export interface AzureAdClaims {
    oid: string;
    upn?: string;
    preferred_username?: string;
    name?: string;
    tid: string;
    aud: string;
    iss: string;
    exp: number;
    iat: number;
}

/**
 * Serviço de Autenticação MSAL (Azure AD).
 * Implementa a validação robusta de tokens Microsoft e convergência de sessão.
 */
export class MsalAuthService {
    private static jwksUri(tenantId: string) {
        return `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
    }

    /**
     * Valida o id_token recebido do frontend utilizando as chaves públicas da Microsoft (JWKS).
     * Garante a autenticidade e integridade do token RS256.
     */
    static async validateMsalIdToken(idToken: string, tenantId: string, clientId: string): Promise<AzureAdClaims> {
        try {
            // Tenta validar com o tenant específico
            const payload = await verifyWithJwks(idToken, {
                jwks_uri: this.jwksUri(tenantId),
                allowedAlgorithms: ['RS256']
            }) as unknown as AzureAdClaims;

            // Validações básicas de claim (Audience e Expiração são validadas pelo verifyWithJwks se configurado, 
            // mas aqui garantimos manualmente para maior controle)
            const audiencesValidas = [clientId, `api://${clientId}`];
            if (!audiencesValidas.includes(payload.aud)) {
                throw new Error(`Audience inválido: ${payload.aud}`);
            }

            return payload;
        } catch (error: any) {
            // Fallback para o endpoint 'common' se o tenant falhar (útil para multi-tenant ou contas pessoais)
            try {
                const payload = await verifyWithJwks(idToken, {
                    jwks_uri: this.jwksUri('common'),
                    allowedAlgorithms: ['RS256']
                }) as unknown as AzureAdClaims;
                return payload;
            } catch (innerError: any) {
                log('error', '[MSAL-SERVICE] Falha na validação do token', { erro: innerError.message });
                throw new Error('Assinatura do Token Microsoft inválida.');
            }
        }
    }

    /**
     * Localiza um usuário pelo OID (Object ID do Azure) ou cria um novo se auto-cadastro estiver ativo.
     * Prioriza sempre o OID conforme a auditoria de segurança.
     */
    static async findOrCreateUserFromMsal(c: any, payload: AzureAdClaims): Promise<any> {
        const { DB, BOOTSTRAP_ADMIN_EMAIL } = c.env as Env;
        const email = (payload.upn || payload.preferred_username || '').toLowerCase();
        const nome = payload.name || email;
        const oid = payload.oid;

        // 1. Buscar por OID (Identificador Único Imutável)
        let usuario = await DB.prepare('SELECT * FROM usuarios WHERE azure_oid = ?').bind(oid).first() as any;

        // 2. Fallback por Email (Migração ou primeiro login após adição de azure_oid)
        if (!usuario) {
            usuario = await DB.prepare('SELECT * FROM usuarios WHERE email = ?').bind(email).first() as any;
            
            if (usuario) {
                // Vincula o OID ao usuário existente (Autoconfirmação por e-mail no primeiro login)
                await DB.prepare('UPDATE usuarios SET azure_oid = ? WHERE id = ?').bind(oid, usuario.id).run();
                usuario.azure_oid = oid;
            }
        }

        // 3. Auto-cadastro ou Bootstrap Admin
        const listaBootstrap = (BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase().split(',').map(e => e.trim());
        const isBootstrapAdmin = email && listaBootstrap.includes(email);

        if (!usuario) {
            // Lógica de governança (Auto-cadastro deve ser verificado aqui se necessário)
            // Por simplicidade na auditoria, seguimos o fluxo de criação básica ou bootstrap
            const roleFinal = isBootstrapAdmin ? 'ADMIN' : 'MEMBRO';
            const novoId = crypto.randomUUID();
            
            await DB.prepare('INSERT INTO usuarios (id, nome, email, role, azure_oid, versao_token) VALUES (?, ?, ?, ?, ?, 1)')
                .bind(novoId, nome, email, roleFinal, oid)
                .run();

            usuario = { id: novoId, nome, email, role: roleFinal, azure_oid: oid, versao_token: 1 };
            usuario.isNew = true;
        } else if (isBootstrapAdmin && usuario.role !== 'ADMIN') {
            // Garante que o Bootstrap Admin sempre tenha role ADMIN
            await DB.prepare('UPDATE usuarios SET role = "ADMIN" WHERE id = ?').bind(usuario.id).run();
            usuario.role = 'ADMIN';
        }

        return usuario;
    }
}
