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
     * Gera um token aleatório seguro (32 bytes hex) e armazena seu hash no D1.
     */
    static async generateQrToken(c: any): Promise<{ token: string; expiresAt: string }> {
        const { DB } = c.env as Env;
        if (!DB) throw new Error('D1 Database não disponível.');

        try {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            const tokenPlain = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
            
            const agora = new Date();
            const expiresAt = new Date(agora.getTime() + 1000 * 120).toISOString(); // 2 min
            const tokenHash = await this.hashToken(tokenPlain);

            await DB.prepare(
                'INSERT INTO tokens_qr (id, status, ip_origem, user_agent, expira_em) VALUES (?, ?, ?, ?, ?)'
            ).bind(
                tokenHash,
                'pending',
                c.req.header('CF-Connecting-IP') ?? 'unknown',
                c.req.header('User-Agent') ?? 'unknown',
                expiresAt
            ).run();

            return { token: tokenPlain, expiresAt };
        } catch (err: any) {
            log('error', '[QR-AUTH] Erro ao gerar/gravar token no D1', { erro: err.message });
            throw err;
        }
    }

    /**
     * Identifica que um dispositivo móvel escaneou o código.
     * Atualiza o status para 'scanned' no D1.
     */
    static async identifyQrScan(c: any, tokenPlain: string, userId: string): Promise<boolean> {
        const { DB } = c.env as Env;
        if (!DB) return false;

        const tokenHash = await this.hashToken(tokenPlain);
        
        const res = await DB.prepare('SELECT status, expira_em FROM tokens_qr WHERE id = ?').bind(tokenHash).first<any>();
        if (!res) return false;

        // Validação de expiração e status
        if (new Date(res.expira_em).getTime() < Date.now()) return false;
        if (res.status !== 'pending') return true; // Já pode estar scanned, ignoramos se for o caso

        await DB.prepare(
            'UPDATE tokens_qr SET status = "scanned", user_id = ? WHERE id = ?'
        ).bind(userId, tokenHash).run();

        return true;
    }

    /**
     * Confirma o login no Dispositivo B (Autenticado).
     */
    static async confirmQrLogin(c: any, tokenPlain: string, authenticatedUser: any): Promise<boolean> {
        const { DB } = c.env as Env;
        if (!DB) return false;

        const tokenHash = await this.hashToken(tokenPlain);
        const sessao = await DB.prepare('SELECT * FROM tokens_qr WHERE id = ?').bind(tokenHash).first<any>();
        
        if (!sessao) return false;

        // Validação de expiração
        if (new Date(sessao.expira_em).getTime() < Date.now()) return false;
        if (sessao.status !== 'pending' && sessao.status !== 'scanned') return false;

        // 1. Emitir nova sessão
        const sessaoAuth = await createSessionForUser(c, authenticatedUser, 'QR Token Sync');

        // 2. Atualizar no DB
        await DB.prepare(
            'UPDATE tokens_qr SET status = ?, user_id = ?, jwt_token = ?, refresh_token = ? WHERE id = ?'
        ).bind(
            'confirmed',
            authenticatedUser.id,
            sessaoAuth.accessToken,
            sessaoAuth.refreshToken,
            tokenHash
        ).run();

        return true;
    }

    /**
     * Retorna o status atual do token para o SSE.
     */
    static async getQrTokenStatus(c: any, tokenPlain: string): Promise<QrTokenKV | null> {
        const { DB } = c.env as Env;
        const tokenHash = await this.hashToken(tokenPlain);
        
        const res = await DB.prepare('SELECT * FROM tokens_qr WHERE id = ?').bind(tokenHash).first<any>();
        if (!res) return null;

        return {
            status: res.status as QrStatus,
            user_id: res.user_id,
            jwt_token: res.jwt_token,
            refresh_token: res.refresh_token,
            ip_origem: res.ip_origem,
            userAgent: res.user_agent,
            criadoEm: res.criado_em,
            expiresAt: res.expira_em
        };
    }

    /**
     * Marca o token como usado e remove os dados sensíveis (JWT).
     */
    static async markAsUsed(c: any, tokenPlain: string): Promise<void> {
        const { DB } = c.env as Env;
        const tokenHash = await this.hashToken(tokenPlain);

        await DB.prepare(
            'UPDATE tokens_qr SET status = "used", jwt_token = NULL, refresh_token = NULL WHERE id = ?'
        ).bind(tokenHash).run();
    }
}

