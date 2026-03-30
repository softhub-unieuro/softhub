import { memo } from 'react';
import { ClipboardList, ShieldAlert, HeartPulse, Laptop, MessageSquare } from 'lucide-react';
import { formatarDataHora } from '@/utilitarios/formatadores';

interface RelatorioAusenciasProps {
    frequenciaGeral: any;
}

export const RelatorioAusencias = memo(({ frequenciaGeral }: RelatorioAusenciasProps) => {
    if (!frequenciaGeral) return null;

    const getIcone = (tipo: string) => {
        const t = tipo?.toLowerCase();
        if (t?.includes('saúde') || t?.includes('medico')) return <HeartPulse size={14} className="text-rose-500" />;
        if (t?.includes('equipamento') || t?.includes('computador')) return <Laptop size={14} className="text-indigo-500" />;
        return <MessageSquare size={14} className="text-slate-400" />;
    };

    return (
        <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm animar-entrada">
            <div className="p-12 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Justificativas e Faltas</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Controle de ausências e abonos solicitados pela equipe.</p>
                </div>
                <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200">
                    <ClipboardList size={22} />
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Colaborador</th>
                            <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Descrição da Ausência</th>
                            <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {(frequenciaGeral.justificativasLista || []).map((j: any) => (
                            <tr key={j.id} className="hover:bg-slate-50 transition-all group">
                                <td className="px-10 py-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-2xl font-black text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                            {j.usuario_nome.charAt(0)}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-slate-900 uppercase leading-none group-hover:text-indigo-600 transition-colors">{j.usuario_nome}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatarDataHora(j.criado_em)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="space-y-2 max-w-[450px]">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-slate-50 rounded-lg">{getIcone(j.tipo)}</div>
                                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{j.tipo}</span>
                                        </div>
                                        <p className="text-[13px] text-slate-500 font-medium leading-relaxed italic border-l-2 border-slate-100 pl-4 py-1">
                                            "{j.descricao || 'Nenhuma justificativa detalhada foi fornecida.'}"
                                        </p>
                                    </div>
                                </td>
                                <td className="px-10 py-8 text-right">
                                    <div className="inline-flex flex-col items-end gap-1">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border ${
                                            j.status === 'aprovado' || j.status === 'aprovada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                            j.status === 'rejeitado' || j.status === 'rejeitada' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                            'bg-amber-50 text-amber-600 border-amber-100'
                                        }`}>
                                            {j.status}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {(frequenciaGeral.justificativasLista || []).length === 0 && (
                            <tr>
                                <td colSpan={3} className="py-40 text-center">
                                    <div className="text-slate-200 space-y-6">
                                        <ShieldAlert size={64} strokeWidth={1} className="mx-auto opacity-20" />
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nenhuma justificativa encontrada no período</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});
