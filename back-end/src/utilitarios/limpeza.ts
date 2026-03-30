import xss from 'xss';

/**
 * Utilitário de Sanitização de HTML (XSS Protection)
 * Remove tags e atributos perigosos de strings enviadas pelo usuário.
 * Especializado para ambientes sem DOM (Cloudflare Workers).
 */
export function sanitizarHTML(html: string): string {
    if (!html) return '';
    
    const opcoes = {
        whiteList: {
            p: [],
            br: [],
            b: [],
            i: [],
            u: [],
            strong: [],
            em: [],
            ul: [],
            ol: [],
            li: [],
            h1: [],
            h2: [],
            h3: []
        },
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script', 'style']
    };

    return xss(html, opcoes);
}
