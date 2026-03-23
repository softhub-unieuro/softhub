import { sign } from 'hono/jwt';
import { Env } from '../index';
import { log } from '../utilitarios/logger';

export interface UserSession {
    accessToken: string;
    refreshToken: string;
    usuario: any;
}

/**
 * Ponto de convergência para emissão de sessões (MSAL, QR, Senha).
 * Implementa Refresh Token Rotation (Checklist Part 3).
 */
export async function createSessionForUser(
    c: any, // Hono Context Bindings
    usuario: any,
    deviceInfo?: string,
    sessaoAnteriorId?: string
): Promise<UserSession> {
    const { DB, JWT_SECRET, softhub_kv } = c.env as Env;
    
    // 0. Rotar Sessão (Checklist SEG-012)
    if (sessaoAnteriorId) {
        await DB.prepare('DELETE FROM usuarios_sessoes WHERE id = ?').bind(sessaoAnteriorId).run();
    }
    
    // 1. Gerar JTI (ID Único da Sessão) para o Access Token
    const jti = crypto.randomUUID();
    
    // 2. Gerar Access Token (Duração curta)
    const accessToken = await sign(
        {
            id: usuario.id,
            role: usuario.role,
            email: usuario.email,
            jti: jti,
            versao_token: usuario.versao_token || 1,
            exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hora de acesso (SEG-011)
        },
        JWT_SECRET
    );

    // 3. Gerar Refresh Token de alta entropia (SEG-012)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const refreshToken = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    const refreshTokenHash = await hashString(refreshToken);

    // 4. Salvar Sessão no Banco (Suporte a Logout e Rotação)
    const sessaoId = crypto.randomUUID();
    const expiraEm = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(); // 30 dias

    await DB.prepare(
        'INSERT INTO usuarios_sessoes (id, usuario_id, refresh_token_hash, ip_endereco, user_agent, device_info, expira_em) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
        sessaoId,
        usuario.id,
        refreshTokenHash,
        c.req.header('CF-Connecting-IP') ?? 'unknown',
        c.req.header('User-Agent') ?? 'unknown',
        deviceInfo ?? null,
        expiraEm
    ).run();

    // 5. Cache de sessão no KV para acessos rápidos (Otimização)
    if (softhub_kv) {
        await softhub_kv.put(`sessao:${usuario.id}:${jti}`, 'ativa', { expirationTtl: 3600 });
    }

    return {
        accessToken,
        refreshToken,
        usuario
    };
}

/**
 * Função helper para hash (Cloudflare Workers nativo usa Web Crypto)
 */
async function hashString(str: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
