import { memo } from 'react';
import { LayoutGrid, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import type { RelatorioProjeto } from '@/funcionalidades/admin/hooks/usarRelatorios';

interface RelatorioProjetosProps {
    projetos: RelatorioProjeto[];
}

export const RelatorioProjetos = memo(({ projetos }: RelatorioProjetosProps) => {
    return (
        <div className="space-y-8">
            {/* Grid de Cards de Projetos */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {projetos.map((p) => {
                    const progresso = p.total_tarefas > 0 ? Math.round((p.concluidas / p.total_tarefas) * 100) : 0;
                    
                    return (
                        <div key={p.id} className="group relative bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500 overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />
                            
                            <div className="flex items-start justify-between mb-8 relative">
                                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform duration-500 shadow-sm border border-indigo-100/50">
                                    <LayoutGrid size={24} />
                                </div>
                                <div className="text-right">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${p.publico ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                        {p.publico ? 'Público' : 'Interno'}
                                    </span>
                                </div>
                            </div>

                            <h4 className="text-xl font-black text-slate-900 tracking-tighter uppercase mb-2 group-hover:text-indigo-600 transition-colors">
                                {p.nome}
                            </h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Status de Entregas</p>

                            <div className="space-y-6">
                                {/* Barra de Progresso */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400">Progresso</span>
                                        <span className="text-indigo-600">{progresso}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                        <div 
                                            className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${progresso}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Métricas */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                                        <div className="flex items-center gap-2 mb-1 text-emerald-500">
                                            <CheckCircle2 size={12} />
                                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Concluídas</span>
                                        </div>
                                        <p className="text-lg font-black text-slate-900 leading-none tabular-nums">{p.concluidas}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                                        <div className="flex items-center gap-2 mb-1 text-amber-500">
                                            <Clock size={12} />
                                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Em Aberto</span>
                                        </div>
                                        <p className="text-lg font-black text-slate-900 leading-none tabular-nums">{p.em_aberto}</p>
                                    </div>
                                </div>

                                {p.urgentes_pendentes > 0 && (
                                    <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600">
                                        <AlertTriangle size={14} className="animate-pulse" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                            {p.urgentes_pendentes} {p.urgentes_pendentes === 1 ? 'Demanda Urgente' : 'Demandas Urgentes'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tabela Detalhada (Opcional, se houver muitos projetos) */}
            {projetos.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                <TrendingUp size={22} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none mb-1">Visão Geral do Backlog</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Total acumulado e volume por projeto ativo.</p>
                            </div>
                        </div>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-10 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Projeto</th>
                                <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Total</th>
                                <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Saúde</th>
                                <th className="px-10 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {projetos.map(p => (
                                <tr key={p.id} className="group hover:bg-slate-50/50 transition-all">
                                    <td className="px-10 py-6">
                                        <p className="text-[11px] font-black text-slate-800 uppercase group-hover:text-indigo-600 transition-colors">{p.nome}</p>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <span className="text-[11px] font-black text-slate-600">{p.total_tarefas}</span>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex justify-center">
                                            <div className={`w-2 h-2 rounded-full ${p.urgentes_pendentes > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right text-[10px] font-black uppercase text-indigo-600">
                                        Ver No Quadro
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
