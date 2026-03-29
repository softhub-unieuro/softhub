import DOMPurify from 'isomorphic-dompurify';

/**
 * Utilitário de Sanitização de HTML (XSS Protection)
 * Remove tags e atributos perigosos de strings enviadas pelo usuário
 * usando o padrão-ouro de sanitização no Edge.
 */
export function sanitizarHTML(html: string): string {
    if (!html) return '';
    
    // O cast `as string` é usado pois configuramos DOMPurify para retornar uma String
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
        ALLOWED_ATTR: []
    }) as string;
}
