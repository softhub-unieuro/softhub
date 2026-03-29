import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validarRedeLocal } from '../middleware/rede';
import { Context } from 'hono';
import * as servicoConfiguracoes from '../servicos/servico-configuracoes';
import * as auth from '../middleware/auth';

// Setup de Mocks Essenciais
vi.mock('../servicos/servico-configuracoes');
vi.mock('../middleware/auth');
vi.mock('../utilitarios/logger', () => ({ log: vi.fn() }));

const criarContextoMock = (ipHeader: string = ''): Context<any> => {
    return {
        req: {
            header: (name: string) => {
                if (name.toLowerCase() === 'cf-connecting-ip') return ipHeader;
                return null;
            },
        },
        env: {},
        json: (data: any, status: number) => ({ data, status }),
    } as unknown as Context<any>;
};

describe('Middleware de Rede (IP Whitelist)', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Permite acesso quando o IP está na whitelist exata', async () => {
        vi.mocked(auth.verificarPermissaoManual).mockResolvedValue(false);
        vi.mocked(servicoConfiguracoes.obterConfiguracao).mockResolvedValue(['200.252.1.35']);
        
        const c = criarContextoMock('200.252.1.35');
        const next = vi.fn();
        
        await validarRedeLocal(c, next);
        
        expect(next).toHaveBeenCalledOnce();
    });

    it('Permite acesso baseado em prefixo de rede (Subnet String)', async () => {
        vi.mocked(auth.verificarPermissaoManual).mockResolvedValue(false);
        vi.mocked(servicoConfiguracoes.obterConfiguracao).mockResolvedValue(['200.252.1.']);
        
        const c = criarContextoMock('200.252.1.99');
        const next = vi.fn();
        
        await validarRedeLocal(c, next);
        
        expect(next).toHaveBeenCalledOnce();
    });

    it('Bloqueia IP desconhecido que tenta registrar ponto', async () => {
        vi.mocked(auth.verificarPermissaoManual).mockResolvedValue(false);
        vi.mocked(servicoConfiguracoes.obterConfiguracao).mockResolvedValue(['200.252.1.35']);
        
        const c = criarContextoMock('8.8.8.8'); // Hacker / 4G
        const next = vi.fn();
        
        const resposta = await validarRedeLocal(c, next) as any;
        
        expect(next).not.toHaveBeenCalled();
        expect(resposta.status).toBe(403);
        expect(resposta.data.erro).toBe('Acesso bloqueado por restrição de rede.');
    });

    it('Aplica Bypass Dinâmico (VIPs) permitindo acesso de qualquer IP', async () => {
        // Usuário com permissão especial 'ponto:registrar_fora_da_rede'
        vi.mocked(auth.verificarPermissaoManual).mockResolvedValue(true); 
        vi.mocked(servicoConfiguracoes.obterConfiguracao).mockResolvedValue(['200.252.1.35']);
        
        const c = criarContextoMock('172.16.0.12'); // IP fora da rede
        const next = vi.fn();
        
        await validarRedeLocal(c, next);
        
        // Verifica se a trava de IP foi ignorada graças ao Bypass
        expect(next).toHaveBeenCalledOnce();
    });

    it('Permite tudo se a whitelist no banco estiver vazia (Fallback Seguro para Localhost)', async () => {
        vi.mocked(auth.verificarPermissaoManual).mockResolvedValue(false);
        vi.mocked(servicoConfiguracoes.obterConfiguracao).mockResolvedValue([]); // BD Vazio
        
        const c = criarContextoMock('192.168.0.1');
        const next = vi.fn();
        
        await validarRedeLocal(c, next);
        
        expect(next).toHaveBeenCalledOnce();
    });
});
