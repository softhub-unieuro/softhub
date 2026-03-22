import { log } from '../utilitarios/logger';

/**
 * Serviço de IA - Utiliza Cloudflare Workers AI (10k neurônios/dia grátis)
 * Modelos recomendados: @cf/meta/llama-3.1-8b-instruct ou @cf/mistral/mistral-7b-instruct-v0.1
 */

interface RespostaIA {
    conteudo: string;
    json?: any;
}

const DEFAULT_SYSTEM = `Você é o assistente inteligente do SoftHub, o ecossistema de gestão da Fábrica de Software - UNIEURO.

## Sua Missão
Apoiar os membros (estudantes e líderes) na organização de tarefas, justificativas de ponto e comunicação interna, mantendo o padrão de excelência da Fábrica.

## Regras de Comportamento
- Responda sempre em português brasileiro de forma técnica e clara.
- Seja direto e objetivo — vá direto ao ponto sem introduções vazias ou saudações.
- Não invente dados; baseie-se apenas no contexto fornecido (tarefas, avisos, justificativas).
- Não repita o prompt do usuário nas respostas.
- Estruture os resultados com Markdown para facilitar a leitura técnica (listas, negritos).

## Tom e Estilo
- Tom: Corporativo, técnico (voltado para desenvolvedores) e colaborativo.
- Evite frases de preenchimento como "Claro!", "Aqui está!", "Ótima escolha!".
- Quando solicitado a gerar conteúdo, produza algo pronto para uso imediato no sistema.`;

/**
 * Constrói o array de mensagens para o modelo
 */
const construirMensagens = (prompt: string, sistema?: string) => [
    {
        role: 'system' as const,
        content: sistema?.trim() 
            ? `${sistema.trim()}\n\n${DEFAULT_SYSTEM}` 
            : DEFAULT_SYSTEM,
    },
    {
        role: 'user' as const,
        content: prompt.trim(),
    },
];

/**
 * Função genérica para chamar o modelo de chat da IA
 */
async function chamarIA(ai: any, prompt: string, sistema?: string): Promise<RespostaIA> {
    const model = '@cf/meta/llama-3.1-8b-instruct';
    
    try {
        const response = await ai.run(model, {
            messages: construirMensagens(prompt, sistema)
        });

        const conteudo = response.response || '';
        
        // Tenta extrair JSON se o prompt pedir
        let json = null;
        if (conteudo.includes('{')) {
            try {
                const match = conteudo.match(/\{[\s\S]*\}/);
                if (match) json = JSON.parse(match[0]);
            } catch (e: any) {
                log('warn', '[AI] Falha ao parsear JSON da resposta', { erro: e.message, conteudo });
            }
        }

        return { conteudo, json };
    } catch (error: any) {
        log('error', '[AI] Erro ao chamar Workers AI', { erro: error.message, model });
        throw new Error('Falha na comunicação com a IA.');
    }
}

/**
 * 1. Resumo automático de tarefas
 */
export async function resumirTarefa(ai: any, titulo: string, descricao: string) {
    const prompt = `Gere um título curto e profissional (máximo 40 caracteres) para uma tarefa. 
    Contexto: Título original "${titulo}", Descrição: "${descricao}". 
    Responda APENAS o título curto, sem aspas ou explicações.`;
    
    const res = await chamarIA(ai, prompt, 'Você é o Gerente de Projetos do SoftHub focado em concisão técnica.');
    return res.conteudo.trim();
}

/**
 * 2. Classificação de prioridade
 */
export async function sugerirPrioridade(ai: any, texto: string) {
    const prompt = `Analise o texto da tarefa e sugira uma prioridade entre: baixa, media, alta, urgente.
    Texto: "${texto}"
    Responda em formato JSON: {"prioridade": "...", "justificativa": "..."}`;
    
    const res = await chamarIA(ai, prompt, 'Você é o Analista de Riscos do SoftHub especializado em priorização de backlog.');
    return res.json || { prioridade: 'baixa', justificativa: 'Não foi possível analisar.' };
}

/**
 * 3. Justificativa de ponto inteligente
 */
export async function analisarJustificativa(ai: any, motivo: string) {
    const prompt = `Como gestor, analise esta justificativa de falta/atraso: "${motivo}".
    Avalie se o motivo parece plausível e profissional. 
    Responda em JSON: {"sugestao": "aprovar" | "rejeitar" | "analisar_mais", "analise": "texto curto do porquê"}`;

    const res = await chamarIA(ai, prompt, 'Você é o Gestor de Operações da Fábrica de Software especializado em análise de frequência.');
    return res.json;
}

/**
 * 4. Geração de avisos profissionais
 */
export async function formatarAviso(ai: any, rascunho: string) {
    const prompt = `Transforme este rascunho informal em um aviso corporativo profissional para o mural da empresa.
    Rascunho: "${rascunho}"
    Responda em JSON: {"titulo": "Título impactante", "conteudo": "Texto refinado em MD"}`;

    const res = await chamarIA(ai, prompt, 'Você é o Responsável pela Comunicação Interna da Fábrica de Software.');
    return res.json;
}

/**
 * 5. Aprimorar descrição de tarefa
 */
export async function aprimorarDescricao(ai: any, titulo: string, descricao: string) {
    const prompt = `Melhore a descrição desta tarefa para torná-la mais profissional, clara e estruturada.
    Título: "${titulo}"
    Descrição atual: "${descricao}"
    
    Ao final da descrição, adicione uma linha de separação e uma seção curta chamada:
    "📢 **Sugestão do Tech Lead:** [Prioridade Recomendada] - [Uma linha curta de justificativa técnica]"
    
    Use markdown para estruturar com tópicos se necessário.
    Responda APENAS a nova descrição completa, sem introduções ou comentários adicionais.`;

    const res = await chamarIA(ai, prompt, 'Você é o Tech Lead da Fábrica de Software especializado em documentação e requisitos técnicos.');
    return res.conteudo.trim();
}

/**
 * 6. Geração de Infraestrutura (GitHub Actions / Docker)
 */
export async function gerarInfra(ai: any, nome: string, descricao: string) {
    const prompt = `Gere um arquivo .github/workflows/deploy.yml premium para o projeto "${nome}". 
    Descrição do contexto: "${descricao}". 
    O projeto usa Node.js por padrão e deve incluir steps de Build, Test e Deploy (simulado).
    
    Responda APENAS o código YAML do arquivo, sem explicações, aspas extras ou introduções.`;

    const res = await chamarIA(ai, prompt, 'Você é o Arquiteto de DevOps da Fábrica de Software especializado em CI/CD e infra como código.');
    return res.conteudo.trim();
}
