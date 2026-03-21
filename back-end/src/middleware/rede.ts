import { MiddlewareHandler } from 'hono';
import { Env } from '../index';
import { obterConfiguracao } from '../servicos/servico-configuracoes';
import { verificarPermissaoManual } from './auth';

/**
 * Middleware para validar se o acesso vem da rede física da UNIEURO.
 */
export const validarRedeLocal: MiddlewareHandler<{ Bindings: Env, Variables: any }> = async (c, next) => {
    // 🛡️ REGRA DE GOVERNANÇA: Se o usuário tem permissão para bater ponto fora da rede, pula a validação de IP.
    const podeBaterPontoRemoto = await verificarPermissaoManual(c, 'ponto:registrar_fora_da_rede');
    if (podeBaterPontoRemoto) {
        return await next();
    }

    // 1. Buscar IPs Autorizados (na Whitelist)
    const ipsAutorizados = await obterConfiguracao(c.env, 'ips_autorizados_ponto') || [];
    
    // Se não houver IPs configurados, permite todos (fallback de segurança flexível)
    if (ipsAutorizados.length === 0) {
        return await next();
    }

    const ipClient = c.req.header('CF-Connecting-IP') || 
                     c.req.header('x-forwarded-for')?.split(',')[0].trim() || 
                     'desconhecido';

    // Regras de validação:
    const permitido = (ipsAutorizados as string[]).some(regra => {
        // Suporte a IP exato ou prefixos (ex: 10.9.)
        return ipClient === regra || ipClient.startsWith(regra);
    });

    if (permitido) {
        await next();
    } else {
        console.warn(`[REDE] Acesso NEGADO para o IP ${ipClient}. Fora da whitelist configurada.`);
        return c.json({ 
            erro: 'Acesso bloqueado por restrição de rede.', 
            detalhe: 'Este dispositivo não está na lista de IPs autorizados para registro de ponto.' 
        }, 403);
    }
};