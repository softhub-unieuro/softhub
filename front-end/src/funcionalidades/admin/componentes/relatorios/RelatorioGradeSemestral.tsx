import { memo } from 'react';
import { FileSpreadsheet, Download, Users, Star, BarChart3, ChevronRight } from 'lucide-react';

interface RelatorioGradeSemestralProps {
    membros: any[];
    onExportar: () => void;
}

export const RelatorioGradeSemestral = memo(({ membros, onExportar }: RelatorioGradeSemestralProps) => {
    return (
        <div className="space-y-10 animar-entrada">
            {/* Exportação de Grade */}
            <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-xl relative overflow-hidden group">
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500 text-white rounded-xl">
                                <FileSpreadsheet size={24} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Documento Oficial</span>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Mapa de Frequência</h2>
                            <p className="text-slate-400 text-sm font-medium max-w-2xl leading-relaxed">
                                Gere a matriz consolidada de presença do semestre. Este documento é o registro oficial de assiduidade 
                                utilizado para validação de carga horária e auditorias da coordenação.
                            </p>
                        </div>
                    </div>

                    <div className="shrink-0">
                        <button 
                            onClick={onExportar}
                            className="h-20 px-10 bg-white text-slate-900 rounded-3xl flex items-center gap-4 text-xs font-black uppercase tracking-widest hover:scale-105 hover:bg-emerald-50 hover:text-emerald-700 transition-all shadow-2xl active:scale-95"
                        >
                            <Download size={22} strokeWidth={2.5} />
                            <span>Baixar Grade Completa</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Lista de Assiduidade */}
            <div className="bg-white border border-slate-100 rounded-[3.rem] overflow-hidden shadow-sm">
                <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/20">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-emerald-600 text-white rounded-2xl">
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">Presença Consolidada</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none">Visão geral de dias presentes e carga horária.</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Nome do Colaborador</th>
                                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100">Sessões</th>
                                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100">Status</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right border-b border-slate-100">Progressão</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {membros && membros.length > 0 ? membros.map((m: any) => {
                                const percentual = Math.round(Math.min(100, ((m.dias_presentes || 0) / 40) * 100));

                                return (
                                    <tr key={m.id} className="group hover:bg-slate-50 transition-all cursor-default">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-sm uppercase group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                                                    {m.nome.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 uppercase leading-none mb-1 group-hover:text-emerald-700 transition-colors">{m.nome}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold leading-none">{m.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8 text-center">
                                            <span className="text-lg font-black text-slate-900 tabular-nums">{m.dias_presentes || 0}</span>
                                        </td>
                                        <td className="px-6 py-8 text-center text-[10px] font-black text-slate-500 uppercase">
                                            {m.justificativas_aprovadas > 0 ? (
                                                <div className="inline-flex flex-col items-center">
                                                    <span className="text-xs font-black text-slate-900">{m.justificativas_aprovadas } Justificativas</span>
                                                    <span className="text-[8px] text-emerald-500">Aprovadas</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-200">Sem Abonos</span>
                                            )}
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="flex items-center gap-4">
                                                    <span className={`text-sm font-black tabular-nums transition-colors ${
                                                        percentual > 80 ? 'text-emerald-600' : 
                                                        percentual > 40 ? 'text-amber-500' : 'text-slate-400'
                                                    }`}>
                                                        {percentual}%
                                                    </span>
                                                    <div className="w-32 h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5 shadow-inner">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                                                percentual > 80 ? 'bg-emerald-500' : 
                                                                percentual > 40 ? 'bg-amber-500' : 
                                                                'bg-slate-300'
                                                            }`} 
                                                            style={{ width: `${percentual}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Meta de Assiduidade</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={4} className="py-40 text-center text-slate-300 uppercase font-black text-xs tracking-widest">
                                        Nenhum registro encontrado no período
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
