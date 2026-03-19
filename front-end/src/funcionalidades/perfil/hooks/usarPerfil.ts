import { usarPerfilContexto } from '@/funcionalidades/perfil/contexto/PerfilContexto';

/**
 * Hook para gerenciar os dados do perfil do usuário logado e suas estatísticas.
 * Agora consome o PerfilContexto para permitir injeção de IDs de terceiros.
 */
export interface PerfilData {
    perfil: {
        id: string;
        nome: string;
        email: string;
        role: string;
        foto_perfil: string | null;
        foto_banner: string | null;
        bio: string | null;
        criado_em: string;
        equipe_nome: string | null;
        grupo_nome: string | null;
        github_url: string | null;
        linkedin_url: string | null;
        website_url: string | null;
        esta_em_expediente: boolean;
    };
    stats: {
        tarefas: {
            total: number;
            concluidas: number;
            pendentes: number;
            aproveitamento: number;
        };
        ponto: {
            batidasMes: number;
            estimativaHoras: number;
        };
    };
}

export function usarPerfil() {
    return usarPerfilContexto();
}
