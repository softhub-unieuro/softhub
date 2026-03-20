import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';

export interface ConfiguracoesSistema {
    nome_sistema: string;
    permissoes_roles: Record<string, Record<string, boolean>>;
    dominios_autorizados: string[];
    auto_cadastro: boolean;
    ips_autorizados_ponto: string[];
    modo_manutencao: boolean;
    hora_inicio_ponto: string;
    hora_fim_ponto: string;
    hierarquia_roles: string[];
    labels_roles: Record<string, string>;
}

/**
 * Hook de gerenciamento de configurações globais do sistema.
 * Utiliza React Query para cache inteligente e atualizações otimistas.
 */
export function usarConfiguracoes() {
    const queryClient = useQueryClient();
    const queryKey = ['configuracoes'];

    const podeAcessar = usarPermissaoAcesso('configuracoes:visualizar');
    const { 
        data: configuracoes, 
        isLoading: carregando, 
        error 
    } = useQuery<ConfiguracoesSistema>({
        queryKey,
        enabled: podeAcessar,
        queryFn: async () => {
            const res = await api.get('/api/configuracoes');
            const dados = res.data.configuracoes || {};

            // Garantir integridade dos dados (fallbacks)
            if (!dados.permissoes_roles || typeof dados.permissoes_roles !== 'object') {
                dados.permissoes_roles = {};
            }
            if (!Array.isArray(dados.dominios_autorizados)) {
                dados.dominios_autorizados = ['unieuro.com.br', 'unieuro.edu.br'];
            }
            if (!Array.isArray(dados.ips_autorizados_ponto)) {
                dados.ips_autorizados_ponto = [];
            }
            if (typeof dados.auto_cadastro !== 'boolean') dados.auto_cadastro = false;
            if (typeof dados.modo_manutencao !== 'boolean') dados.modo_manutencao = false;
            if (typeof dados.hora_inicio_ponto !== 'string') dados.hora_inicio_ponto = '13:00';
            if (typeof dados.hora_fim_ponto !== 'string') dados.hora_fim_ponto = '17:00';
            if (!Array.isArray(dados.hierarquia_roles)) {
                dados.hierarquia_roles = ['MEMBRO', 'SUBLIDER', 'LIDER', 'GESTOR', 'COORDENADOR', 'ADMIN'];
            }
            if (!dados.labels_roles || typeof dados.labels_roles !== 'object') {
                dados.labels_roles = {};
            }

            return dados;
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
    });

    const mutacaoConfig = useMutation({
        mutationFn: async ({ chave, valor }: { chave: string, valor: any }) => {
            return api.patch(`/api/configuracoes/${chave}`, { valor });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey })
    });

    const mutacaoLote = useMutation({
        mutationFn: async (dados: Partial<ConfiguracoesSistema>) => {
            return api.post('/api/configuracoes', dados);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey })
    });

    const mutacaoRole = useMutation({
        mutationFn: async ({ antigo, novo }: { antigo: string, novo: string }) => {
            return api.patch(`/api/configuracoes/roles/${antigo}/renomear`, { novo });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        }
    });

    const erro = error ? (error as any).response?.data?.erro || 'Erro ao carregar configurações' : null;

    return {
        configuracoes,
        carregando,
        erro,
        recarregar: () => queryClient.invalidateQueries({ queryKey }),
        atualizarConfiguracao: async (chave: keyof ConfiguracoesSistema, valor: any) => {
            try {
                await mutacaoConfig.mutateAsync({ chave, valor });
                return { sucesso: true };
            } catch (e: any) {
                return { sucesso: false, erro: e.response?.data?.erro || 'Erro ao atualizar' };
            }
        },
        salvarConfiguracoesLote: async (dados: Partial<ConfiguracoesSistema>) => {
            try {
                await mutacaoLote.mutateAsync(dados);
                return { sucesso: true };
            } catch (e: any) {
                return { sucesso: false, erro: e.response?.data?.erro || 'Erro ao salvar em lote' };
            }
        },
        renomearCargo: async (antigo: string, novo: string) => {
            try {
                await mutacaoRole.mutateAsync({ antigo, novo });
                return { sucesso: true };
            } catch (e: any) {
                return { sucesso: false, erro: e.response?.data?.erro || 'Erro ao renomear cargo' };
            }
        }
    };
}
