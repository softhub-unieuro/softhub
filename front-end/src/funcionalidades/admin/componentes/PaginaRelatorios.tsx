import { useState, useMemo, memo } from 'react';
import { 
    Calendar,
    Activity,
    ClipboardList,
    Printer,
    FileSearch,
    BarChart4,
    UserCheck,
    Map,
    Download,
    LayoutGrid,
    Zap,
    Search
} from 'lucide-react';
import { usarRelatorios } from '@/funcionalidades/admin/hooks/usarRelatorios';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { Alerta } from '@/compartilhado/componentes/Alerta';
import { Carregando } from '@/compartilhado/componentes/Carregando';

import { RelatorioPresenca } from '@/funcionalidades/admin/componentes/relatorios/RelatorioPresenca';
import { RelatorioAusencias } from '@/funcionalidades/admin/componentes/relatorios/RelatorioAusencias';
import { RelatorioMembros } from '@/funcionalidades/admin/componentes/relatorios/RelatorioMembros';
import { RelatorioMapeamento } from '@/funcionalidades/admin/componentes/relatorios/RelatorioMapeamento';
import { RelatorioProjetos } from '@/funcionalidades/admin/componentes/relatorios/RelatorioProjetos';
import { RelatorioDesempenho } from '@/funcionalidades/admin/componentes/relatorios/RelatorioDesempenho';

/**
 * Pagina de Relatórios - Versão Relatórios Essenciais e Estruturados.
 * Focada em 6 pilares fundamentais: Frequência, Justificativas, Alocação, Projetos e Desempenho e Mapeamento.
 */
const PaginaRelatorios = memo(() => {
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [abaAtiva, setAbaAtiva] = useState<'presenca' | 'justificativas' | 'equipes' | 'alunos' | 'projetos' | 'desempenho'>('presenca');
    
    const { 
        equipesRelatorio, 
        frequenciaGeral, 
        frequenciaMembros, 
        projetosRelatorio,
        desempenhoRelatorio,
        carregando, 
        erro,
        exportarPonto,
        recarregar 
    } = usarRelatorios(dataInicio, dataFim);

    const [busca, setBusca] = useState('');

    const membrosFiltrados = useMemo(() => {
        return (frequenciaMembros || []).filter((m: any) => 
            m.nome.toLowerCase().includes(busca.toLowerCase()) || 
            m.email.toLowerCase().includes(busca.toLowerCase())
        );
    }, [frequenciaMembros, busca]);

    // Relatórios Essenciais Definidos
    const ABAS_ESSENCIAIS = useMemo(() => [
        { id: 'presenca', label: 'Consolidado de Presenças', icone: BarChart4, info: 'Visão volumétrica e tendências diárias.' },
        { id: 'justificativas', label: 'Controle de Ausências', icone: ClipboardList, info: 'Gestão de justificativas e motivos de falta.' },
        { id: 'alunos', label: 'Auditoria de Membros', icone: UserCheck, info: 'Frequência individual e status de engajamento.' },
        { id: 'projetos', label: 'Desempenho de Projetos', icone: LayoutGrid, info: 'Progresso, saúde e entregas por produto.' },
        { id: 'desempenho', label: 'Produtividade Técnica', icone: Zap, info: 'Ranking de entregas e foco dos membros.' },
        { id: 'equipes', label: 'Mapeamento Estrutural', icone: Map, info: 'Organização de equipes e grupos operativos.' },
    ], []);

    return (
        <div className="w-full space-y-8 pb-20 animar-entrada max-w-[1600px] mx-auto px-4 sm:px-6">
            <CabecalhoFuncionalidade 
                titulo="Central de Relatórios"
                subtitulo="Acesse as métricas fundamentais para monitoramento e tomada de decisão estratégica."
                icone={FileSearch}
            />

            {/* Filtros e Seleção de Relatório Essencial */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Seletor de Relatórios (Esquerda) */}
                <div className="lg:col-span-1 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2">Selecione uma Dimensão</p>
                    {ABAS_ESSENCIAIS.map((aba, index) => (
                        <button
                            key={aba.id}
                            onClick={() => setAbaAtiva(aba.id as any)}
                            className={`w-full flex items-center gap-4 p-5 rounded-[2rem] border transition-all text-left group animar-entrada atraso-${index + 1} ${
                                abaAtiva === aba.id 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600'
                            }`}
                        >
                            <div className={`p-3 rounded-2xl ${abaAtiva === aba.id ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100 transition-colors'}`}>
                                <aba.icone size={20} />
                            </div>
                            <div>
                                <p className={`text-xs font-black uppercase tracking-widest leading-none ${abaAtiva === aba.id ? 'text-white' : 'text-slate-800'}`}>
                                    {aba.label}
                                </p>
                                <p className={`text-[10px] mt-1 font-medium ${abaAtiva === aba.id ? 'text-indigo-100' : 'text-slate-400 group-hover:text-slate-500'}`}>
                                    {aba.info}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Conteúdo do Relatório Selecionado (Direita) */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Barra de Período e Ações Integrada */}
                    <div className="flex flex-col xl:flex-row items-center justify-between gap-6 p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem]">
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                            <div className="flex items-center gap-3 bg-white px-5 py-3 border border-slate-200 rounded-2xl shadow-sm w-full sm:w-auto">
                                <Calendar size={16} className="text-slate-400" />
                                <div className="flex items-center gap-2">
                                    <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="bg-transparent border-none text-xs font-black text-slate-900 p-0 focus:ring-0" title="Data Inicial" />
                                    <span className="text-[10px] font-black text-slate-300">➔</span>
                                    <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="bg-transparent border-none text-xs font-black text-slate-900 p-0 focus:ring-0" title="Data Final" />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button onClick={() => window.print()} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                                    <Printer size={18} />
                                </button>
                                
                                {abaAtiva === 'presenca' && (
                                    <button 
                                        onClick={exportarPonto}
                                        className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 hover:bg-emerald-100 transition-all shadow-sm flex items-center gap-2 px-6"
                                    >
                                        <Download size={18} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Exportar CSV</span>
                                    </button>
                                )}

                                <button onClick={recarregar} disabled={carregando} className="flex items-center gap-3 px-8 py-3 bg-indigo-600 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50">
                                    <Activity size={18} className={carregando ? 'animate-spin' : ''} />
                                    <span>{carregando ? 'GERANDO...' : 'ATUALIZAR'}</span>
                                </button>
                            </div>
                        </div>
                        
                        {(abaAtiva === 'alunos' || abaAtiva === 'desempenho') && (
                            <div className="relative w-full xl:w-72 group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Consultar membro..."
                                    value={busca}
                                    onChange={(e) => setBusca(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-14 pr-6 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all outline-none shadow-sm"
                                />
                            </div>
                        )}
                    </div>

                    {erro && <Alerta tipo="erro" mensagem={erro} />}

                    {carregando && frequenciaMembros.length === 0 ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-32 bg-card/60 border border-border/40 rounded-3xl" />
                                ))}
                            </div>
                            <Carregando Centralizar={true} />
                        </div>
                    ) : (
                        <div className="animar-entrada atraso-1">
                            
                            {/* ── RELATÓRIO: CONSOLIDADO DE PRESENÇAS ── */}
                            {abaAtiva === 'presenca' && frequenciaGeral && (
                                <RelatorioPresenca frequenciaGeral={frequenciaGeral} />
                            )}

                            {/* ── RELATÓRIO: CONTROLE DE AUSÊNCIAS ── */}
                            {abaAtiva === 'justificativas' && frequenciaGeral && (
                                <RelatorioAusencias frequenciaGeral={frequenciaGeral} />
                            )}

                            {/* ── RELATÓRIO: AUDITORIA DE MEMBROS ── */}
                            {abaAtiva === 'alunos' && frequenciaMembros && (
                                <RelatorioMembros membrosFiltrados={membrosFiltrados} />
                            )}

                            {/* ── RELATÓRIO: DESEMPENHO DE PROJETOS ── */}
                            {abaAtiva === 'projetos' && projetosRelatorio && (
                                <RelatorioProjetos projetos={projetosRelatorio} />
                            )}

                            {/* ── RELATÓRIO: PRODUTIVIDADE TÉCNICA ── */}
                            {abaAtiva === 'desempenho' && desempenhoRelatorio && (
                                <RelatorioDesempenho desempenho={desempenhoRelatorio} />
                            )}

                            {/* ── RELATÓRIO: MAPEAMENTO ESTRUTURAL ── */}
                            {abaAtiva === 'equipes' && equipesRelatorio && (
                                <RelatorioMapeamento equipesRelatorio={equipesRelatorio} />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default PaginaRelatorios;
