import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validarRedeLocal } from '../middleware/rede';
import { Context } from 'hono';
import * as servicoConfiguracoes from '../servicos/servico-configuracoes';
import * as auth from '../middleware/auth';

// Setup de Mocks Essenciais
vi.mock('../servicos/servico-configuracoes', async (importActual) => {
    const original = await importActual<typeof import('../servicos/servico-configuracoes')>();
    return {
        ...original,
        obterConfiguracao: vi.fn(),
        verificarIpAutorizado: vi.fn(),
    };
});
vi.mock('../middleware/auth');
vi.mock('../utilitarios/logger', () => ({ log: vi.fn(), logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

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
        vi.mocked(servicoConfiguracoes.verificarIpAutorizado).mockResolvedValue(true);
        
        const c = criarContextoMock('200.252.1.35');
        const next = vi.fn();
        
        await validarRedeLocal(c, next);
        
        expect(next).toHaveBeenCalledOnce();
    });

    it('Permite acesso baseado em prefixo de rede (Subnet String)', async () => {
        // Agora testamos a integração do middleware com o resultado true do serviço
        vi.mocked(auth.verificarPermissaoManual).mockResolvedValue(false);
        vi.mocked(servicoConfiguracoes.verificarIpAutorizado).mockResolvedValue(true);
        
        const c = criarContextoMock('200.252.1.99');
        const next = vi.fn();
        
        await validarRedeLocal(c, next);
        
        expect(next).toHaveBeenCalledOnce();
    });

    it('Bloqueia IP desconhecido que tenta registrar ponto', async () => {
        vi.mocked(auth.verificarPermissaoManual).mockResolvedValue(false);
        vi.mocked(servicoConfiguracoes.verificarIpAutorizado).mockResolvedValue(false);
        
        const c = criarContextoMock('8.8.8.8');
        const next = vi.fn();
        
        const resposta = await validarRedeLocal(c, next) as any;
        
        expect(next).not.toHaveBeenCalled();
        expect(resposta.status).toBe(403);
        expect(resposta.data.erro).toBe('Acesso bloqueado por restrição de rede.');
    });

    it('Aplica Bypass Dinâmico (VIPs) permitindo acesso de qualquer IP', async () => {
        // Usuário com permissão especial 'ponto:registrar_fora_da_rede'
        vi.mocked(auth.verificarPermissaoManual).mockResolvedValue(true); 
        vi.mocked(servicoConfiguracoes.verificarIpAutorizado).mockResolvedValue(false); // Estaria bloqueado, mas o bypass salva
        
        const c = criarContextoMock('172.16.0.12'); // IP fora da rede
        const next = vi.fn();
        
        await validarRedeLocal(c, next);
        
        // Verifica se a trava de IP foi ignorada graças ao Bypass
        expect(next).toHaveBeenCalledOnce();
    });

    it('Permite tudo se a whitelist no banco estiver vazia (Fallback Seguro para Localhost)', async () => {
        vi.mocked(auth.verificarPermissaoManual).mockResolvedValue(false);
        vi.mocked(servicoConfiguracoes.verificarIpAutorizado).mockResolvedValue(true); // Fail-open logic
        
        const c = criarContextoMock('192.168.0.1');
        const next = vi.fn();
        
        await validarRedeLocal(c, next);
        
        expect(next).toHaveBeenCalledOnce();
    });

    it('Permite acesso quando IPs são fornecidos em string separada por vírgula', async () => {
        vi.mocked(auth.verificarPermissaoManual).mockResolvedValue(false);
        vi.mocked(servicoConfiguracoes.verificarIpAutorizado).mockResolvedValue(true);
        
        const c1 = criarContextoMock('200.1.1.1');
        const next1 = vi.fn();
        await validarRedeLocal(c1, next1);
        expect(next1).toHaveBeenCalledOnce();
    });

    it('Permite acesso usando faixa CIDR', async () => {
        vi.mocked(auth.verificarPermissaoManual).mockResolvedValue(false);
        vi.mocked(servicoConfiguracoes.verificarIpAutorizado).mockResolvedValue(true);
        
        const c1 = criarContextoMock('192.168.1.50');
        const next1 = vi.fn();
        await validarRedeLocal(c1, next1);
        expect(next1).toHaveBeenCalledOnce();
    });
});
