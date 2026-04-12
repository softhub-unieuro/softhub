import { ShieldAlert, ChevronRight, ChevronDown } from 'lucide-react';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { Paginacao } from '@/compartilhado/componentes/Paginacao';
import { usarLogs, LogSistema } from '@/funcionalidades/admin/hooks/usarLogs';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { Emblema } from '@/compartilhado/componentes/Emblema';
import { EstadoErro } from '@/compartilhado/componentes/EstadoErro';
import { useState, Fragment, memo, useCallback, useMemo } from 'react';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { BarraFiltros, FiltroSelect, FiltroDataRange, FiltroToggle } from '@/compartilhado/componentes/BarraFiltros';
import { DetalheLog } from './logs/DetalheLog';
import { LinhaLog } from './logs/LinhaLog';

/** 
 * Painel de auditoria com unificação híbrida (Frontend + Backend).
 * Garante limpeza visual mesmo se os dados vierem de APIs sem agrupamento nativo.
 */
export const PainelLogs = memo(() => {
    const {
        logs, carregando, erro, pagina, setPagina, totalPaginas, totalRegistros,
        itensPorPagina, setItensPorPagina,
        filtroModulo, setFiltroModulo, filtroAcao, setFiltroAcao,
        busca, setBusca, dataInicio, setDataInicio, dataFim, setDataFim,
        modoVisualizacao, setModoVisualizacao
    } = usarLogs();

    const [expandidoId, setExpandidoId] = useState<string | undefined>(undefined);

    const handleAlternarExpansao = useCallback((id: string) => {
        setExpandidoId(prev => prev === id ? undefined : id);
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

    /** 
     * 🛡️ CAMADA DE PROTEÇÃO FRONTEND (Essential):
     * Unifica logs idênticos que escaparam do agrupamento do backend.
     * Isso garante que o usuário NUNCA veja linhas repetidas na tela.
     */
    const logsUnificados = useMemo(() => {
        if (!logs || logs.length === 0) return [];
        
        return logs.reduce((acc, log) => {
            const ultimoLog = acc[acc.length - 1];
            
            // Critério de comparação rigoroso (limpando espaços e ignorando caixa)
            const getChave = (l: LogSistema) => `${l.usuario_id}-${l.acao?.trim().toLowerCase()}-${l.modulo?.trim().toLowerCase()}-${l.descricao?.trim().toLowerCase()}`;
            
            const ehIgual = ultimoLog && getChave(ultimoLog) === getChave(log);
            
            if (ehIgual) {
                // Soma as quantidades (se o backend já mandou agrupado, soma os dois)
                ultimoLog.quantidade = (ultimoLog.quantidade || 1) + (log.quantidade || 1);
                // Mantém o timestamp mais recente
                if (new Date(log.criado_em) > new Date(ultimoLog.criado_em)) {
                    ultimoLog.criado_em = log.criado_em;
                }
                return acc;
            }
            
            acc.push({ ...log, quantidade: log.quantidade || 1 });
            return acc;
        }, [] as (LogSistema & { quantidade?: number })[]);
    }, [logs]);

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
                className="m-0"
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

            {/* Tabela de Auditoria - Estilo Enterprise Otimizado */}
            <div className="flex-col bg-card border border-border rounded-2xl flex shadow-sm shadow-black/5 overflow-hidden min-h-[400px] max-h-full">
                <div className="overflow-auto relative custom-scrollbar">
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
                    ) : logsUnificados.length === 0 ? (
                        <EstadoVazio 
                            tipo="pesquisa"
                            titulo="Nenhum registro localizado"
                            descricao="Refine seus filtros ou busque em períodos anteriores."
                        />
                    ) : (
                        <div className="min-w-fit w-full">
                            {/* 🖥️ VISÃO DESKTOP: TABELA CLÁSSICA COM COLUNAS OTIMIZADAS */}
                            <table className="hidden lg:table w-full border-collapse">
                                <thead className="sticky top-0 z-20 bg-card/95 backdrop-blur-xl border-b border-border shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-foreground/40 w-[160px]">Cronômetro</th>
                                        <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-foreground/40 w-[200px]">Operação</th>
                                        <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-foreground/40 w-[260px]">Responsável</th>
                                        <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-foreground/40">Log de Evento</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-[0.15em] text-foreground/40 w-[180px]">Contexto</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y divide-border/10 even:bg-muted/5 transition-opacity duration-300 ${carregando ? 'opacity-50' : 'opacity-100'}`}>
                                    {logsUnificados.map(log => (
                                        <Fragment key={log.id}>
                                            <LinhaLog
                                                log={log}
                                                expandido={expandidoId === log.id}
                                                aoAlternar={handleAlternarExpansao}
                                            />
                                            {expandidoId === log.id && (
                                                <tr className="bg-muted/5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <td colSpan={5} className="p-0 border-b border-border/50">
                                                        <DetalheLog log={log} />
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>

                            {/* 📱 VISÃO MOBILE: LISTA DE CARDS OPERACIONAIS */}
                            <div className="lg:hidden flex flex-col divide-y divide-border/10 bg-card">
                                {logsUnificados.map(log => (
                                    <div key={log.id} className="flex flex-col bg-card hover:bg-muted/5 transition-colors">
                                        <div 
                                            onClick={() => handleAlternarExpansao(log.id)}
                                            className="p-5 flex flex-col gap-4 active:bg-muted/10 transition-all border-l-4 border-l-border/30"
                                            style={{ 
                                                borderLeftColor: log.acao.includes('ERRO') || log.acao.includes('DELETAR') ? '#f43f5e' : 
                                                                log.acao.includes('CRIAR') ? '#10b981' : 
                                                                log.acao.includes('ATUALIZAR') ? '#f59e0b' : '#3b82f6'
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-muted-foreground/50 tabular-nums">
                                                    {new Date(log.criado_em).toLocaleDateString('pt-BR')} às {new Date(log.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {(log.quantidade || 1) > 1 && (
                                                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded-full border border-primary/20">
                                                            x{log.quantidade}
                                                        </span>
                                                    )}
                                                    <Emblema texto={log.modulo} variante="cinza" />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border shrink-0 overflow-hidden">
                                                    {log.foto_perfil ? (
                                                        <img src={log.foto_perfil} alt={log.nome || ''} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="text-[10px] font-black text-muted-foreground/20">SYS</div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[11px] font-black uppercase tracking-tight text-foreground/80 truncate leading-none mb-1">
                                                        {log.nome || 'SISTEMA'}
                                                    </span>
                                                    <span className="text-xs font-medium text-muted-foreground py-0.5 leading-tight line-clamp-2">
                                                        {log.descricao}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-1">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                                        log.acao.includes('ERRO') || log.acao.includes('DELETAR') ? 'bg-rose-500' : 
                                                        log.acao.includes('CRIAR') ? 'bg-emerald-500' : 'bg-blue-500'
                                                    }`} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40">{log.acao.replace(/_/g, ' ')}</span>
                                                </div>
                                                <ChevronRight className={`w-4 h-4 text-muted-foreground/20 transition-transform ${expandidoId === log.id ? 'rotate-90 text-primary' : ''}`} />
                                            </div>
                                        </div>
                                        {expandidoId === log.id && (
                                            <div className="bg-muted/10 border-t border-border/10 p-4 animate-in slide-in-from-top-4 duration-500">
                                                <DetalheLog log={log} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <Paginacao
                    paginaAtual={pagina}
                    totalPaginas={totalPaginas}
                    totalRegistros={totalRegistros}
                    itensPorPagina={itensPorPagina}
                    itensListados={logsUnificados.length}
                    infoAdicional={`${logsUnificados.length} Linhas de ${totalRegistros} Logs`}
                    aoMudarPagina={setPagina}
                    aoMudarItensPorPagina={handleMudarItensPorPagina}
                    desabilitado={carregando}
                />
            </div>
        </div>
    );
});

export default PainelLogs;
