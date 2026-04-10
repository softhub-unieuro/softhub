import { format, formatDistanceToNow, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata data e hora para exibição completa no fuso de Brasília.
 * @param {string | Date} data ISO 8601 com Z ou objeto Date
 * @returns {string} 05/03/25 às 14:30
 */
export function formatarDataHora(data: string | Date): string {
    const d = typeof data === 'string' ? new Date(data) : data;
    if (!isValid(d)) {
        return 'Data inválida';
    }
    
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d).replace(',', ' às');
}


/**
 * Retorna o tempo decorrido desde a data informada.
 * @param {string | Date} data ISO 8601 com Z ou objeto Date
 * @returns {string} há 5 minutos | há 2 horas
 */
export function formatarTempoAtras(data: string | Date): string {
    const d = typeof data === 'string' ? new Date(data) : data;
    if (!isValid(d)) {
        return 'Tempo inválido';
    }
    return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

/**
 * Converte valor numérico em minutos para horas decimais.
 * @param {number} minutos Ex: 125
 * @returns {string} 2h 5min
 */
export function formatarHoras(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;

    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;

    return `${h}h ${m}min`;
}

/**
 * Formata um valor numérico em centavos para exibição em BRL.
 * @param {number} centavos Valor em centavos (ex: 1990 = R$ 19,90)
 * @returns {string} Valor formatado em R$
 */
export function formatarReais(centavos: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(centavos / 100);
}

/**
 * Formata a descrição de um evento do histórico de tarefa.
 */
export function formatarEventoHistorico(campo: string, anterior: string, novo: string): string {
    const labels: Record<string, Record<string, string>> = {
        status: {
            a_fazer: 'A Fazer',
            em_andamento: 'Em Andamento',
            em_revisao: 'Em Revisão',
            testando: 'Testando',
            concluido: 'Concluido'
        },
        prioridade: {
            urgente: 'Urgente',
            alta: 'Alta',
            media: 'Media',
            baixa: 'Baixa'
        }
    };

    const nomesCampos: Record<string, string> = {
        status: 'o status',
        prioridade: 'a prioridade',
        titulo: 'o título',
        descricao: 'a descrição',
        responsavel: 'o responsável'
    };

    const campoAmigavel = nomesCampos[campo] || campo;
    const labelAnterior = labels[campo]?.[anterior] ?? anterior;
    const labelNovo = labels[campo]?.[novo] ?? novo;

    if (!anterior || anterior === 'null') {
        return `definiu ${campoAmigavel} como "${labelNovo}"`;
    }

    return `alterou ${campoAmigavel} de "${labelAnterior}" para "${labelNovo}"`;
}

/**
 * Pluraliza uma palavra baseada na quantidade.
 * @param {number} quantidade Valor numérico
 * @param {string} singular Forma singular
 * @param {string} plural Opcional. Forma plural (caso não seja apenas adicionar 's')
 * @returns {string} Singular ou Plural conforme a regra gramatical
 */
export function pluralizar(quantidade: number, singular: string, plural?: string): string {
    if (Math.abs(quantidade) === 1) {
        return singular;
    }
    return plural || `${singular}s`;
}