/**
 * Serviço isolado para requisições externas ao GitHub.
 * Evita o uso de `fetch` nativo injetado dentro dos componentes (Regra de Arquitetura).
 * Não utiliza a `api.ts` base para prevenir o envio de Tokens Bearer institucionais para a web externa.
 */
export const servicoGithub = {
    /**
     * Busca o README.md público de um repositório no formato texto bruto.
     */
    buscarReadmeRaw: async (usuario: string, repositorio: string): Promise<string | null> => {
        try {
            const res = await fetch(`https://raw.githubusercontent.com/${usuario}/${repositorio}/main/README.md`);
            if (!res.ok) return null;
            return await res.text();
        } catch (erro) {
            console.warn(`[GITHUB] Falha ao extrair README de ${usuario}/${repositorio}`);
            return null;
        }
    }
};
