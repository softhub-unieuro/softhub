import { memo } from 'react';
import { Trophy, Zap, Star, Medal, Target, Flame } from 'lucide-react';
import type { RelatorioDesempenhoMembro } from '@/funcionalidades/admin/hooks/usarRelatorios';

interface RelatorioDesempenhoProps {
    desempenho: RelatorioDesempenhoMembro[];
}

export const RelatorioDesempenho = memo(({ desempenho }: RelatorioDesempenhoProps) => {
    const topo = (desempenho || []).slice(0, 3);
    const resto = (desempenho || []).slice(3);

    return (
        <div className="space-y-12 animar-entrada pb-32">
            {/* Destaques do Ranking */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-end pt-12">
                {topo.length > 0 && [topo[1], topo[0], topo[2]].map((m, index) => {
                    if (!m) return <div key={index} className="hidden md:block" />;
                    
                    const isPrimeiro = m.id === topo[0].id;
                    const rankIndex = isPrimeiro ? 1 : (m.id === topo[1]?.id ? 2 : 3);

                    return (
                        <div 
                            key={m.id} 
                            className={`relative bg-white border border-slate-100 p-12 text-center rounded-[3rem] shadow-sm hover:shadow-2xl transition-all duration-700 group ${
                                isPrimeiro ? 'md:order-2 md:pb-20 md:-translate-y-8 scale-110 border-amber-400/50 shadow-amber-500/5' : 
                                rankIndex === 2 ? 'md:order-1' : 'md:order-3'
                            }`}
                        >
                            {isPrimeiro && (
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2 bg-amber-400 text-amber-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl animate-bounce">
                                    <Star size={12} fill="currentColor" /> MVP da Semana
                                </div>
                            )}

                            <div className="mb-10 flex justify-center">
                                <div className={`w-28 h-28 rounded-[2rem] flex items-center justify-center relative border-[6px] shadow-2xl transition-all duration-700 group-hover:rotate-[360deg] ${
                                    isPrimeiro ? 'bg-amber-400 border-white text-white' : 
                                    rankIndex === 2 ? 'bg-slate-400 border-white text-white' : 
                                    'bg-orange-600 border-white text-white'
                                }`}>
                                    {isPrimeiro ? <Trophy size={48} /> : rankIndex === 2 ? <Medal size={48} /> : <Target size={48} />}
                                    
                                    <span className={`absolute -bottom-3 -right-3 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center text-sm font-black text-white ${
                                        isPrimeiro ? 'bg-amber-500 shadow-amber-200' : 
                                        rankIndex === 2 ? 'bg-slate-400 shadow-slate-200' : 
                                        'bg-orange-700 shadow-orange-200'
                                    } shadow-lg`}>
                                        {rankIndex}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className={`font-black text-slate-900 tracking-tighter uppercase mb-1 truncate ${isPrimeiro ? 'text-3xl' : 'text-xl'}`}>
                                    {m.nome}
                                </h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.email}</p>
                            </div>

                            <div className="mt-12 grid grid-cols-2 gap-4">
                                <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl group-hover:bg-white group-hover:border-indigo-100 transition-colors">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Entregas</p>
                                    <p className="text-4xl font-black text-slate-900 leading-none tabular-nums">{m.entregas_totais}</p>
                                </div>
                                <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl group-hover:bg-indigo-600 transition-colors text-white">
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Pontuação</p>
                                    <div className="flex items-center justify-center gap-1">
                                        <Zap size={14} fill="currentColor" className="text-amber-400" />
                                        <p className="text-4xl font-black leading-none tabular-nums">{(m.entregas_totais * 1.25 + m.em_andamento * 0.25).toFixed(0)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Ranking de Produtividade */}
            <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
                <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/20">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200">
                            <Flame size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">Ranking de Produtividade</h3>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-none">Classificação completa de membros por volume de entregas registradas.</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Posição & Nome</th>
                                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100">Entregues</th>
                                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100">Andamento</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right border-b border-slate-100">Status Semanal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {resto && resto.length > 0 ? resto.map((m, index) => (
                                <tr key={m.id} className="group hover:bg-slate-50 transition-all cursor-default">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-6">
                                            <span className="text-sm font-black text-slate-200 group-hover:text-slate-900 transition-colors w-6">#{index + 4}</span>
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-100 rounded-[1rem] flex items-center justify-center font-black text-sm uppercase text-slate-400 group-hover:bg-slate-950 group-hover:text-white transition-all shadow-sm">
                                                    {m.nome.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 uppercase leading-none mb-1 group-hover:text-indigo-600 transition-colors">{m.nome}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold leading-none">{m.email}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-8 text-center text-xl font-black text-slate-900 tabular-nums">
                                        {m.entregas_totais}
                                    </td>
                                    <td className="px-6 py-8">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="flex gap-1.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`w-2 h-4 rounded-full transition-all duration-500 ${
                                                            i < m.em_andamento ? 'bg-indigo-500 shadow-lg shadow-indigo-100' : 'bg-slate-100'
                                                        }`} 
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{m.em_andamento} Ativa(s)</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <div className="inline-flex flex-col items-end gap-1 px-5 py-2.5 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-all">
                                            <p className="text-[10px] font-black text-slate-900 uppercase leading-none">
                                                {m.ultima_entrega ? 'Constante' : 'Iniciando'}
                                            </p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Ritmo Técnico</p>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="py-32 text-center text-slate-300 uppercase font-black text-xs tracking-widest">
                                        Sem dados de ranking para exibir
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});
