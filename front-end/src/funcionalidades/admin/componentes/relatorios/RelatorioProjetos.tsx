import { memo } from 'react';
import { 
    LayoutGrid, 
    Eye, 
    EyeOff, 
    AlertCircle, 
    ChevronRight,
    Search,
    BarChart3,
    TrendingUp
} from 'lucide-react';
import type { RelatorioProjeto } from '@/funcionalidades/admin/hooks/usarRelatorios';

interface RelatorioProjetosProps {
    projetos: RelatorioProjeto[];
}

export const RelatorioProjetos = memo(({ projetos }: RelatorioProjetosProps) => {
    return (
        <div className="space-y-10 animar-entrada pb-32">
            {/* Resumo de Projetos */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-xl shadow-slate-200 col-span-1 md:col-span-2 flex flex-col justify-between group">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-indigo-500 rounded-2xl"><BarChart3 size={20} /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Desenvolvimento</span>
                    </div>
                    <div>
                        <h2 className="text-4xl font-black tracking-tighter uppercase leading-none mb-2">Projetos em Execução</h2>
                        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Acompanhamento de {projetos?.length || 0} projetos ativos.</p>
                    </div>
                </div>
                
                <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Qualidade Geral</p>
                    <div className="flex items-end gap-2 text-slate-900">
                        <p className="text-5xl font-black leading-none">
                            {projetos.length > 0 
                                ? ((projetos.reduce((acc, p) => acc + p.concluidas, 0) / projetos.reduce((acc, p) => acc + (p.total_tarefas || 1), 0)) * 100).toFixed(0)
                                : '0'}%
                        </p>
                        <span className="text-emerald-500 font-black text-[10px] uppercase mb-1.5 px-3 py-1 bg-emerald-50 rounded-full">Eficiência</span>
                    </div>
                </div>

                <div className="bg-rose-50 border border-rose-100 rounded-[3rem] p-10 shadow-sm flex flex-col justify-center animate-pulse-slow">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">Pendências Críticas</p>
                    <div className="flex items-end gap-3 text-rose-600">
                        <p className="text-5xl font-black leading-none">{projetos.reduce((acc, p) => acc + p.urgentes_pendentes, 0)}</p>
                        <AlertCircle size={24} className="mb-2" />
                    </div>
                </div>
            </div>

            {/* Grid de Projetos */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {(projetos || []).map((p) => {
                    const progresso = p.total_tarefas > 0 ? (p.concluidas / p.total_tarefas) * 100 : 0;
                    const isCritico = p.urgentes_pendentes > 0;

                    return (
                        <div key={p.id} className="group bg-white border border-slate-100 rounded-[3rem] p-10 hover:shadow-2xl hover:shadow-slate-100 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden flex flex-col h-full shadow-sm">
                            <div className="flex items-start justify-between mb-10">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl ${isCritico ? 'bg-rose-500 shadow-rose-200' : 'bg-slate-900 shadow-slate-200'} transition-transform group-hover:scale-110 duration-500`}>
                                    <LayoutGrid size={24} />
                                </div>
                                <div className="flex items-center gap-2">
                                    {p.publico ? (
                                        <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                                            <Eye size={12} /> Público
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-400 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-slate-200">
                                            <EyeOff size={12} /> Interno
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mb-10 space-y-2">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-tight group-hover:text-indigo-600 transition-colors truncate">{p.nome}</h3>
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <Search size={14} /> ID: {p.id.split('-')[0]}
                                </div>
                            </div>

                            <div className="space-y-4 mb-12 flex-1">
                                <div className="flex items-end justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status de Entrega</p>
                                        <p className="text-xl font-black text-slate-900 tabular-nums">{p.concluidas} <span className="text-slate-200">/</span> {p.total_tarefas}</p>
                                    </div>
                                    <p className={`text-xl font-black tabular-nums ${progresso > 80 ? 'text-emerald-500' : 'text-slate-400'}`}>{progresso.toFixed(0)}%</p>
                                </div>
                                <div className="h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50 p-1">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                                            progresso > 70 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                                            progresso > 30 ? 'bg-gradient-to-r from-indigo-400 to-indigo-600' :
                                            'bg-gradient-to-r from-slate-300 to-slate-400'
                                        }`}
                                        style={{ width: `${progresso}%` }}
                                    >
                                        <div className="absolute top-0 right-0 h-full w-2 bg-white/10 blur-[2px]" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-10 border-t border-slate-50 flex items-center justify-between mt-auto">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Demandas Urgentes</span>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${isCritico ? 'bg-rose-500 animate-pulse' : 'bg-slate-200'}`} />
                                        <span className={`text-[12px] font-black uppercase tracking-tighter ${isCritico ? 'text-rose-600' : 'text-slate-400'}`}>
                                            {p.urgentes_pendentes} Pendente(s)
                                        </span>
                                    </div>
                                </div>
                                <button className="w-12 h-12 bg-slate-50 border border-slate-100 text-slate-400 rounded-[1.2rem] flex items-center justify-center hover:bg-slate-950 hover:text-white transition-all shadow-sm">
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Tabela de Projetos */}
            {projetos.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
                    <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                <TrendingUp size={22} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">Monitoramento de Backlog</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Visão geral do total de tarefas por projeto ativo no sistema.</p>
                            </div>
                        </div>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Nome do Projeto</th>
                                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100">Total de Tarefas</th>
                                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100">Saúde</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right border-b border-slate-100">Próximos Passos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {projetos.map(p => (
                                <tr key={p.id} className="group hover:bg-slate-50 transition-all cursor-default">
                                    <td className="px-10 py-8">
                                        <p className="text-base font-black text-slate-900 uppercase group-hover:text-indigo-600 transition-colors tracking-tighter">{p.nome}</p>
                                    </td>
                                    <td className="px-6 py-8 text-center text-xl font-black text-slate-800 tabular-nums">
                                        {p.total_tarefas}
                                    </td>
                                    <td className="px-6 py-8">
                                        <div className="flex justify-center">
                                            <div className={`w-3 h-3 rounded-full ${p.urgentes_pendentes > 0 ? 'bg-rose-500 animate-pulse shadow-xl shadow-rose-100' : 'bg-emerald-500 shadow-xl shadow-emerald-100'}`} />
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right text-[10px] font-black uppercase text-indigo-600 tracking-widest group-hover:translate-x-1 transition-transform">
                                        Ver Quadro Kanban
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
});
