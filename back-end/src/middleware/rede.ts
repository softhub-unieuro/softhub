import { MiddlewareHandler } from 'hono';
import { Env } from '../index';
import { log } from '../utilitarios/logger';
import { obterConfiguracao } from '../servicos/servico-configuracoes';
import { verificarPermissaoManual } from './auth';

/**
 * Middleware para validar se o acesso vem da rede física da UNIEURO.
 * 
 * Explicação Técnica:
 * 1. O IP local (10.9.x.x) nunca chegará ao servidor Cloudflare/Vercel.
 * 2. O servidor verá o IP Público da UNIEURO (ex: 200.252.1.35).
 * 3. Se a rede usar IPv6, o IP detectado será longo (ex: 2804:...).
 */
export const validarRedeLocal: MiddlewareHandler<{ Bindings: Env, Variables: any }> = async (c, next) => {
    
    // 🛡️ REGRA DE GOVERNANÇA: Se o usuário tem permissão especial, ignora a trava de IP.
    const podeBaterPontoRemoto = await verificarPermissaoManual(c, 'ponto:registrar_fora_da_rede');
    if (podeBaterPontoRemoto) {
        return await next();
    }

    // 1. Buscar IPs Autorizados no Banco de Dados
    // Garantimos que o retorno seja um array de strings limpas (sem espaços)
    const configIps = await obterConfiguracao(c.env, 'ips_autorizados_ponto') || [];
    const ipsAutorizados = (Array.isArray(configIps) ? configIps : [configIps])
        .map(ip => String(ip).trim())
        .filter(ip => ip.length > 0);
    
    // Se não houver IPs configurados no banco, permite todos (fallback de segurança)
    if (ipsAutorizados.length === 0) {
        return await next();
    }

    // 2. Captura robusta do IP do Cliente
    // Prioridade: Cloudflare -> X-Forwarded-For (primeiro da lista) -> X-Real-IP
    const cfIp = c.req.header('CF-Connecting-IP');
    const forwardedFor = c.req.header('x-forwarded-for')?.split(',')[0].trim();
    const realIp = c.req.header('x-real-ip');

    const ipClient = (cfIp || forwardedFor || realIp || 'desconhecido').trim();

    // 🔍 LOG DE DEBUG: Essencial para ver o IP real que o servidor está recebendo
    console.log(`[VALIDACAO REDE] IP Detectado: "${ipClient}" | IPs Permitidos:`, ipsAutorizados);

    // 3. Verificação de Permissão
    const permitido = ipsAutorizados.some(regra => {
        // Suporte a IP exato (200.252.1.35) ou prefixos de rede (200.252.)
        return ipClient === regra || ipClient.startsWith(regra);
    });

    if (permitido) {
        return await next();
    } else {
        // Log de aviso para monitoramento de tentativas negadas
        log('warn', '[REDE] Acesso NEGADO', { 
            ipClient, 
            motivo: 'IP não está na whitelist',
            ipsEsperados: ipsAutorizados 
        });

        return c.json({ 
            erro: 'Acesso bloqueado por restrição de rede.', 
            detalhe: `Seu dispositivo está conectado via IP ${ipClient}, que não pertence à rede autorizada da UNIEURO.` 
        }, 403);
    }
};
