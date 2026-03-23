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
    Search,
    ArrowLeft,
    ChevronRight,
    TrendingUp,
    ShieldCheck,
    Grid3X3,
    Table,
    FileSpreadsheet
} from 'lucide-react';
import { usarRelatorios } from '@/funcionalidades/admin/hooks/usarRelatorios';
import { Alerta } from '@/compartilhado/componentes/Alerta';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';

import { RelatorioPresenca } from '@/funcionalidades/admin/componentes/relatorios/RelatorioPresenca';
import { RelatorioAusencias } from '@/funcionalidades/admin/componentes/relatorios/RelatorioAusencias';
import { RelatorioProjetos } from '@/funcionalidades/admin/componentes/relatorios/RelatorioProjetos';
import { RelatorioDesempenho } from '@/funcionalidades/admin/componentes/relatorios/RelatorioDesempenho';
import { RelatorioIndividual } from '@/funcionalidades/admin/componentes/relatorios/RelatorioIndividual';
import { RelatorioGradeSemestral } from '@/funcionalidades/admin/componentes/relatorios/RelatorioGradeSemestral';

/**
 * HUB DE INTELIGÊNCIA - Central de Relatórios
 * Integrado à identidade visual padrão do sistema com estilo premium.
 */
const PaginaRelatorios = memo(() => {
    // SEMESTRES (Ref DX-005)
    const [dataInicio, setDataInicio] = useState('2025-01-01');
    const [dataFim, setDataFim] = useState('2025-06-30');
    const [abaAtiva, setAbaAtiva] = useState<null | 'presenca' | 'justificativas' | 'individual' | 'projetos' | 'desempenho' | 'grade'>(null);
    
    const { 
        frequenciaGeral, 
        frequenciaMembros, 
        projetosRelatorio,
        desempenhoRelatorio,
        carregando, 
        erro,
        exportarPonto,
        exportarMapaSemestral,
        recarregar 
    } = usarRelatorios(dataInicio, dataFim);

    const [busca, setBusca] = useState('');

    const membrosFiltrados = useMemo(() => {
        return (frequenciaMembros || []).filter((m: any) => 
            m.nome.toLowerCase().includes(busca.toLowerCase()) || 
            m.email.toLowerCase().includes(busca.toLowerCase())
        );
    }, [frequenciaMembros, busca]);

    const DIMENSOES = useMemo(() => [
        { id: 'presenca', titulo: 'Frequência Geral', subtitulo: 'Visão Coletiva de Ponto', icone: BarChart4, cor: 'from-primary to-blue-600', sombra: 'shadow-primary/10', info: 'Volume de acessos diários, assiduidade média e fluxo da fábrica.' },
        { id: 'grade', titulo: 'Grade de Assiduidade', subtitulo: 'Mapa Mensal Membro x Dia', icone: Grid3X3, cor: 'from-emerald-600 to-teal-700', sombra: 'shadow-emerald-500/10', info: 'Grade completa do semestre para auditoria acadêmica consolidada.' },
        { id: 'individual', titulo: 'Extrato por Membro', subtitulo: 'Auditoria Individual', icone: ShieldCheck, cor: 'from-blue-600 to-indigo-800', sombra: 'shadow-indigo-500/10', info: 'Linha do tempo detalhada, sessões e IPs de uma pessoa específica.' },
        { id: 'justificativas', titulo: 'Justificativas de Ponto', subtitulo: 'Gestão de Ausências', icone: ClipboardList, cor: 'from-amber-500 to-orange-500', sombra: 'shadow-amber-500/10', info: 'Controle de atestados, faltas justificadas e pendências de audit.' },
        { id: 'desempenho', titulo: 'Ranking de Produtividade', subtitulo: 'Desempenho Técnico', icone: Zap, cor: 'from-purple-500 to-violet-600', sombra: 'shadow-violet-500/10', info: 'Ranking de tarefas entregues e engajamento produtivo dos membros.' },
        { id: 'projetos', titulo: 'Status de Projetos', subtitulo: 'Saúde do Backlog', icone: LayoutGrid, cor: 'from-rose-500 to-pink-500', sombra: 'shadow-rose-500/10', info: 'Progresso das entregas, tarefas atrasadas e volume por cada projeto.' },
    ], []);

    return (
        <div className="w-full h-full flex flex-col space-y-8 animar-entrada">
            <CabecalhoFuncionalidade
                titulo={abaAtiva ? DIMENSOES.find(d => d.id === abaAtiva)?.titulo || 'Relatórios' : "Inteligência & Relatórios"}
                subtitulo={abaAtiva ? DIMENSOES.find(d => d.id === abaAtiva)?.info || '' : "Supervisão estratégica e monitoramento preditivo de todas as dimensões."}
                icone={abaAtiva ? DIMENSOES.find(d => d.id === abaAtiva)?.icone || FileSearch : FileSearch}
            >
                {/* Ações Dinâmicas no Cabeçalho */}
                <div className="flex items-center gap-3">
                    {abaAtiva && (
                        <button 
                            onClick={() => setAbaAtiva(null)}
                            className="h-11 px-4 bg-muted/30 text-muted-foreground border border-border/40 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-muted/50 transition-all"
                        >
                            <ArrowLeft size={16} />
                            <span>HUB</span>
                        </button>
                    )}

                    {(abaAtiva === 'desempenho') && (
                        <div className="relative group/search max-w-xs">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" size={14} />
                            <input
                                placeholder="Filtrar membro..."
                                value={busca}
                                onChange={e => setBusca(e.target.value)}
                                className="h-11 w-64 bg-background border border-border rounded-2xl pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/30 font-medium"
                            />
                        </div>
                    )}

                    <button 
                        onClick={recarregar} 
                        disabled={carregando}
                        className="h-11 px-6 bg-primary text-white rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        <Activity size={18} className={carregando ? 'animate-spin' : ''} />
                        <span>{carregando ? 'GERANDO...' : 'ATUALIZAR'}</span>
                    </button>
                </div>
            </CabecalhoFuncionalidade>

            {/* View do HUB de Seleção */}
            {!abaAtiva ? (
                <div className="space-y-8">
                    {/* Cards de Métricas Rápidas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="p-8 bg-white border border-border/40 rounded-[2rem] shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Audit em Tempo Real</p>
                                <p className="text-3xl font-black text-foreground tracking-tighter">{frequenciaMembros.length} Membros</p>
                            </div>
                            <div className="w-14 h-14 bg-primary/5 text-primary rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
                                <ShieldCheck size={28} />
                            </div>
                        </div>
                        <div className="p-8 bg-white border border-border/40 rounded-[2rem] shadow-sm flex items-center justify-between group hover:border-rose-200 transition-all">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Esteira de Produção</p>
                                <p className="text-3xl font-black text-foreground tracking-tighter">{projetosRelatorio.length} Projetos</p>
                            </div>
                            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
                                <LayoutGrid size={28} />
                            </div>
                        </div>
                        <div className="p-8 bg-white border border-border/40 rounded-[2rem] shadow-sm flex items-center justify-between group hover:border-violet-200 transition-all">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Último Ciclo</p>
                                <p className="text-3xl font-black text-foreground tracking-tighter">Ativo</p>
                            </div>
                            <div className="w-14 h-14 bg-violet-50 text-violet-500 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
                                <Zap size={28} />
                            </div>
                        </div>
                    </div>

                    {/* Grid de Dimensões Acadêmicas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {DIMENSOES.map((dim, index) => (
                            <button
                                key={dim.id}
                                onClick={() => setAbaAtiva(dim.id as any)}
                                className={`flex flex-col p-8 bg-white border border-border/40 rounded-[2rem] text-left transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 group animar-entrada atraso-${index + 1}`}
                            >
                                <div className={`w-14 h-14 bg-gradient-to-br ${dim.cor} rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform`}>
                                    <dim.icone size={26} />
                                </div>
                                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{dim.titulo}</h3>
                                <h4 className="text-xl font-bold text-foreground mb-2">{dim.subtitulo}</h4>
                                <p className="text-xs text-muted-foreground/60 leading-relaxed line-clamp-2">{dim.info}</p>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-8 pb-20">
                    {/* Barra de Filtros e Período */}
                    <div className="flex flex-wrap items-center gap-4 p-5 bg-muted/10 border border-border/40 rounded-[2rem]">
                        <div className="flex items-center gap-3 bg-background px-4 py-2.5 border border-border rounded-xl">
                            <TrendingUp size={14} className="text-muted-foreground" />
                            <select 
                                className="bg-transparent border-none text-[10px] font-black text-foreground focus:ring-0 uppercase tracking-widest cursor-pointer p-0"
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const periodos: any = {
                                        '2025.1': ['2025-01-01', '2025-06-30'],
                                        '2025.2': ['2025-07-01', '2025-12-31'],
                                        '2026.1': ['2026-01-01', '2026-06-30'],
                                        '2026.2': ['2026-07-01', '2026-12-31'],
                                    };
                                    if (periodos[val]) { setDataInicio(periodos[val][0]); setDataFim(periodos[val][1]); }
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled>SEMESTRE</option>
                                <option value="2025.1">2025.1</option>
                                <option value="2025.2">2025.2</option>
                                <option value="2026.1">2026.1</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-3 bg-background px-4 py-2.5 border border-border rounded-xl">
                            <Calendar size={14} className="text-muted-foreground" />
                            <div className="flex items-center gap-3">
                                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="bg-transparent border-none text-xs font-bold text-foreground p-0 focus:ring-0" />
                                <span className="text-border">➔</span>
                                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="bg-transparent border-none text-xs font-bold text-foreground p-0 focus:ring-0" />
                            </div>
                        </div>

                        <div className="flex-1" />

                        <div className="flex items-center gap-2">
                            {abaAtiva === 'presenca' && (
                                <button 
                                    onClick={exportarPonto}
                                    className="h-10 px-5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all"
                                >
                                    <Download size={16} />
                                    <span>Ponto</span>
                                </button>
                            )}
                            {abaAtiva === 'grade' && (
                                <button 
                                    onClick={exportarMapaSemestral}
                                    className="h-10 px-5 bg-teal-50 text-teal-600 border border-teal-100 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-teal-100 transition-all"
                                >
                                    <FileSpreadsheet size={16} />
                                    <span>Grade Completa</span>
                                </button>
                            )}
                            <button 
                                onClick={() => window.print()}
                                className="h-10 w-10 bg-background border border-border rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                            >
                                <Printer size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Exibição dos Relatórios Contextuais */}
                    {erro && <Alerta tipo="erro" mensagem={erro} />}

                    {carregando && frequenciaMembros.length === 0 ? (
                        <Carregando Centralizar={true} />
                    ) : (
                        <div className="animar-entrada">
                            {abaAtiva === 'presenca' && frequenciaGeral && <RelatorioPresenca frequenciaGeral={frequenciaGeral} />}
                             {abaAtiva === 'justificativas' && frequenciaGeral && <RelatorioAusencias frequenciaGeral={frequenciaGeral} />}
                            {abaAtiva === 'projetos' && projetosRelatorio && <RelatorioProjetos projetos={projetosRelatorio} />}
                            {abaAtiva === 'desempenho' && desempenhoRelatorio && <RelatorioDesempenho desempenho={desempenhoRelatorio} />}
                            {abaAtiva === 'individual' && <RelatorioIndividual membros={frequenciaMembros} dataInicio={dataInicio} dataFim={dataFim} />}
                            {abaAtiva === 'grade' && <RelatorioGradeSemestral membros={frequenciaMembros} onExportar={exportarMapaSemestral} />}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

export default PaginaRelatorios;
