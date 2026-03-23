import { memo } from 'react';
import { ClipboardList } from 'lucide-react';
import { formatarDataHora } from '@/utilitarios/formatadores';

interface RelatorioAusenciasProps {
    frequenciaGeral: any;
}

export const RelatorioAusencias = memo(({ frequenciaGeral }: RelatorioAusenciasProps) => {
    if (!frequenciaGeral) return null;

    return (
        <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Justificativas de Ponto</h3>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><ClipboardList size={18} /></div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Membro</th>
                            <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo Técnico</th>
                            <th className="px-10 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Atual</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {(frequenciaGeral.justificativasLista || []).map((j: any) => (
                            <tr key={j.id} className="hover:bg-slate-50/50 transition-all group">
                                <td className="px-10 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-100 flex items-center justify-center rounded-2xl font-black text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            {j.usuario_nome.charAt(0)}
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-black text-slate-800 uppercase">{j.usuario_nome}</p>
                                            <p className="text-[10px] font-bold text-slate-400">{formatarDataHora(j.criado_em)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-6">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">{j.tipo}</p>
                                        <p className="text-[11px] text-slate-500 font-medium italic truncate max-w-[300px]">"{j.descricao || 'Sem declaração técnica'}"</p>
                                    </div>
                                </td>
                                <td className="px-10 py-6 text-right">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-2xl border ${
                                        j.status === 'aprovada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                        j.status === 'rejeitada' ? 'bg-red-50 text-red-600 border-red-100' : 
                                        'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                        {j.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {(frequenciaGeral.justificativasLista || []).length === 0 && (
                            <tr>
                                <td colSpan={3} className="py-24 text-center">
                                    <div className="text-slate-300 space-y-2">
                                        <ClipboardList size={40} className="mx-auto opacity-20" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Nenhum registro encontrado</p>
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
