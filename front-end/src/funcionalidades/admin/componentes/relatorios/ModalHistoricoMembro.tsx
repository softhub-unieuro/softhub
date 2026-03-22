import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import { Modal } from '@/compartilhado/componentes/Modal';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { formatarDataHora } from '@/utilitarios/formatadores';
import { Clock, MapPin, Hash } from 'lucide-react';

interface ModalHistoricoMembroProps {
    aberto: boolean;
    aoFechar: () => void;
    membro: {
        id: string;
        nome: string;
        email: string;
    } | null;
}

export const ModalHistoricoMembro = memo(({ aberto, aoFechar, membro }: ModalHistoricoMembroProps) => {
    
    const { data: historico, isLoading } = useQuery({
        queryKey: ['admin', 'ponto', 'historico', membro?.id],
        queryFn: async () => {
            if (!membro?.id) return [];
            const res = await api.get(`/api/ponto/${membro.id}/historico`);
            return res.data.historico || [];
        },
        enabled: aberto && !!membro?.id,
        staleTime: 1000 * 60 * 2, // 2 minutos
    });

    return (
        <Modal
            aberto={aberto}
            aoFechar={aoFechar}
            titulo={membro?.nome ? `Histórico de ${membro.nome.split(' ')[0]}` : 'Histórico'}
            largura="lg"
        >
            <div className="space-y-6">
                {/* Header info */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">
                            {membro?.nome.charAt(0)}
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none mb-1">{membro?.nome}</p>
                            <p className="text-[10px] text-slate-400 font-bold leading-none">{membro?.email}</p>
                        </div>
                    </div>
                </div>

                <div className="min-h-[300px]">
                    {isLoading ? (
                        <div className="h-[300px] flex items-center justify-center">
                            <Carregando Centralizar={true} />
                        </div>
                    ) : (historico || []).length === 0 ? (
                        <div className="h-[300px]">
                            <EstadoVazio 
                                tipo="pesquisa"
                                titulo="Nenhum registro encontrado"
                                descricao="Este membro ainda não realizou marcações de ponto no período consultado."
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Últimas 100 marcações</p>
                            <div className="grid grid-cols-1 gap-2">
                                {(historico || []).map((reg: any, index: number) => (
                                    <div 
                                        key={reg.id || index} 
                                        className="group relative flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/10 rounded-2xl transition-all duration-300"
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Status icon */}
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                                                reg.tipo.toLowerCase() === 'entrada' 
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-100' 
                                                : 'bg-rose-50 text-rose-600 border border-rose-100 group-hover:bg-rose-100'
                                            }`}>
                                                <Clock size={18} />
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                                        reg.tipo.toLowerCase() === 'entrada' 
                                                        ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200' 
                                                        : 'bg-rose-100/50 text-rose-700 border-rose-200'
                                                    }`}>
                                                        {reg.tipo}
                                                    </span>
                                                    <span className="text-[11px] font-black text-slate-900 leading-none">
                                                        {formatarDataHora(reg.registrado_em)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin size={10} className="text-slate-400" />
                                                        <span className="text-[9px] font-bold text-slate-500">{reg.ip_origem || '0.0.0.0'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Hash size={10} className="text-slate-400" />
                                                        <span className="text-[8px] font-medium text-slate-400 uppercase tracking-tighter">ID: {reg.id.split('-')[0]}...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="hidden sm:block text-right">
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">Auditado</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
});
