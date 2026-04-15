/**
 * Utilitários para manipulação e validação de endereços IP e faixas CIDR.
 * Focado em simplicidade e performance para Cloudflare Workers.
 */

import { Context } from 'hono';

/**
 * Normaliza um endereço IP recebido.
 * Remove prefixos IPv6-mapped IPv4 (::ffff:) e mapeia localhost IPv6 (::1) para IPv4.
 */
export function normalizarIp(ip: string): string {
    if (!ip) return '0.0.0.0';
    let limpo = ip.trim();
    
    // Mapeamento de Localhost IPv6 para IPv4 para facilitar testes locais
    if (limpo === '::1') return '127.0.0.1';

    if (limpo.startsWith('::ffff:')) {
        limpo = limpo.replace('::ffff:', '');
    }
    return limpo;
}

/**
 * Captura o IP do cliente de forma centralizada e resiliente.
 * Prioriza headers do Cloudflare, depois Forwarded-For e por fim o IP direto.
 */
export function obterIpRequisicao(c: Context): string {
    const cfIp = c.req.header('CF-Connecting-IP');
    const forwardedFor = c.req.header('x-forwarded-for')?.split(',')[0].trim();
    const realIp = c.req.header('x-real-ip');
    
    // Fallback para remoteAddr se disponível (depende do runtime do Workers/Hono)
    const remoteAddr = (c.req as any).raw?.socket?.remoteAddress;

    const ipBruto = cfIp || forwardedFor || realIp || remoteAddr || '0.0.0.0';
    return normalizarIp(ipBruto);
}

/**
 * Converte um IP IPv4 em um número inteiro de 32 bits sem sinal.
 * Retorna null se não for um IPv4 válido.
 */
function ipv4ParaLong(ip: string): number | null {
    const partes = ip.split('.');
    if (partes.length !== 4) return null;
    
    let base = 0;
    for (const parte of partes) {
        const n = parseInt(parte, 10);
        if (isNaN(n) || n < 0 || n > 255) return null;
        base = (base << 8) + n;
    }
    return base >>> 0;
}

/**
 * Verifica se um endereço IP está dentro de uma faixa CIDR.
 * Suporta IPv4 (notação CIDR como 192.168.1.0/24) e IPv6 (prefixo simples).
 */
export function estaEmFaixaCIDR(ip: string, regra: string): boolean {
    const ipAlvo = normalizarIp(ip);
    const regraLimpa = regra.trim();

    // 1. Caso de correspondência exata
    if (ipAlvo === regraLimpa) return true;

    // 2. Lógica para IPv4 com CIDR (ex: 190.0.0.0/8)
    if (regraLimpa.includes('/') && !regraLimpa.includes(':')) {
        const [bloco, prefixoStr] = regraLimpa.split('/');
        const prefixo = parseInt(prefixoStr, 10);
        
        if (isNaN(prefixo) || prefixo < 0 || prefixo > 32) return false;

        const ipLong = ipv4ParaLong(ipAlvo);
        const blocoLong = ipv4ParaLong(bloco);

        if (ipLong === null || blocoLong === null) return false;

        if (prefixo === 0) return true; // 0.0.0.0/0 permite tudo

        // Máscara de rede: 32 - prefixo bits à direita como 0
        const mascara = prefixo === 0 ? 0 : (0xFFFFFFFF << (32 - prefixo)) >>> 0;
        const match = (ipLong & mascara) === (blocoLong & mascara);
        return match;
    }

    // 3. Lógica para IPv6 com CIDR (suporte essencial para /64)
    if (regraLimpa.includes(':') && regraLimpa.includes('/')) {
        const [bloco, prefixoStr] = regraLimpa.split('/');
        const prefixo = parseInt(prefixoStr, 10);
        
        // Atalho para o caso mais comum em redes residenciais/empresariais (prefixo /64)
        if (prefixo === 64) {
            const ipPartes = ipAlvo.split(':').filter(p => p.length > 0).slice(0, 4).join(':');
            const regraPartes = bloco.split(':').filter(p => p.length > 0).slice(0, 4).join(':');
            return ipPartes.startsWith(regraPartes);
        }
    }

    // 4. Lógica Mágica de UX (Auto-Sub-rede): Se o admin colocar um IP cru sem máscara,
    // nós convertemos automaticamente para abranger a rede do local inteiro!
    if (!regraLimpa.includes('/')) {
        if (regraLimpa.includes(':')) {
            // Expansão implícita para /64 (IPv6)
            const ipPartes = ipAlvo.split(':').filter(p => p.length > 0).slice(0, 4).join(':');
            const regraPartes = regraLimpa.split(':').filter(p => p.length > 0).slice(0, 4).join(':');
            if (ipPartes.length > 0 && ipPartes.startsWith(regraPartes)) return true;
        } else if (regraLimpa.includes('.')) {
            // Expansão implícita para /24 (IPv4)
            const ipLong = ipv4ParaLong(ipAlvo);
            const regraLong = ipv4ParaLong(regraLimpa);
            if (ipLong !== null && regraLong !== null) {
                const mascara24 = 0xFFFFFF00 >>> 0;
                if ((ipLong & mascara24) === (regraLong & mascara24)) return true;
            }
        }
    }

    // 5. Fallback para prefixo de string legatário
    if (ipAlvo.startsWith(regraLimpa)) return true;

    return false;
}

/**
 * Processa uma configuração de IPs (que pode ser string separada por vírgula ou array)
 * e retorna um array de strings limpas e válidas.
 */
export function processarListaIps(entrada: any): string[] {
    if (!entrada) return [];
    
    let lista: string[] = [];
    
    if (Array.isArray(entrada)) {
        lista = entrada.map(i => String(i));
    } else if (typeof entrada === 'string') {
        // Separa por vírgula, espaço ou nova linha
        lista = entrada.split(/[,\s\n]+/).filter(i => i.length > 0);
    } else {
        lista = [String(entrada)];
    }

    return lista.map(i => i.trim()).filter(i => i.length > 0);
}
