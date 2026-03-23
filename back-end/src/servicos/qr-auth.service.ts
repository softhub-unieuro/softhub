import { log } from '../utilitarios/logger';
import { Env } from '../index';
import { createSessionForUser } from './servico-auth-base';

export type QrStatus = 'pending' | 'scanned' | 'confirmed' | 'expired' | 'used';

export interface QrTokenKV {
    status: QrStatus;
    user_id?: string;
    jwt_token?: string;       // JWT emitido para o Dispositivo A
    refresh_token?: string;   // Refresh JWT emitido para o Dispositivo A
    ip_origem: string;
    userAgent: string;
    criadoEm: string;
    expiresAt: string;
}

/**
 * Serviço de Autenticação QR Code (Estilo Discord/WhatsApp Web).
 * Implementa a transferência de sessão segura baseada em hash.
 */
export class QrAuthService {
    private static prefixo = 'qr_token:';

    private static async hashToken(token: string): Promise<string> {
        const msgUint8 = new TextEncoder().encode(token);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Gera um token aleatório seguro (32 bytes hex) e armazena seu hash no KV.
     */
    static async generateQrToken(c: any): Promise<{ token: string; expiresAt: string }> {
        const { softhub_kv } = c.env as Env;
        if (!softhub_kv) throw new Error('KV não disponível');

        // 1. Gerar token seguro (High Entropy)
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const tokenPlain = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
        
        // 2. Definir expiração (2 min - Auditoria Part 2)
        const agora = new Date();
        const expiresAt = new Date(agora.getTime() + 1000 * 120).toISOString(); 

        // 3. Salvar apenas o HASH no KV (Segurança)
        const tokenHash = await this.hashToken(tokenPlain);
        const dados: QrTokenKV = {
            status: 'pending',
            ip_origem: c.req.header('CF-Connecting-IP') ?? 'unknown',
            userAgent: c.req.header('User-Agent') ?? 'unknown',
            criadoEm: agora.toISOString(),
            expiresAt: expiresAt
        };

        await softhub_kv.put(`${this.prefixo}${tokenHash}`, JSON.stringify(dados), { expirationTtl: 120 });

        return { token: tokenPlain, expiresAt };
    }

    /**
     * Confirma o login no Dispositivo B (Autenticado).
     * Transcreve a identidade para o Dispositivo A via token QR.
     */
    static async confirmQrLogin(c: any, tokenPlain: string, authenticatedUser: any): Promise<boolean> {
        const { softhub_kv, DB } = c.env as Env;
        if (!softhub_kv) return false;

        const tokenHash = await this.hashToken(tokenPlain);
        const res = await softhub_kv.get(`${this.prefixo}${tokenHash}`);
        
        if (!res) return false;

        const dados = JSON.parse(res) as QrTokenKV;

        // Validação de estado e expiração (Checklist Part 2)
        const expirou = new Date(dados.expiresAt).getTime() < Date.now();
        if (expirou || dados.status !== 'pending' && dados.status !== 'scanned') {
            return false;
        }

        // 1. Emitir NOVA sessão independente para o Dispositivo A (Convergência Part 3)
        // O user no Dispositivo A terá seu próprio JWT.
        const sessaoAuth = await createSessionForUser(c, authenticatedUser, 'QR Token Sync');

        // 2. Atualização Atômica (Status: Confirmed)
        dados.status = 'confirmed';
        dados.user_id = authenticatedUser.id;
        dados.jwt_token = sessaoAuth.accessToken;
        dados.refresh_token = sessaoAuth.refreshToken;

        // No KV não há transação real, mas com expirationTtl e verificação inicial reduzimos race condition.
        await softhub_kv.put(`${this.prefixo}${tokenHash}`, JSON.stringify(dados), { expirationTtl: 120 });

        return true;
    }

    /**
     * Retorna o status atual do token para o SSE.
     */
    static async getQrTokenStatus(c: any, tokenPlain: string): Promise<QrTokenKV | null> {
        const { softhub_kv } = c.env as Env;
        if (!softhub_kv) return null;

        const tokenHash = await this.hashToken(tokenPlain);
        const res = await softhub_kv.get(`${this.prefixo}${tokenHash}`);
        
        if (!res) return null;
        return JSON.parse(res) as QrTokenKV;
    }

    /**
     * Marca o token como usado e remove os dados sensíveis (JWT) após o consumo pelo SSE.
     */
    static async markAsUsed(c: any, tokenPlain: string): Promise<void> {
        const { softhub_kv } = c.env as Env;
        if (!softhub_kv) return;

        const tokenHash = await this.hashToken(tokenPlain);
        const res = await softhub_kv.get(`${this.prefixo}${tokenHash}`);
        if (!res) return;

        const dados = JSON.parse(res) as QrTokenKV;
        dados.status = 'used';
        delete dados.jwt_token;
        delete dados.refresh_token;

        await softhub_kv.put(`${this.prefixo}${tokenHash}`, JSON.stringify(dados), { expirationTtl: 60 });
    }
}
