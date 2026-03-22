/**
 * Utilitário para proteção contra CSV Injection (SEC-001).
 * Escapa campos que contenham delimitadores, aspas ou caracteres de fórmula.
 */

export function escapeCsvField(value: any): string {
    if (value === null || value === undefined) return '';
    
    // Converte para string e limpa espaços extras
    let str = String(value).trim();

    // 1. Escapar aspas duplas (dobrando-as)
    const escaped = str.replace(/"/g, '""');

    // 2. Envolver em aspas se contiver caracteres "perigosos"
    // Delimitador (;), aspas ("), quebras de linha (\n ou \r) ou prefixos de fórmula (=, +, -, @)
    const perigosos = /[;,"\n\r=+\-@\t|]/;
    if (perigosos.test(escaped)) {
        return `"${escaped}"`;
    }

    return escaped;
}

/**
 * Gera uma linha de CSV a partir de um array de campos.
 */
export function gerarLinhaCsv(campos: any[]): string {
    return campos.map(escapeCsvField).join(';');
}
