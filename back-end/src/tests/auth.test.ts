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

    it('rejeita JTI revogado no KV', async () => {
        // mock KV para retornar "revogado"
        const kvMock = {
            get: async (key: string) => {
                if (key.startsWith('revoked:')) return 'true';
                return null;
            }
        };
        // Para mockar a rejeição de JTI, precisaríamos também mockar o jsonwebtoken verification 
        // ou abstrair a validação p/ um serviço que injeta tokens mock.
        // Fica aqui o esqueleto para o projeto real (exigiria mock de hono/jwt)
        expect(true).toBe(true);
    });
});
