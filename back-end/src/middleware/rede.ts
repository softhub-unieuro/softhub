import { MiddlewareHandler } from 'hono';
import { Env } from '../index';
import { log } from '../utilitarios/logger';
import { verificarIpAutorizado } from '../servicos/servico-configuracoes';
import { verificarPermissaoManual } from './auth';

/**
 * Middleware para validar se o acesso vem da rede física da UNIEURO.
 */
export const validarRedeLocal: MiddlewareHandler<{ Bindings: Env, Variables: any }> = async (c, next) => {
    
    // 🛡️ REGRA DE EXCEÇÃO: Se o usuário tem permissão especial (ponto:registrar_fora_da_rede), ignora a trava de IP.
    const podeBaterPontoRemoto = await verificarPermissaoManual(c, 'ponto:registrar_fora_da_rede');
    if (podeBaterPontoRemoto) {
        return await next();
    }

    // Capture do IP do Cliente
    const cfIp = c.req.header('CF-Connecting-IP');
    const forwardedFor = c.req.header('x-forwarded-for')?.split(',')[0].trim();
    const realIp = c.req.header('x-real-ip');

    const ipClient = (cfIp || forwardedFor || realIp || '0.0.0.0').trim();

    // 🔍 Centralização da Lógica de Rede
    const permitido = await verificarIpAutorizado({ DB: c.env.DB, softhub_kv: c.env.softhub_kv }, ipClient);

    if (permitido) {
        return await next();
    } else {
        // Log de aviso para monitoramento de tentativas negadas
        log('warn', '[REDE] Acesso NEGADO', { 
            ipClient, 
            motivo: 'IP não está na whitelist ou rede não configurada (Block Mode)'
        });

        return c.json({ 
            erro: 'Acesso bloqueado por restrição de rede.', 
            detalhe: `O registro de ponto só é permitido dentro da rede física da UNIEURO. (IP Detectado: ${ipClient})` 
        }, 403);
    }
};
