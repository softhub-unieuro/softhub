/**
 * Formata uma string de data ISO para o padrão brasileiro: DD/MM/YY às HH:mm
 */
export function formatarDataHora(dataISO: string): string {
    if (!dataISO) return '';
    try {
        const data = new Date(dataISO);
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = String(data.getFullYear()).slice(-2);
        const hora = String(data.getHours()).padStart(2, '0');
        const minutos = String(data.getMinutes()).padStart(2, '0');
        return `${dia}/${mes}/${ano} às ${hora}:${minutos}`;
    } catch {
        return dataISO;
    }
}

/**
 * Converte minutos totais para o formato "Xh Ymin"
 */
export function formatarHoras(minutos: number): string {
    if (isNaN(minutos) || minutos < 0) return '0min';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
}
