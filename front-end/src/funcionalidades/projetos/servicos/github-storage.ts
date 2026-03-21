import { api } from '@/compartilhado/servicos/api';

export interface ArquivoGithub {
    name: string;
    path: string;
    sha: string;
    size: number;
    download_url: string;
}

/**
 * Serviço de armazenamento de documentos e infraestrutura de projetos.
 * Agora utiliza centralizadamente o Backend para todas as operações, 
 * garantindo que o TOKEN do GitHub nunca seja exposto no Frontend.
 */
export const githubStorage = {
    /**
     * Lista os arquivos de uma determinada pasta no repositório vinculado ao projeto.
     */
    async listarDocumentos(projetoId: string, pasta: string = 'docs/softhub'): Promise<ArquivoGithub[]> {
        if (!projetoId) return [];
        try {
            const response = await api.get(`/api/projetos/${projetoId}/arquivos`, { params: { pasta } });
            return response.data?.arquivos || [];
        } catch (error) {
            console.error('[GitHub Storage] Erro ao listar:', error);
            return []; 
        }
    },

    /**
     * Faz upload de um arquivo transformando-o em Base64 e enviando via Backend.
     */
    async fazerUploadDocumento(projetoId: string, arquivo: File, pathFolder: string = 'docs/softhub'): Promise<void> {
        if (!projetoId) throw new Error('ID do projeto não fornecido.');

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(arquivo);
            reader.onload = async () => {
                const base64Data = reader.result as string;
                const content = base64Data.split(',')[1];

                try {
                    await api.post(`/api/projetos/${projetoId}/arquivos`, {
                        nome: arquivo.name,
                        conteudo: content,
                        pathFolder
                    });
                    resolve();
                } catch (error: any) {
                    console.error('[GitHub Storage] Erro no upload:', error);
                    reject(new Error(error.response?.data?.erro || 'Falha ao fazer upload para o GitHub.'));
                }
            };
            reader.onerror = () => reject(new Error('Falha ao processar arquivo localmente.'));
        });
    },

    /**
     * Deleta um arquivo específico do repositório.
     */
    async deletarDocumento(projetoId: string, path: string, sha: string): Promise<void> {
        if (!projetoId || !path || !sha) throw new Error('Dados insuficientes para exclusão.');
        try {
            await api.delete(`/api/projetos/${projetoId}/arquivos`, {
                data: { path, sha }
            });
        } catch (error: any) {
            console.error('[GitHub Storage] Erro ao deletar:', error);
            throw new Error(error.response?.data?.erro || 'Falha ao deletar arquivo do GitHub.');
        }
    },

    /**
     * Aciona a IA/Backend para garantir que o repositório exista.
     * Note: A criação de repositórios agora é tratada majoritariamente pela rota de IA.
     */
    async garantirRepositorio(nomeRepo: string, descricao: string): Promise<boolean> {
        if (!nomeRepo) return false;
        try {
            // Chamamos a rota de IA para criar o repositório se necessário
            await api.post('/api/ia/github/criar-repo', {
                nome: nomeRepo,
                descricao,
                publico: false
            });
            return true;
        } catch (error: any) {
            console.error('[GitHub Storage] Erro ao garantir repo:', error);
            // Se o erro for 409 (Conflict), significa que já existe, o que é um sucesso para o "garantir"
            if (error.response?.status === 409) return true;
            throw new Error('Falha ao sincronizar repositório no GitHub.');
        }
    },

    /**
     * Deleta o repositório vinculado através do Backend.
     */
    async deletarRepositorio(projetoId: string): Promise<void> {
        if (!projetoId) return;
        try {
            await api.delete(`/api/projetos/${projetoId}/repositorio`);
        } catch (error: any) {
            console.error('[GitHub Storage] Erro ao deletar repo:', error);
            throw new Error(error.response?.data?.erro || 'Falha ao deletar repositório no GitHub.');
        }
    }
};
