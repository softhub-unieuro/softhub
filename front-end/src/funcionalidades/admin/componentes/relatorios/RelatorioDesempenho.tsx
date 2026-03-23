import { memo } from 'react';
import { Trophy, CheckCircle2, Clock, Zap, Target, Star } from 'lucide-react';
import type { RelatorioDesempenhoMembro } from '@/funcionalidades/admin/hooks/usarRelatorios';
import { formatarDataHora } from '@/utilitarios/formatadores';

interface RelatorioDesempenhoProps {
    desempenho: RelatorioDesempenhoMembro[];
}

export const RelatorioDesempenho = memo(({ desempenho }: RelatorioDesempenhoProps) => {
    return (
        <div className="space-y-8">
            {/* Top 3 Destaques */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(desempenho || []).slice(0, 3).map((m, index) => (
                    <div key={m.id} className="relative bg-white border border-slate-100 rounded-[3rem] p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500 overflow-hidden text-center group">
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 transition-colors ${
                            index === 0 ? 'bg-amber-400/10' : index === 1 ? 'bg-slate-500/10' : 'bg-orange-500/10'
                        }`} />
                        
                        <div className="mb-6 flex justify-center">
                            <div className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center relative border-4 ${
                                index === 0 ? 'bg-amber-50 border-amber-200 text-amber-500' : 
                                index === 1 ? 'bg-slate-50 border-slate-200 text-slate-500' : 
                                'bg-orange-50 border-orange-200 text-orange-600'
                            }`}>
                                <Trophy size={32} />
                                <span className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center text-xs font-black text-white ${
                                    index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-slate-400' : 'bg-orange-500'
                                } shadow-md`}>
                                    {index + 1}
                                </span>
                            </div>
                        </div>

                        <h4 className="text-lg font-black text-slate-900 tracking-tighter uppercase mb-1">
                            {m.nome.split(' ')[0]}
                        </h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.email}</p>

                        <div className="mt-8 grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Entregas</p>
                                <p className="text-2xl font-black text-slate-900 leading-none">{m.entregas_totais}</p>
                            </div>
                            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/50">
                                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Andamento</p>
                                <p className="text-2xl font-black text-indigo-700 leading-none">{m.em_andamento}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quadro Geral de Produtividade */}
            <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                            <Zap size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none mb-1">Ranking de Produtividade</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Melhores entregadores e engajamento técnico.</p>
                        </div>
                    </div>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-10 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Membro</th>
                            <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Entregas</th>
                            <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Foco Atual</th>
                            <th className="px-10 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Última Entrega</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {(desempenho || []).map((m, index) => (
                            <tr key={m.id} className="group hover:bg-slate-50/50 transition-all">
                                <td className="px-10 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-[12px] bg-slate-900/5 !text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all`}>
                                            {m.nome.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1 group-hover:text-indigo-600 transition-colors">{m.nome}</p>
                                            <p className="text-[10px] text-slate-400 font-bold leading-none">{m.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-6 text-center">
                                    <span className="text-[11px] font-black text-slate-800 tabular-nums">{m.entregas_totais}</span>
                                </td>
                                <td className="px-6 py-6 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${m.em_andamento > 3 ? 'bg-indigo-500 animate-pulse' : m.em_andamento > 0 ? 'bg-indigo-400' : 'bg-slate-200'}`} />
                                        <span className="text-[10px] font-bold text-slate-500">{m.em_andamento} {m.em_andamento === 1 ? 'Tarefa' : 'Tarefas'}</span>
                                    </div>
                                </td>
                                <td className="px-10 py-6 text-right">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                        {m.ultima_entrega ? formatarDataHora(m.ultima_entrega) : 'Nunca entregou'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});
