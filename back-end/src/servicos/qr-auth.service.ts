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
     * Gera um token aleatório seguro (32 bytes hex) e armazena seu estado no KV (Efêmero).
     */
    static async generateQrToken(c: any): Promise<{ token: string; expiresAt: string }> {
        const { softhub_kv } = c.env as Env;
        if (!softhub_kv) throw new Error('Cloudflare KV não disponível.');

        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const tokenPlain = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
        
        const agora = new Date();
        const ttl = 120; // 2 minutos
        const expiresAt = new Date(agora.getTime() + 1000 * ttl).toISOString();
        const tokenHash = await this.hashToken(tokenPlain);
        const chave = `${this.prefixo}${tokenHash}`;

        const dados: QrTokenKV = {
            status: 'pending',
            ip_origem: c.req.header('CF-Connecting-IP') ?? 'unknown',
            userAgent: c.req.header('User-Agent') ?? 'unknown',
            criadoEm: agora.toISOString(),
            expiresAt
        };

        // Salva no KV com expiração automática (Não toca no D1 se expirar sem uso)
        await softhub_kv.put(chave, JSON.stringify(dados), { expirationTtl: ttl });

        return { token: tokenPlain, expiresAt };
    }

    /**
     * Identifica que um dispositivo móvel escaneou o código.
     * Atualiza o status para 'scanned' no KV.
     */
    static async identifyQrScan(c: any, tokenPlain: string, userId: string): Promise<boolean> {
        const { softhub_kv } = c.env as Env;
        if (!softhub_kv) return false;

        const tokenHash = await this.hashToken(tokenPlain);
        const chave = `${this.prefixo}${tokenHash}`;
        
        const res = await softhub_kv.get(chave);
        if (!res) return false;

        const dados = JSON.parse(res) as QrTokenKV;
        if (dados.status !== 'pending') return true;

        dados.status = 'scanned';
        dados.user_id = userId;

        // Atualiza no KV mantendo a expiração original (aproximada)
        await softhub_kv.put(chave, JSON.stringify(dados), { expirationTtl: 120 });

        return true;
    }

    /**
     * Confirma o login no Dispositivo B (Autenticado).
     */
    static async confirmQrLogin(c: any, tokenPlain: string, authenticatedUser: any): Promise<boolean> {
        const { softhub_kv } = c.env as Env;
        if (!softhub_kv) return false;

        const tokenHash = await this.hashToken(tokenPlain);
        const chave = `${this.prefixo}${tokenHash}`;
        const res = await softhub_kv.get(chave);
        
        if (!res) return false;
        const dados = JSON.parse(res) as QrTokenKV;

        if (dados.status !== 'pending' && dados.status !== 'scanned') return false;

        // 1. Emitir nova sessão
        const sessaoAuth = await createSessionForUser(c, authenticatedUser, 'QR Token Sync');

        // 2. Atualizar no KV
        dados.status = 'confirmed';
        dados.user_id = authenticatedUser.id;
        dados.jwt_token = sessaoAuth.accessToken;
        dados.refresh_token = sessaoAuth.refreshToken;

        await softhub_kv.put(chave, JSON.stringify(dados), { expirationTtl: 60 }); // Mantém por mais 1 min para o Dispositivo A ler

        return true;
    }

    /**
     * Retorna o status atual do token do KV para o SSE.
     */
    static async getQrTokenStatus(c: any, tokenPlain: string): Promise<QrTokenKV | null> {
        const { softhub_kv } = c.env as Env;
        if (!softhub_kv) return null;

        const tokenHash = await this.hashToken(tokenPlain);
        const chave = `${this.prefixo}${tokenHash}`;
        
        const res = await softhub_kv.get(chave);
        if (!res) return null;

        return JSON.parse(res) as QrTokenKV;
    }

    /**
     * Marca o token como usado e remove do KV.
     */
    static async markAsUsed(c: any, tokenPlain: string): Promise<void> {
        const { softhub_kv } = c.env as Env;
        if (!softhub_kv) return;

        const tokenHash = await this.hashToken(tokenPlain);
        const chave = `${this.prefixo}${tokenHash}`;

        // Deleta do KV pois o fluxo foi concluído com sucesso
        await softhub_kv.delete(chave);
    }
}

