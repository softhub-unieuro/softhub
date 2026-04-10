/**
 * Utilitário para proteção contra CSV Injection (SEC-001).
 * Escapa campos que contenham delimitadores, aspas ou caracteres de fórmula.
 * 
 * @param {unknown} valor - O conteúdo a ser escapado
 * @returns {string} String segura para CSV
 */
export function escapeCsvField(valor: unknown): string {
    if (valor === null || valor === undefined) return '';
    
    // Converte para string e limpa espaços extras
    const str = String(valor).trim();

    // 1. Escapar aspas duplas (dobrando-as)
    const escapado = str.replace(/"/g, '""');

    // 2. Envolver em aspas se contiver caracteres "perigosos"
    // Delimitador (;), aspas ("), quebras de linha (\n ou \r) ou prefixos de fórmula (=, +, -, @)
    const perigosos = /[;,"\n\r=+\-@\t|]/;
    if (perigosos.test(escapado)) {
        return `"${escapado}"`;
    }

    return escapado;
}

/**
 * Gera uma linha de CSV a partir de um array de campos.
 * 
 * @param {unknown[]} campos - Lista de valores para as colunas
 * @returns {string} Linha formatada com ponto e vírgula
 */
export function gerarLinhaCsv(campos: unknown[]): string {
    return campos.map(escapeCsvField).join(';');
}

