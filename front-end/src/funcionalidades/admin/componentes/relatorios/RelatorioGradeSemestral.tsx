import { memo } from 'react';
import { FileSpreadsheet, Download, Users } from 'lucide-react';
import { formatarHoras } from '@/utilitarios/formatadores';

interface RelatorioGradeSemestralProps {
    membros: any[];
    onExportar: () => void;
}

/**
 * RELATÓRIO DE GRADE SEMESTRAL (MATRIZ)
 * Visão consolidada de assiduidade do semestre.
 */
export const RelatorioGradeSemestral = memo(({ membros, onExportar }: RelatorioGradeSemestralProps) => {
    return (
        <div className="space-y-8 animar-entrada">
            {/* Call to Action: Exportação de Matriz */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-[2.5rem] p-10 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-white/20 transition-colors" />
                
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <FileSpreadsheet size={20} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Exportação Consolidada</span>
                        </div>
                        <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Mapa Semestral de Frequência</h2>
                        <p className="text-sm font-medium opacity-80 max-w-xl">Gere o documento oficial com a batida diária de todos os membros. Este arquivo contém a grade completa (Membro x Dia) formatada para auditoria técnica.</p>
                    </div>

                    <button 
                        onClick={onExportar}
                        className="h-20 px-10 bg-white text-emerald-700 rounded-[1.8rem] flex items-center gap-4 text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/20"
                    >
                        <Download size={24} />
                        <span>Baixar Grade de Dias</span>
                    </button>
                </div>
            </div>

            {/* Quadro de Resumo da Grade */}
            <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-600 text-white rounded-2xl">
                            <Users size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none mb-1">Assiduidade por Membro</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Visão consolidada do período selecionado.</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-10 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Membro</th>
                                <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Sessões Totais</th>
                                <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Carga Acumulada</th>
                                <th className="px-10 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Frequência</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {membros && membros.length > 0 ? membros.map((m: any) => (
                                <tr key={m.id} className="group hover:bg-slate-50/50 transition-all">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black text-xs uppercase group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                                {m.nome.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1">{m.nome}</p>
                                                <p className="text-[10px] text-slate-400 font-bold leading-none">{m.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <span className="text-[11px] font-black text-slate-800 tabular-nums font-mono">{m.total_dias || 0}</span>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black tabular-nums font-mono">
                                            {formatarHoras(m.total_horas || 0)}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)] group-hover:bg-emerald-400 transition-all" 
                                                    style={{ width: `${Math.min(100, ((m.total_horas || 0) / 480) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-600 tabular-nums">
                                                {Math.round(Math.min(100, ((m.total_horas || 0) / 480) * 100))}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="p-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">Ponto sem registros no semestre</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});
