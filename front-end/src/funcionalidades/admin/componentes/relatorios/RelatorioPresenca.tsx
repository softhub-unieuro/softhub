import { memo } from 'react';
import { TrendingUp, AlertCircle, Calendar, Users } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface RelatorioPresencaProps {
    frequenciaGeral: any;
}

export const RelatorioPresenca = memo(({ frequenciaGeral }: RelatorioPresencaProps) => {
    if (!frequenciaGeral) return null;

    const temDados = (frequenciaGeral.tendencia || []).length > 0;

    return (
        <div className="space-y-8 animar-entrada">
            {/* Gráfico de Presença */}
            <div className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-sm relative overflow-hidden group">
                <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6 relative">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                             <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Volume de Frequência</h3>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acompanhamento diário de presença da equipe no laboratório.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-2">
                            <Users size={16} className="text-blue-600" />
                            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Pico: {Math.max(0, ...(frequenciaGeral.tendencia || []).map((t: any) => t.total_presentes))}</span>
                        </div>
                    </div>
                </div>

                <div className="h-[400px] w-full">
                    {temDados ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={frequenciaGeral.tendencia} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis 
                                    dataKey="data" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} 
                                    tickFormatter={(v) => v.split('-').reverse().slice(0, 2).join('/')} 
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} />
                                <RechartsTooltip 
                                    contentStyle={{ border: 'none', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold', padding: '12px' }} 
                                    labelClassName="text-slate-400 uppercase tracking-widest mb-1"
                                    cursor={{ stroke: '#2563eb', strokeWidth: 2 }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="total_presentes" 
                                    name="Presentes"
                                    stroke="#2563eb" 
                                    strokeWidth={4} 
                                    fill="url(#gradBlue)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                            <Calendar size={48} className="opacity-20" />
                            <p className="text-xs font-black uppercase tracking-widest">Sem dados para exibir neste período</p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl relative overflow-hidden group">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8">Resumo do Período</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="space-y-1">
                            <p className="text-5xl font-black tracking-tighter">{(frequenciaGeral.tendencia || []).reduce((acc: any, curr: any) => acc + curr.total_presentes, 0)}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total de Presenças</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-5xl font-black tracking-tighter">{(frequenciaGeral.tendencia?.length || 0)}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Dias Mapeados</p>
                        </div>
                        <div className="space-y-1 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-10">
                            <p className="text-5xl font-black tracking-tighter text-blue-400">
                                {frequenciaGeral.tendencia?.length > 0 
                                    ? ((frequenciaGeral.tendencia || []).reduce((acc: any, curr: any) => acc + curr.total_presentes, 0) / (frequenciaGeral.tendencia?.length || 1)).toFixed(1) 
                                    : '0'}
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Média por Dia</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 p-10 rounded-[3rem] flex flex-col justify-center gap-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-500/10"><AlertCircle size={24} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Atenção</p>
                            <p className="text-sm font-black text-slate-900 uppercase leading-tight tracking-tighter">Justificativas Pendentes</p>
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <p className="text-5xl font-black text-amber-500 leading-none tracking-tighter">{(frequenciaGeral.justificativasLista || []).filter((j: any) => j.status === 'pendente').length}</p>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Ver agora →</span>
                    </div>
                </div>
            </div>
        </div>
    );
});
