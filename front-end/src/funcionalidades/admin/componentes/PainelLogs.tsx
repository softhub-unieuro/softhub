import { ShieldAlert, Activity, FileText, FolderKanban, Clock, Users, Key, Settings } from 'lucide-react';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { Paginacao } from '@/compartilhado/componentes/Paginacao';
import { formatarDataHora } from '@/utilitarios/formatadores';
import { usarLogs } from '@/funcionalidades/admin/hooks/usarLogs';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { Emblema } from '@/compartilhado/componentes/Emblema';
import { EstadoErro } from '@/compartilhado/componentes/EstadoErro';
import { useState, Fragment, memo, useCallback } from 'react';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { BarraFiltros, FiltroSelect, FiltroDataRange, FiltroToggle } from '@/compartilhado/componentes/BarraFiltros';
import { DetalheLog } from './logs/DetalheLog';
import { LinhaLog } from './logs/LinhaLog';

/** Painel de auditoria com tabela semântica padronizada. */
export const PainelLogs = memo(() => {
    const {
        logs, carregando, erro, pagina, setPagina, totalPaginas, totalRegistros,
        itensPorPagina, setItensPorPagina,
        filtroModulo, setFiltroModulo, filtroAcao, setFiltroAcao,
        busca, setBusca, dataInicio, setDataInicio, dataFim, setDataFim,
        modoVisualizacao, setModoVisualizacao
    } = usarLogs();

    const [expandidoId, setExpandidoId] = useState<string | null>(null);

    const handleAlternarExpansao = useCallback((id: string) => {
        setExpandidoId(prev => prev === id ? null : id);
    }, []);

    const handleMudarBusca = useCallback((v: string) => {
        setBusca(v);
        setPagina(1);
    }, [setBusca, setPagina]);

    const handleMudarModulo = useCallback((v: string) => {
        setFiltroModulo(v);
        setPagina(1);
    }, [setFiltroModulo, setPagina]);

    const handleMudarAcao = useCallback((v: string) => {
        setFiltroAcao(v);
        setPagina(1);
    }, [setFiltroAcao, setPagina]);

    const handleLimparFiltros = useCallback(() => {
        setBusca('');
        setFiltroModulo('');
        setFiltroAcao('');
        setDataInicio('');
        setDataFim('');
        setPagina(1);
    }, [setBusca, setFiltroModulo, setFiltroAcao, setDataInicio, setDataFim, setPagina]);

    const handleMudarItensPorPagina = useCallback((num: number) => {
        setItensPorPagina(num);
        setPagina(1);
    }, [setItensPorPagina, setPagina]);



    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            <CabecalhoFuncionalidade
                titulo="Logs de Auditoria"
                subtitulo="Registros imutáveis de todas as operações críticas do ecossistema."
                icone={ShieldAlert}
            >
                {carregando && logs.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full border border-primary/10 animate-pulse">
                        <Carregando Centralizar={false} tamanho="sm" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Sincronizando Auditoria</span>
                    </div>
                )}
            </CabecalhoFuncionalidade>

            <BarraFiltros
                busca={busca}
                aoMudarBusca={handleMudarBusca}
                placeholderBusca="Localizar registro..."
                temFiltrosAtivos={!!(busca || filtroModulo || filtroAcao || dataInicio || dataFim)}
                aoLimparFiltros={handleLimparFiltros}
            >
                <div className="flex flex-wrap items-center gap-3">
                    <FiltroSelect 
                        valor={filtroModulo} 
                        aoMudar={handleMudarModulo}
                        rotuloPadrao="Todos os Módulos"
                        opcoes={[
                            { valor: "kanban", rotulo: "Quadro Kanban" },
                            { valor: "ponto", rotulo: "Ponto Eletrônico" },
                            { valor: "membros", rotulo: "Gestão de Membros" },
                            { valor: "autenticacao", rotulo: "Segurança & Auth" },
                            { valor: "admin", rotulo: "Administração" }
                        ]}
                    />

                    <FiltroSelect 
                        valor={filtroAcao} 
                        aoMudar={handleMudarAcao}
                        rotuloPadrao="Todas as Ações"
                        opcoes={[
                            { valor: "LOGIN", rotulo: "Autenticação" },
                            { valor: "CRIAR", rotulo: "Criação de Dados" },
                            { valor: "ATUALIZAR", rotulo: "Edição / Update" },
                            { valor: "DELETAR", rotulo: "Exclusão / Destruição" },
                            { valor: "ROLE", rotulo: "Controle de Acesso" }
                        ]}
                    />

                    <FiltroDataRange 
                        inicio={dataInicio} 
                        fim={dataFim} 
                        aoMudarInicio={(v: string) => { setDataInicio(v); setPagina(1); }}
                        aoMudarFim={(v: string) => { setDataFim(v); setPagina(1); }}
                        desabilitado={modoVisualizacao === 'otimizada'}
                    />

                    <FiltroToggle 
                        valorAtivo={modoVisualizacao}
                        aoMudar={(v: 'otimizada' | 'historico') => setModoVisualizacao(v)}
                        opcoes={[
                            { valor: 'otimizada', rotulo: 'Recentes' },
                            { valor: 'historico', rotulo: 'Arquivo' }
                        ]}
                    />
                </div>
            </BarraFiltros>

            {/* Tabela de Auditoria */}
            <div className="flex-1 min-h-0 bg-card border border-border rounded-2xl flex flex-col shadow-sm shadow-black/5 overflow-hidden">
                <div className="flex-1 overflow-auto relative custom-scrollbar">
                    {erro ? (
                        <div className="h-full flex items-center justify-center p-12">
                            <EstadoErro titulo="Falha na Sincronização" mensagem={erro} />
                        </div>
                    ) : carregando && logs.length === 0 ? (
                        <div className="flex-1 p-6 space-y-4 animate-pulse">
                            <div className="h-10 w-full bg-muted/20 rounded-xl" />
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className="h-12 w-full bg-muted/10 rounded-xl" />
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <EstadoVazio 
                            tipo="pesquisa"
                            titulo="Nenhum registro localizado"
                            descricao="Refine seus filtros ou busque em períodos anteriores."
                        />
                    ) : (
                        <table className="w-full border-collapse">
                            <thead className="bg-muted/10 border-b border-border sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="px-5 py-4 text-left text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 w-[180px]">CRONÔMETRO (UTC)</th>
                                    <th className="px-3 py-4 text-left text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 w-[120px]">OPERAÇÃO</th>
                                    <th className="px-3 py-4 text-left text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 w-[200px]">AGENTE RESPONSÁVEL</th>
                                    <th className="px-3 py-4 text-left text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">DESCRIÇÃO DO EVENTO</th>
                                    <th className="px-5 py-4 text-left text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 w-[220px]">MÓDULO DE ORIGEM</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y divide-border/20 transition-opacity duration-300 ${carregando ? 'opacity-50' : 'opacity-100'}`}>
                                {logs.map(log => (
                                    <Fragment key={log.id}>
                                        <LinhaLog
                                            log={log}
                                            expandido={expandidoId === log.id}
                                            aoAlternar={handleAlternarExpansao}
                                        />
                                        {expandidoId === log.id && (
                                            <tr className="bg-muted/10 animate-in slide-in-from-top-4 duration-500">
                                                <td colSpan={5} className="p-0">
                                                    <DetalheLog log={log} />
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <Paginacao
                    paginaAtual={pagina}
                    totalPaginas={totalPaginas}
                    totalRegistros={totalRegistros}
                    itensPorPagina={itensPorPagina}
                    itensListados={logs.length}
                    aoMudarPagina={setPagina}
                    aoMudarItensPorPagina={handleMudarItensPorPagina}
                    desabilitado={carregando}
                />
            </div>
        </div>
    );
});
 
export default PainelLogs;
