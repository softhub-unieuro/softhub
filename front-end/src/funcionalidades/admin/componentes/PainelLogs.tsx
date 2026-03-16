<<<<<<< HEAD
import { ShieldAlert } from 'lucide-react';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { Paginacao } from '@/compartilhado/componentes/Paginacao';
import { usarLogs } from '@/funcionalidades/admin/hooks/usarLogs';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { EstadoErro } from '@/compartilhado/componentes/EstadoErro';
import { useState, Fragment, memo, useCallback } from 'react';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { BarraFiltros, FiltroSelect, FiltroDataRange, FiltroToggle } from '@/compartilhado/componentes/BarraFiltros';
import { DetalheLog } from '@/funcionalidades/admin/componentes/logs/DetalheLog';
import { LinhaLog } from '@/funcionalidades/admin/componentes/logs/LinhaLog';

/** Painel de auditoria com tabela semântica padronizada. */
export const PainelLogs = memo(() => {
    const {
=======
import { ShieldAlert, Activity, FileText, FolderKanban, Clock, Users, Key, Settings } from 'lucide-react';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { Paginacao } from '@/compartilhado/componentes/Paginacao';
import { formatarDataHora } from '@/utilitarios/formatadores';
import { usarLogs } from '@/funcionalidades/admin/hooks/usarLogs';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { Emblema } from '@/compartilhado/componentes/Emblema';
import { EstadoErro } from '@/compartilhado/componentes/EstadoErro';
import { useState, Fragment } from 'react';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { BarraFiltros, FiltroSelect, FiltroDataRange, FiltroToggle } from '@/compartilhado/componentes/BarraFiltros';
import { DetalheLog } from './logs/DetalheLog';

/** Painel de auditoria com tabela semântica padronizada. */
export function PainelLogs() {    const {
>>>>>>> 709151e (teste)
        logs, carregando, erro, pagina, setPagina, totalPaginas, totalRegistros,
        itensPorPagina, setItensPorPagina,
        filtroModulo, setFiltroModulo, filtroAcao, setFiltroAcao,
        busca, setBusca, dataInicio, setDataInicio, dataFim, setDataFim,
        modoVisualizacao, setModoVisualizacao
    } = usarLogs();

    const [expandidoId, setExpandidoId] = useState<string | null>(null);

<<<<<<< HEAD
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
=======
    const getVarianteAcao = (acao: string) => {
        const a = acao.toUpperCase();
        if (a.includes('DELETAR') || a.includes('REMOVER') || a.includes('EXCLU') || a.includes('FALH') || a.includes('ERR') || a.includes('DESATIVAD')) return 'vermelho';
        if (a.includes('CRIAR') || a.includes('NOVO') || a.includes('CRIAD') || a.includes('ATIVAD')) return 'verde';
        if (a.includes('LOGIN') || a.includes('LOGOUT') || a.includes('ACES')) return 'azul';
        if (a.includes('ROLE') || a.includes('PERMISSÃO')) return 'roxo';
        if (a.includes('STATUS') || a.includes('MOVER') || a.includes('EDITAD') || a.includes('ATUALIZAR')) return 'amarelo';
        return 'cinza';
    };

    const getModuloInfo = (modulo: string) => {
        const m = modulo?.toLowerCase() || '';
        if (m.includes('kanban')) return { icone: FolderKanban, cor: 'text-blue-600', bg: 'bg-blue-100/50', borda: 'border-blue-200', label: 'Kanban' };
        if (m.includes('ponto')) return { icone: Clock, cor: 'text-amber-700', bg: 'bg-amber-100/50', borda: 'border-amber-200', label: 'Ponto' };
        if (m.includes('membros')) return { icone: Users, cor: 'text-emerald-600', bg: 'bg-emerald-100/50', borda: 'border-emerald-200', label: 'Membros' };
        if (m.includes('autenticacao')) return { icone: Key, cor: 'text-indigo-600', bg: 'bg-indigo-100/50', borda: 'border-indigo-200', label: 'Auth' };
        if (m.includes('admin')) return { icone: Settings, cor: 'text-slate-600', bg: 'bg-slate-200/50', borda: 'border-slate-300', label: 'Admin' };
        return { icone: FileText, cor: 'text-slate-400', bg: 'bg-slate-100', borda: 'border-slate-200', label: modulo || 'Geral' };
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            <CabecalhoFuncionalidade
                titulo="Logs de Auditoria"
                subtitulo="Registros imutáveis de todas as ações realizadas no sistema."
                icone={ShieldAlert}
                variante="perigo"
>>>>>>> 709151e (teste)
            >
                {carregando && logs.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full border border-primary/10 animate-pulse">
                        <Carregando Centralizar={false} tamanho="sm" />
<<<<<<< HEAD
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Sincronizando Auditoria</span>
=======
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Sincronizando...</span>
>>>>>>> 709151e (teste)
                    </div>
                )}
            </CabecalhoFuncionalidade>

            <BarraFiltros
                busca={busca}
<<<<<<< HEAD
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
=======
                aoMudarBusca={(v: string) => { setBusca(v); setPagina(1); }}
                placeholderBusca="Pesquisa global em logs..."
                temFiltrosAtivos={!!(busca || filtroModulo || filtroAcao || dataInicio || dataFim)}
                aoLimparFiltros={() => {
                    setBusca('');
                    setFiltroModulo('');
                    setFiltroAcao('');
                    setDataInicio('');
                    setDataFim('');
                    setPagina(1);
                }}
            >
                <div className="flex flex-wrap items-center gap-4">
                    <FiltroSelect 
                        valor={filtroModulo} 
                        aoMudar={(v: string) => { setFiltroModulo(v); setPagina(1); }}
                        rotuloPadrao="Módulos"
                        opcoes={[
                            { valor: "kanban", rotulo: "Kanban" },
                            { valor: "ponto", rotulo: "Ponto" },
                            { valor: "membros", rotulo: "Membros" },
                            { valor: "autenticacao", rotulo: "Auth" },
                            { valor: "admin", rotulo: "Admin" }
>>>>>>> 709151e (teste)
                        ]}
                    />

                    <FiltroSelect 
                        valor={filtroAcao} 
<<<<<<< HEAD
                        aoMudar={handleMudarAcao}
                        rotuloPadrao="Todas as Ações"
                        opcoes={[
                            { valor: "LOGIN", rotulo: "Autenticação" },
                            { valor: "CRIAR", rotulo: "Criação de Dados" },
                            { valor: "ATUALIZAR", rotulo: "Edição / Update" },
                            { valor: "DELETAR", rotulo: "Exclusão / Destruição" },
                            { valor: "ROLE", rotulo: "Controle de Acesso" }
=======
                        aoMudar={(v: string) => { setFiltroAcao(v); setPagina(1); }}
                        rotuloPadrao="Ações"
                        opcoes={[
                            { valor: "LOGIN", rotulo: "Acesso" },
                            { valor: "CRIAR", rotulo: "Criação" },
                            { valor: "ATUALIZAR", rotulo: "Edição" },
                            { valor: "DELETAR", rotulo: "Exclusão" },
                            { valor: "ROLE", rotulo: "Permissões" }
>>>>>>> 709151e (teste)
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
<<<<<<< HEAD
                            { valor: 'otimizada', rotulo: 'Recentes' },
                            { valor: 'historico', rotulo: 'Arquivo' }
=======
                            { valor: 'otimizada', rotulo: 'Otimizada' },
                            { valor: 'historico', rotulo: 'Histórico' }
>>>>>>> 709151e (teste)
                        ]}
                    />
                </div>
            </BarraFiltros>

<<<<<<< HEAD
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
=======
            {/* Tabela Semântica */}
            <div className="flex-1 min-h-0 bg-card border border-border rounded-2xl flex flex-col shadow-sm overflow-hidden">
                <div className="flex-1 overflow-auto relative">
                    {erro ? (
                        <div className="h-full flex items-center justify-center p-6">
                            <EstadoErro titulo="Erro ao carregar auditoria" mensagem={erro} />
                        </div>
                    ) : carregando && logs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 bg-muted/5 animate-in fade-in duration-500">
                             <Carregando Centralizar={false} tamanho="lg" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Sincronizando Auditoria</span>
                        </div>
                    ) : logs.length === 0 ? (
                        (busca || filtroModulo || filtroAcao || dataInicio || dataFim || modoVisualizacao === 'otimizada') ? (
                            <EstadoVazio 
                                tipo="pesquisa"
                                titulo="Nenhum resultado filtrado"
                                descricao={modoVisualizacao === 'otimizada' ? "Não há registros nos últimos 3 meses para os filtros atuais. Tente mudar para 'Histórico'." : "Não encontramos registros para os filtros aplicados."}
                                compacto={true}
                                acao={{
                                    rotulo: "Ver histórico completo",
                                    aoClicar: () => {
                                        setModoVisualizacao('historico');
                                        setBusca('');
                                        setPagina(1);
                                    }
                                }}
                            />
                        ) : (
                            <EstadoVazio 
                                titulo="Deserto de Auditoria"
                                descricao="Surpreendentemente, ainda não há nenhuma ação registrada no sistema. Tudo parece estar em paz absoluta."
                            />
                        )
                    ) : (
                        <table className="w-full border-collapse">
                            <thead className="bg-muted border-b border-border sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Timestamp</th>
                                    <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ação</th>
                                    <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Usuário</th>
                                    <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Histórico / Descrição</th>
                                    <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Módulo / Tabela</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y divide-border/40 transition-opacity duration-300 ${carregando ? 'opacity-50' : 'opacity-100'}`}>
                                {logs.map(log => (
                                    <Fragment key={log.id}>
                                        <tr 
                                            className={`hover:bg-muted/20 cursor-pointer transition-all ${expandidoId === log.id ? 'bg-primary/5' : ''}`}
                                            onClick={() => setExpandidoId(expandidoId === log.id ? null : log.id)}
                                        >
                                            <td className="px-4 py-4 text-muted-foreground font-mono text-[11px]">
                                                {formatarDataHora(log.criado_em)}
                                            </td>
                                            <td className="px-3 py-4">
                                                <Emblema texto={log.acao} variante={getVarianteAcao(log.acao)} className="scale-90 origin-left" />
                                            </td>
                                            <td className="px-3 py-4">
                                                {log.usuario_id || log.email ? (
                                                    <div>
                                                        <p className="text-xs font-bold text-foreground truncate max-w-[180px]">
                                                            {log.nome || 'Usuário Deletado'}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground tracking-tight truncate max-w-[180px]">
                                                            {log.email}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground italic text-[11px]">Sistema/Anônimo</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-4 text-[13px] text-muted-foreground/80 font-medium truncate max-w-[280px]" title={log.descricao}>
                                                {log.descricao}
                                            </td>
                                            <td className="px-3 py-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    {(() => {
                                                        const info = getModuloInfo(log.modulo);
                                                        const Icone = info.icone;
                                                        return (
                                                            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border ${info.bg} ${info.borda} ${info.cor}`}>
                                                                <Icone size={12} strokeWidth={2.5} />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">{info.label}</span>
                                                            </div>
                                                        );
                                                    })()}
                                                    
                                                    <div className="flex-1 flex flex-col items-end">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight truncate max-w-[80px]">
                                                            {log.entidade_tipo || '—'}
                                                        </span>
                                                        <div className={`mt-1 p-1 rounded-2xl transition-transform ${expandidoId === log.id ? 'rotate-180 bg-primary/10 text-primary' : 'text-slate-300'}`}>
                                                            <Activity size={12} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandidoId === log.id && (
                                            <tr className="bg-slate-950/20 animate-in slide-in-from-top-2 duration-300">
                                                <td colSpan={5} className="px-6 py-6 border-x border-border/20">
>>>>>>> 709151e (teste)
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
<<<<<<< HEAD
                    aoMudarItensPorPagina={handleMudarItensPorPagina}
                    desabilitado={carregando}
                />
            </div>
        </div>
    );
});
 
export default PainelLogs;
=======
                    aoMudarItensPorPagina={(num) => { setItensPorPagina(num); setPagina(1); }}
                    desabilitado={carregando}
                />
            </div>

        </div>
    );
}
>>>>>>> 709151e (teste)
