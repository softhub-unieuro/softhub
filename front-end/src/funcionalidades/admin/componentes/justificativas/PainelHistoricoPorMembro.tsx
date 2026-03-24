import { memo, useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { ModalHistoricoMembro } from '@/funcionalidades/admin/componentes/relatorios/ModalHistoricoMembro';
import { formatarDataHora } from '@/utilitarios/formatadores';
import { Search, History, TrendingUp } from 'lucide-react';

export const PainelHistoricoPorMembro = memo(() => {
    const [searchParams, setSearchParams] = useSearchParams();
    const usuarioIdUrl = searchParams.get('usuarioId');
    
    const [busca, setBusca] = useState('');
    const [membroSelecionado, setMembroSelecionado] = useState<{ id: string, nome: string, email: string } | null>(null);
    const [modalAberto, setModalAberto] = useState(false);

    const { data: membros = [], isLoading } = useQuery({
        queryKey: ['admin', 'ponto', 'frequencia-membros'],
        queryFn: async () => {
            const res = await api.get('/api/relatorios/frequencia/membros');
            return res.data.membros || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutos
    });

    const filtrados = useMemo(() => {
        if (!busca.trim()) return membros;
        const b = busca.toLowerCase();
        return membros.filter((m: any) => 
            m.nome.toLowerCase().includes(b) || 
            m.email.toLowerCase().includes(b)
        );
    }, [membros, busca]);

    const handleVerHistorico = (membro: any) => {
        setMembroSelecionado({ id: membro.id, nome: membro.nome, email: membro.email });
        setModalAberto(true);
    };

    return (
        <div className="bg-white border border-slate-100 rounded-[3rem] shadow-sm flex flex-col flex-1 overflow-hidden min-h-[500px]">
            {/* Header com Busca */}
            <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <TrendingUp size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none mb-1">Frequência dos Membros</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Visão consolidada de assiduidade e sessões.</p>
                    </div>
                </div>

                <div className="relative w-full max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={16} />
                    <input 
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar membro por nome ou e-mail..."
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-slate-300"
                    />
                </div>
            </div>

            {/* Listagem */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Carregando Centralizar={true} />
                    </div>
                ) : filtrados.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-16">
                        <EstadoVazio tipo="pesquisa" titulo="Nenhum membro filtrado" descricao="Ajuste os termos da sua busca para encontrar o membro desejado." />
                    </div>
                ) : (
                    <>
                        {/* 🖥️ VISÃO DESKTOP: TABELA */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Membro</th>
                                        <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe / Cargo</th>
                                        <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Sessões Totais</th>
                                        <th className="px-6 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Último Acesso</th>
                                        <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Auditoria</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filtrados.map((m: any) => (
                                        <tr key={m.id} className="group hover:bg-slate-50/50 transition-all">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                        {m.nome.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1 group-hover:text-indigo-600 transition-colors">{m.nome}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold">{m.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-tight">{m.equipe_nome || 'Liderança'}</p>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{m.grupo_nome || 'Geral'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <span className="text-lg font-black text-slate-800 leading-none">{m.dias_presentes || 0}</span>
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <p className="text-[10px] font-black text-slate-600">
                                                    {m.ultima_batida ? formatarDataHora(m.ultima_batida).split('às')[0] : '--'}
                                                </p>
                                                <p className="text-[9px] font-bold text-slate-400 italic">
                                                    {m.ultima_batida ? `às ${formatarDataHora(m.ultima_batida).split('às')[1]}` : ''}
                                                </p>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <button 
                                                    onClick={() => handleVerHistorico(m)}
                                                    className="px-4 py-2 bg-slate-100 hover:bg-indigo-600 text-slate-500 hover:text-white rounded-xl transition-all duration-300 group/btn shadow-sm hover:shadow-indigo-100"
                                                >
                                                    <History size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 📱 VISÃO MOBILE: CARDS DE FREQUÊNCIA */}
                        <div className="lg:hidden p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filtrados.map((m: any) => (
                                <div key={m.id} className="p-5 bg-slate-50/10 border border-slate-100 rounded-[2rem] flex flex-col gap-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-xs">
                                                {m.nome.charAt(0)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[11px] font-black uppercase tracking-tight text-slate-800 truncate">{m.nome}</span>
                                                <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">
                                                    {m.equipe_nome || 'Liderança'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sessões</span>
                                            <span className="text-xl font-black text-slate-800 leading-none">{m.dias_presentes || 0}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between py-3 border-y border-slate-100">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Última Batida</span>
                                            <p className="text-[10px] font-bold text-slate-600">
                                                {m.ultima_batida ? formatarDataHora(m.ultima_batida) : '--'}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => handleVerHistorico(m)}
                                            className="h-10 w-10 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center active:bg-indigo-600 active:text-white transition-all shadow-sm"
                                        >
                                            <History size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <ModalHistoricoMembro 
                aberto={modalAberto}
                aoFechar={() => setModalAberto(false)}
                membro={membroSelecionado}
            />
        </div>
    );
});
