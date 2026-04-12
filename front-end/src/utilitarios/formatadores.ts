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
    const m = Math.round(minutos % 60);

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
 * Formata a descrição de um evento do histórico de tarefa de forma amigável (Workflow 29).
 * Converte chaves técnicas e objetos JSON em sentenças legíveis em PT-BR.
 * 
 * @param campo - Identificador técnico da mudança (ex: 'status', 'TAREFA_CHECKLIST_ALTERADO')
 * @param anterior - Valor antes da mudança (pode ser string ou JSON stringificado)
 * @param novo - Valor após a mudança (pode ser string ou JSON stringificado)
 * @returns {string} Descrição legível da atividade
 */
export function formatarEventoHistorico(campo: string, anterior: string, novo: string): string {
    // 1. Dicionário de traduções de valores canônicos
    const labels: Record<string, Record<string, string>> = {
        status: {
            backlog: 'Backlog',
            todo: 'A Fazer',
            in_progress: 'Em Andamento',
            em_revisao: 'Em Revisão',
            concluida: 'Concluída'
        },
        prioridade: {
            urgente: 'Urgente',
            alta: 'Alta',
            media: 'Média',
            baixa: 'Baixa'
        }
    };

    // 2. Dicionário de campos comuns
    const nomesCampos: Record<string, string> = {
        status: 'o status',
        prioridade: 'a prioridade',
        titulo: 'o título',
        descricao: 'a descrição',
        responsavel: 'o responsável'
    };

    /**
     * Tenta converter uma string que pode ser JSON em um objeto legível.
     */
    const tratarValor = (v: string, campoParente?: string): any => {
        if (!v || v === 'null') return null;
        try {
            const obj = JSON.parse(v);
            if (typeof obj === 'object' && obj !== null) {
                // Se o objeto tiver chaves de status ou prioridade, tentamos traduzir
                const entries = Object.entries(obj);
                if (entries.length === 1) {
                    const [key, val] = entries[0];
                    if (typeof val === 'string') {
                        return labels[key]?.[val] ?? val;
                    }
                }

                if (obj.concluido !== undefined) return obj.concluido ? 'concluído' : 'pendente';
                if (obj.texto !== undefined) return obj.texto;
                if (obj.nome !== undefined) return obj.nome;
                if (obj.status !== undefined) return labels.status[obj.status] ?? obj.status;
                if (obj.prioridade !== undefined) return labels.prioridade[obj.prioridade] ?? obj.prioridade;
                
                // Fallback: se for objeto, tenta retornar os valores como string
                return JSON.stringify(obj);
            }
            return obj;
        } catch {
            return v;
        }
    };

    // 3. Tratamento especial para eventos de Checklist (Padrão: TAREFA_CHECKLIST_XXX)
    if (campo.includes('TAREFA_CHECKLIST')) {
        const vAnter = tratarValor(anterior);
        const vNovo = tratarValor(novo);

        if (campo === 'TAREFA_CHECKLIST_ADICIONADO') {
            return `adicionou o item "${vNovo}" ao checklist`;
        }
        if (campo === 'TAREFA_CHECKLIST_REMOVIDO') {
            return `removeu o item "${vAnter}" do checklist`;
        }
        if (campo === 'TAREFA_CHECKLIST_ALTERADO') {
            if (vAnter === vNovo) return `atualizou um item do checklist`;
            return `marcou um item do checklist como ${vNovo}`;
        }
        if (campo === 'TAREFA_CHECKLIST_EDICAO') {
            return `renomeou um item do checklist para "${vNovo}"`;
        }
    }

    // 4. Tratamento para TAREFA_MOVIDA (Log unificado)
    if (campo === 'TAREFA_MOVIDA') {
        const vAnter = tratarValor(anterior);
        const vNovo = tratarValor(novo);
        return `moveu a tarefa de "${vAnter}" para "${vNovo}"`;
    }

    // 5. Tratamento de Comentários
    if (campo.startsWith('TAREFA_COMENTARIO')) {
        if (campo === 'TAREFA_COMENTADA') return 'adicionou um comentário';
        if (campo === 'TAREFA_COMENTARIO_EDITADO') return 'editou um comentário';
        if (campo === 'TAREFA_COMENTARIO_REMOVIDO') return 'removeu um comentário';
    }

    // 6. Tratamento de Feedback
    if (campo === 'TAREFA_FEEDBACK_REGISTRADO') return 'registrou o feedback de mentoria';

    // 7. Tratamento padrão para alterações de campos da tabela 'tarefas'
    const campoAmigavel = nomesCampos[campo] || campo;
    let labelAnterior = labels[campo]?.[anterior] ?? anterior;
    let labelNovo = labels[campo]?.[novo] ?? novo;

    // Se os valores forem JSON (ex: responsavel_id alterado)
    if (typeof labelAnterior === 'string' && labelAnterior.startsWith('{')) labelAnterior = tratarValor(labelAnterior, campo);
    if (typeof labelNovo === 'string' && labelNovo.startsWith('{')) labelNovo = tratarValor(labelNovo, campo);

    if (!anterior || anterior === 'null') {
        const val = typeof labelNovo === 'object' ? JSON.stringify(labelNovo) : labelNovo;
        return `definiu ${campoAmigavel} como "${val}"`;
    }

    if (labelAnterior === labelNovo) {
        return `atualizou ${campoAmigavel}`;
    }

    const sAnter = typeof labelAnterior === 'object' ? JSON.stringify(labelAnterior) : labelAnterior;
    const sNovo = typeof labelNovo === 'object' ? JSON.stringify(labelNovo) : labelNovo;

    return `alterou ${campoAmigavel} de "${sAnter}" para "${sNovo}"`;
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