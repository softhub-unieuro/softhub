import { describe, it, expect, vi } from 'vitest';
import { autenticacaoRequerida } from '../middleware/auth';
import { Context } from 'hono';

// Helpers para simular o Hono Context
const criarContextoMock = (authHeader: string | null = null, kvMock: any = null): Context<any> => {
    return {
        req: {
            header: (name: string) => name.toLowerCase() === 'authorization' ? authHeader : null,
        },
        env: {
            JWT_SECRET: 'segredo_teste',
            softhub_kv: kvMock,
            DB: {
                prepare: () => ({ bind: () => ({ first: async () => null }) })
            }
        },
        json: (data: any, status: number) => ({ data, status }),
        set: vi.fn(),
    } as unknown as Context<any>;
};

describe('Auth middleware', () => {
    it('rejeita requisições sem header de Authorization', async () => {
        const c = criarContextoMock();
        const next = vi.fn();
        const middleware = autenticacaoRequerida();
        
        const resposta = await middleware(c, next) as any;
        expect(resposta.status).toBe(401);
        expect(resposta.data.erro).toBe('Autenticação necessária.');
        expect(next).not.toHaveBeenCalled();
    });

    it('rejeita token malformado/expirado', async () => {
        const c = criarContextoMock('Bearer token_invalido_123');
        const next = vi.fn();
        const middleware = autenticacaoRequerida();
        
        const resposta = await middleware(c, next) as any;
        expect(resposta.status).toBe(401);
        expect(resposta.data.erro).toBe('Sessão expirada ou inválida.');
    });

    it('rejeita Sessão Encerrada por Nova Versão de Token (Logouts Globais)', async () => {
        // Simulando Payload com um token velho (versao 1) mas BD com versao 2
        const c = criarContextoMock('Bearer mock_jwt');
        c.env.DB.prepare = () => ({ bind: () => ({ first: async () => ({
            id: 'mock-id',
            role: 'MEMBRO',
            versao_token: 2 // O servidor já subiu a versão, token velho vai cair
        }) }) });

        // Mock para pular o verify do JWT
        vi.mock('hono/jwt', () => ({ verify: vi.fn().mockResolvedValue({ id: 'mock-id', versao_token: 1 }) }));

        const next = vi.fn();
        const { autenticacaoRequerida } = await import('../middleware/auth');
        const middleware = autenticacaoRequerida();
        
        const resposta = await middleware(c, next) as any;
        expect(resposta.status).toBe(401);
        expect(resposta.data.erro).toContain('encerrada');
        expect(next).not.toHaveBeenCalled();
    });

    it('rejeita JTI revogado no KV (Logout Individual)', async () => {
        const c = criarContextoMock('Bearer mock_jwt');
        c.env.DB.prepare = () => ({ bind: () => ({ first: async () => ({
            id: 'mock-id', role: 'MEMBRO', versao_token: 1
        }) }) });
        
        c.env.softhub_kv = {
            get: async (key: string) => {
                if (key === 'revoked:meu-jti-123') return 'true';
                return null;
            },
            put: vi.fn()
        };

        vi.mock('hono/jwt', () => ({ verify: vi.fn().mockResolvedValue({ id: 'mock-id', versao_token: 1, jti: 'meu-jti-123' }) }));
        
        const next = vi.fn();
        const { autenticacaoRequerida } = await import('../middleware/auth');
        const middleware = autenticacaoRequerida();
        
        const resposta = await middleware(c, next) as any;
        expect(resposta.status).toBe(401);
        expect(resposta.data.erro).toContain('revogada');
        expect(next).not.toHaveBeenCalled();
    });
});
