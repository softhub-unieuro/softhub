/**
 * Utilitário de Sanitização de HTML (XSS Protection)
 * Remove tags e atributos perigosos de strings enviadas pelo usuário.
 */

const TAGS_PERMITIDAS = ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'];
const ATRIBUTOS_PERMITIDOS = ['class']; // Opcional: permitir classes de estilo se necessário

/**
 * Limpa uma string HTML mantendo apenas tags básicas.
 */
export function sanitizarHTML(html: string): string {
    if (!html) return '';

    // 1. Remove scripts inteiros
    let limpo = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 2. Remove todos os event handlers (onmouseover, onclick, etc) e javascript: links
    limpo = limpo.replace(/ on\w+="[^"]*"/gi, '');
    limpo = limpo.replace(/ on\w+='[^']*'/gi, '');
    limpo = limpo.replace(/href="javascript:[^"]*"/gi, 'href="#"');

    // 3. (Opcional) Poderíamos usar uma biblioteca real se estivéssemos em Node puro,
    // mas para Cloudflare Workers, um regex de whitelist é mais leve e seguro para o contexto.
    
    // Remove tags que não estão na whitelist
    // Nota: Esta é uma abordagem simplificada "whitelist".
    limpo = limpo.replace(/<(?!\/?(p|br|b|i|u|strong|em|ul|ol|li|h1|h2|h3)\b)[^>]+>/gi, '');

    return limpo.trim();
}

/**
 * Sanitiza campos de um objeto recursivamente (útil para payloads de formulário)
 */
export function sanitizarObjeto(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const novoObj: any = Array.isArray(obj) ? [] : {};
    
    for (const [chave, valor] of Object.entries(obj)) {
        if (typeof valor === 'string') {
            // Só sanitizar se parecer HTML (contém < ou >)
            novoObj[chave] = (valor.includes('<') || valor.includes('>')) 
                ? sanitizarHTML(valor) 
                : valor;
        } else if (typeof valor === 'object') {
            novoObj[chave] = sanitizarObjeto(valor);
        } else {
            novoObj[chave] = valor;
        }
    }
    
    return novoObj;
}
