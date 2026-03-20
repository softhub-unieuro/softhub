import { useState, useEffect } from 'react';
import { api } from '@/compartilhado/servicos/api';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';

export interface LogSistema {
    id: string;
    acao: string;
    modulo: string;
    descricao: string;
    entidade_tipo: string | null;
    entidade_id: string | null;
    criado_em: string;
    usuario_id: string | null;
    nome: string | null;
    email: string | null;
    role: string | null;
    ip: string | null;
    dados_anteriores: string | null;
    dados_novos: string | null;
}

export interface EstatisticaLog {
    modulo: string;
    quantidade: number;
}

/**
 * Hook de gerenciamento para leitura de Logs (Exclusivo Admin).
 */
export function usarLogs() {
    const [logs, setLogs] = useState<LogSistema[]>([]);
    const [stats, setStats] = useState<EstatisticaLog[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    const [pagina, setPagina] = useState(1);
    const [itensPorPagina, setItensPorPagina] = useState(20);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(0);

    const [filtroModulo, setFiltroModulo] = useState('');
    const [filtroAcao, setFiltroAcao] = useState('');
    const [busca, setBusca] = useState('');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [filtroMeusLogs, setFiltroMeusLogs] = useState(false);
    const [modoVisualizacao, setModoVisualizacao] = useState<'otimizada' | 'historico'>('otimizada');

    const [buscaDebounced, setBuscaDebounced] = useState(busca);
    const [contadorPolling, setContadorPolling] = useState(0);

    // Efeito para Debounce da busca (evita spam de requisições)
    useEffect(() => {
        const timer = setTimeout(() => {
            setBuscaDebounced(busca);
            setPagina(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [busca]);

    // Polling de 30s (Regra 14)
    useEffect(() => {
        const interval = setInterval(() => {
            setContadorPolling(prev => prev + 1);
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const { configuracoes, roleVisualizacao, usuario } = usarAutenticacao();
    const podeVerLogs = usarPermissaoAcesso('logs:visualizar');

    const carregar = async (exibirLoading = true) => {
        // Se estiver em modo de previsualização e o cargo atual não puder ver logs, aborta para evitar 403
        if (!podeVerLogs) {
            setCarregando(false);
            setLogs([]);
            return;
        }

        try {
            if (exibirLoading) setCarregando(true);
            const params: any = { pagina, itensPorPagina };
            if (filtroModulo) params.modulo = filtroModulo;
            if (filtroAcao) params.acao = filtroAcao;
            if (buscaDebounced) params.busca = buscaDebounced;
            
            // Lógica Blindada: Otimizada (Últimos 90 dias) vs Histórico Completo
            if (modoVisualizacao === 'otimizada') {
                const tresMesesAtras = new Date();
                tresMesesAtras.setDate(tresMesesAtras.getDate() - 90);
                params.dataInicio = tresMesesAtras.toISOString();
            } else {
                if (dataInicio) params.dataInicio = dataInicio;
                if (dataFim) params.dataFim = dataFim;
            }

            if (filtroMeusLogs) params.meus = true;

            const [resLogs, resStats] = await Promise.all([
                api.get('/api/logs', { params }),
                api.get('/api/logs/estatisticas')
            ]);

            setLogs(resLogs.data.dados || []);
            setStats(resStats.data.modulos || []);
            setTotalPaginas(resLogs.data.paginacao?.totalPaginas || 1);
            setTotalRegistros(resLogs.data.paginacao?.total || 0);
            setErro(null);
        } catch (e: any) {
            console.error('[ERRO LOGS]', e);
            const erroApi = e.response?.data?.erro || 'Erro ao carregar logs';
            const detalheApi = e.response?.data?.detalhe ? ` (${e.response.data.detalhe})` : '';
            setErro(`${erroApi}${detalheApi}`);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        carregar(contadorPolling === 0); // Só mostra loading na primeira carga ou troca de filtro
    }, [pagina, itensPorPagina, filtroModulo, filtroAcao, buscaDebounced, dataInicio, dataFim, filtroMeusLogs, modoVisualizacao, contadorPolling]);

    return {
        logs,
        stats,
        carregando,
        erro,
        recarregar: carregar,
        pagina,
        setPagina,
        itensPorPagina,
        setItensPorPagina,
        totalPaginas,
        totalRegistros,
        filtroModulo,
        setFiltroModulo,
        filtroAcao,
        setFiltroAcao,
        busca,
        setBusca,
        dataInicio,
        setDataInicio,
        dataFim,
        setDataFim,
        filtroMeusLogs,
        setFiltroMeusLogs,
        modoVisualizacao,
        setModoVisualizacao
    };
}
