import { memo } from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface RelatorioPresencaProps {
    frequenciaGeral: any;
}

export const RelatorioPresenca = memo(({ frequenciaGeral }: RelatorioPresencaProps) => {
    if (!frequenciaGeral) return null;

    return (
        <div className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase">Frequência Geral</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Gráfico de volume de presenças registradas</p>
                    </div>
                    <div className="p-4 bg-primary/10 text-primary rounded-[1.5rem]"><TrendingUp size={24} /></div>
                </div>
                <div className="h-[380px] w-full" style={{ minHeight: '380px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={frequenciaGeral.tendencia} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradEssencial" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="5 5" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} tickFormatter={(v) => v.split('-').reverse().slice(0, 2).join('/')} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <RechartsTooltip contentStyle={{ border: 'none', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                            <Area type="monotone" dataKey="total_presentes" stroke="#3b82f6" strokeWidth={5} fill="url(#gradEssencial)" animationDuration={1500} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-xl shadow-slate-200">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Métricas do Período</h4>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-[32px] font-black leading-none mb-1">{(frequenciaGeral.tendencia || []).reduce((acc: any, curr: any) => acc + curr.total_presentes, 0)}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Presentes</p>
                        </div>
                        <div>
                            <p className="text-[32px] font-black leading-none mb-1">{(frequenciaGeral.tendencia?.length || 0)}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dias Mapeados</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white border border-slate-100 p-8 rounded-[3rem] shadow-sm flex items-center gap-6">
                    <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-[1.8rem] flex items-center justify-center"><AlertCircle size={32} /></div>
                    <div>
                        <p className="text-sm font-black text-slate-900 uppercase leading-none">Justificativas Pendentes</p>
                        <p className="text-3xl font-black text-amber-500 mt-2">{(frequenciaGeral.justificativasLista || []).filter((j: any) => j.status === 'pendente').length}</p>
                    </div>
                </div>
            </div>
        </div>
    );
});
