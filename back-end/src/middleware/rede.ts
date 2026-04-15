import { MiddlewareHandler } from 'hono';
import { Env } from '../index';
import { log } from '../utilitarios/logger';
import { verificarIpAutorizado, obterConfiguracao } from '../servicos/servico-configuracoes';
import { verificarPermissaoManual } from './auth';
import { normalizarIp } from '../utilitarios/rede-utils';

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

    let ipClient = normalizarIp(cfIp || forwardedFor || realIp || '0.0.0.0');

    // 🔍 Centralização da Lógica de Rede
    const permitido = await verificarIpAutorizado({ DB: c.env.DB, softhub_kv: c.env.softhub_kv }, ipClient);

    if (permitido) {
        return await next();
    } else {
        // 🛠️ DIAGNÓSTICO: Busca a lista atual para mostrar no log (útil para o admin debugar)
        const regrasAtivas = await obterConfiguracao({ DB: c.env.DB, softhub_kv: c.env.softhub_kv }, 'ips_autorizados_ponto');

        // Log de aviso para monitoramento de tentativas negadas com contexto completo
        log('warn', '[REDE] Acesso NEGADO', { 
            ipClient, 
            regrasConfiguradas: regrasAtivas,
            headers: {
                cf: cfIp,
                xfwd: forwardedFor,
                xreal: realIp
            }
        });

        return c.json({ 
            erro: 'Acesso bloqueado por restrição de rede.', 
            detalhe: `O registro de ponto só é permitido dentro da rede física da UNIEURO.`,
            diagnostico: {
                seu_ip: ipClient,
                está_vago: !regrasAtivas || (Array.isArray(regrasAtivas) && regrasAtivas.length === 0)
            }
        }, 403);
    }
};
