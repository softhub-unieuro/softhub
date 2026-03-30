import { memo, useState } from 'react';
import { 
    TrendingUp, 
    ClipboardList, 
    LayoutGrid, 
    Trophy, 
    User, 
    Calendar, 
    CalendarDays, 
    ChevronRight,
    ArrowLeft,
    BarChart3,
    Zap,
    Sparkles,
    Shield,
    Download
} from 'lucide-react';
import { usarRelatorios } from '@/funcionalidades/admin/hooks/usarRelatorios';
import { Carregando } from '@/compartilhado/componentes/Carregando';

// Importação dos sub-relatórios individuais
import { RelatorioPresenca } from './relatorios/RelatorioPresenca';
import { RelatorioIndividual } from './relatorios/RelatorioIndividual';
import { RelatorioGradeSemestral } from './relatorios/RelatorioGradeSemestral';
import { RelatorioDesempenho } from './relatorios/RelatorioDesempenho';
import { RelatorioProjetos } from './relatorios/RelatorioProjetos';
import { RelatorioAusencias } from './relatorios/RelatorioAusencias';

type TipoRelatorio = 'presenca' | 'individual' | 'grade' | 'desempenho' | 'projeto' | 'ausencias';

export default function PaginaRelatorios() {
    const [hoje] = useState(new Date().toISOString().split('T')[0]);
    const [dataInicio, setDataInicio] = useState('2025-01-01');
    const [dataFim, setDataFim] = useState(hoje);
    const [relatorioAtivo, setRelatorioAtivo] = useState<TipoRelatorio | null>(null);

    const { 
        frequenciaGeral, 
        frequenciaMembros, 
        projetosRelatorio, 
        desempenhoRelatorio,
        carregando, 
        exportarPonto,
        exportarMapaSemestral 
    } = usarRelatorios(dataInicio, dataFim);

    const menuRelatorios = [
        { 
            id: 'presenca' as TipoRelatorio, 
            titulo: 'Presença Coletiva', 
            subtitulo: 'Frequência Geral da Equipe',
            icone: <TrendingUp size={24} />, 
            cor: 'bg-blue-600',
            descricao: 'Visão macro do registro de ponto dos membros.'
        },
        { 
            id: 'individual' as TipoRelatorio, 
            titulo: 'Extrato Individual', 
            subtitulo: 'Relatório por Membro',
            icone: <User size={24} />, 
            cor: 'bg-indigo-600',
            descricao: 'Histórico completo de um colaborador específico.'
        },
        { 
            id: 'projeto' as TipoRelatorio, 
            titulo: 'Saúde de Projetos', 
            subtitulo: 'Status de Desenvolvimento',
            icone: <LayoutGrid size={24} />, 
            cor: 'bg-emerald-600',
            descricao: 'Métricas de entrega e backlog de cada projeto.'
        },
        { 
            id: 'grade' as TipoRelatorio, 
            titulo: 'Grade Semestral', 
            subtitulo: 'Acompanhamento do Ciclo',
            icone: <CalendarDays size={24} />, 
            cor: 'bg-amber-600',
            descricao: 'Mapa visual de assiduidade ao longo do semestre.'
        },
        { 
            id: 'desempenho' as TipoRelatorio, 
            titulo: 'Ranking de Entregas', 
            subtitulo: 'Volume de Produção',
            icone: <Trophy size={24} />, 
            cor: 'bg-purple-600',
            descricao: 'Membros com maior volume de tarefas concluídas.'
        },
        { 
            id: 'ausencias' as TipoRelatorio, 
            titulo: 'Justificativas', 
            subtitulo: 'Auditoria de Faltas',
            icone: <ClipboardList size={24} />, 
            cor: 'bg-rose-600',
            descricao: 'Controle de abonos e declarações de ausência.'
        }
    ];

    const exportarDadosGerais = () => {
        exportarPonto();
    };

    const renderizarRelatorio = () => {
        if (carregando) return <div className="py-20 flex justify-center"><Carregando Centralizar={true} /></div>;

        switch (relatorioAtivo) {
            case 'presenca': return <RelatorioPresenca frequenciaGeral={frequenciaGeral} />;
            case 'projeto': return <RelatorioProjetos projetos={projetosRelatorio} />;
            case 'desempenho': return <RelatorioDesempenho desempenho={desempenhoRelatorio} />;
            case 'individual': return <RelatorioIndividual membros={frequenciaMembros} dataInicio={dataInicio} dataFim={dataFim} />;
            case 'grade': return <RelatorioGradeSemestral membros={frequenciaMembros} onExportar={exportarMapaSemestral} />;
            case 'ausencias': return <RelatorioAusencias frequenciaGeral={frequenciaGeral} />;
            default: return null;
        }
    };

    return (
        <div className="px-6 space-y-12">
            {/* Cabeçalho de Relatórios */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 ">
                <div className="space-y-4">
                    {relatorioAtivo ? (
                        <button 
                            onClick={() => setRelatorioAtivo(null)}
                            className="group flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest hover:gap-3 transition-all mb-4 bg-primary/5 px-6 py-3 rounded-2xl w-fit"
                        >
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
                            Voltar para o Início
                        </button>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
                                <BarChart3 size={20} />
                            </div>
                            <span className="px-4 py-1.5 bg-primary/5 text-primary border border-primary/10 rounded-xl text-[10px] font-black uppercase tracking-widest leading-none">
                                Analítica & Dados
                            </span>
                        </div>
                    )}
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                        {relatorioAtivo ? menuRelatorios.find(m => m.id === relatorioAtivo)?.titulo : 'Painel de Relatórios'}
                    </h1>
                    <p className="text-slate-400 font-bold text-sm max-w-xl">
                        {relatorioAtivo 
                            ? menuRelatorios.find(m => m.id === relatorioAtivo)?.subtitulo 
                            : 'Gerencie a performance, frequência e entregas da Fábrica de Software em um só lugar.'}
                    </p>
                </div>

                {!relatorioAtivo && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                             <div className="space-y-1">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Período de Análise</label>
                                 <div className="flex items-center gap-3">
                                     <input 
                                         type="date" 
                                         value={dataInicio}
                                         onChange={(e) => setDataInicio(e.target.value)}
                                         className="bg-transparent border-none outline-none text-xs font-black text-slate-700"
                                     />
                                     <span className="text-slate-300">→</span>
                                     <input 
                                         type="date" 
                                         value={dataFim}
                                         onChange={(e) => setDataFim(e.target.value)}
                                         className="bg-transparent border-none outline-none text-xs font-black text-slate-700"
                                     />
                                 </div>
                             </div>
                        </div>
                        <button 
                            onClick={exportarDadosGerais}
                            className="w-full h-14 bg-slate-900 text-white rounded-3xl flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest hover:bg-primary transition-all active:scale-95 shadow-xl shadow-slate-200"
                        >
                            <Download size={18} strokeWidth={3} /> Baixar Dados Gerais
                        </button>
                    </div>
                )}
            </div>

            {/* Hub de Módulos (Grid ou Visualização) */}
            {!relatorioAtivo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {menuRelatorios.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setRelatorioAtivo(item.id)}
                            className="group relative bg-white border border-slate-100 p-10 text-left rounded-[3rem] hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                        >
                            <div className={`p-4 ${item.cor} text-white rounded-2xl w-fit mb-8 shadow-xl shadow-slate-100 group-hover:scale-110 transition-transform`}>
                                {item.icone}
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none group-hover:text-primary transition-colors">{item.titulo}</h3>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                    {item.descricao}
                                </p>
                            </div>

                            <div className="mt-8 flex items-center gap-2">
                                 <div className="h-1 flex-1 bg-slate-50 rounded-full overflow-hidden">
                                     <div className={`h-full bg-primary w-8 group-hover:w-full transition-all duration-700`} />
                                 </div>
                                 <ChevronRight size={14} className="text-slate-200 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="animar-entrada">
                    {renderizarRelatorio()}
                </div>
            )}
        </div>
    );
}

function CalendarDay(props: any) {
    return <Calendar {...props} />;
}
