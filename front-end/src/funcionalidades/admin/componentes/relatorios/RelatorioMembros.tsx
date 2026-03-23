import { memo, useState, useCallback } from 'react';
import { formatarDataHora } from '@/utilitarios/formatadores';
import { ModalHistoricoMembro } from './ModalHistoricoMembro';

interface RelatorioMembrosProps {
    membrosFiltrados: any[];
}

export const RelatorioMembros = memo(({ membrosFiltrados }: RelatorioMembrosProps) => {
    const [membroSelecionado, setMembroSelecionado] = useState<{ id: string, nome: string, email: string } | null>(null);
    const [modalAberto, setModalAberto] = useState(false);

    const handleVerHistorico = useCallback((membro: any) => {
        setMembroSelecionado({ id: membro.id, nome: membro.nome, email: membro.email });
        setModalAberto(true);
    }, []);

    return (
        <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
            <div className="p-10 border-b border-slate-50 bg-slate-50/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Auditoria de Assiduidade Individual</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Selecione um membro para visualizar o histórico de registros imutáveis.</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Membro</th>
                            <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe / Cargo</th>
                            <th className="px-10 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Sessões</th>
                            <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Último Acesso</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-nowrap">
                        {membrosFiltrados.map((m: any) => (
                            <tr 
                                key={m.id} 
                                onClick={() => handleVerHistorico(m)}
                                className="hover:bg-primary/5 transition-all group cursor-pointer"
                            >
                                <td className="px-10 py-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-[1.2rem] bg-slate-100 flex items-center justify-center font-black text-slate-400 text-lg group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                            {m.nome.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800 uppercase leading-none mb-1 group-hover:text-primary transition-colors">{m.nome}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">{m.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-tight">{m.equipe_nome || 'Liderança'}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.grupo_nome || 'Geral'}</p>
                                    </div>
                                </td>
                                <td className="px-10 py-8 text-center">
                                    <span className="text-2xl font-black text-slate-900 leading-none group-hover:scale-110 transition-transform inline-block">{m.dias_presentes}</span>
                                </td>
                                <td className="px-10 py-8 text-right">
                                    <p className="text-[11px] font-black text-slate-600">
                                        {m.ultima_batida ? formatarDataHora(m.ultima_batida).split('às')[0] : '--'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400">{m.ultima_batida ? formatarDataHora(m.ultima_batida).split('às')[1] : ''}</p>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ModalHistoricoMembro
                aberto={modalAberto}
                aoFechar={() => setModalAberto(false)}
                membro={membroSelecionado}
            />
        </div>
    );
});
