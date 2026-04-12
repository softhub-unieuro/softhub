import { memo, useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { ModalHistoricoMembro } from '@/funcionalidades/admin/componentes/relatorios/ModalHistoricoMembro';
import { formatarDataHora, formatarHoras } from '@/utilitarios/formatadores';
import { Search, History, TrendingUp, Users, CalendarDays } from 'lucide-react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { usarConfiguracoes } from '@/funcionalidades/admin/hooks/usarConfiguracoes';

export const PainelHistoricoPorMembro = memo(() => {
    const [searchParams, setSearchParams] = useSearchParams();
    const usuarioIdUrl = searchParams.get('usuarioId');
    
    const [busca, setBusca] = useState('');
    const [filtroEquipe, setFiltroEquipe] = useState('');
    const [membroSelecionado, setMembroSelecionado] = useState<{ id: string, nome: string, email: string } | null>(null);
    const [modalAberto, setModalAberto] = useState(false);

    // Datas da semana atual para o filtro da API
    const datasSemana = useMemo(() => {
        const agora = new Date();
        return {
            inicio: format(startOfWeek(agora, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
            fim: format(endOfWeek(agora, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        };
    }, []);

    const { data: membros = [], isLoading } = useQuery({
        queryKey: ['admin', 'ponto', 'frequencia-membros', datasSemana],
        queryFn: async () => {
            const res = await api.get('/api/relatorios/frequencia/membros', {
                params: { data_inicio: datasSemana.inicio, data_fim: datasSemana.fim }
            });
            return res.data.membros || [];
        },
        staleTime: 1000 * 10, // 10 segundos
        refetchInterval: 1000 * 30, // Atualiza a cada 30 segundos
    });

    const { data: onlineMembers = [] } = useQuery({
        queryKey: ['ponto', 'online'],
        queryFn: async () => {
            const res = await api.get('/api/ponto/online');
            return res.data.online || [];
        },
        refetchInterval: 30000, // Atualiza a cada 30s
    });

    const equipesUnicas = useMemo(() => {
        const set = new Set(membros.map((m: any) => m.equipe_nome).filter(Boolean));
        return Array.from(set) as string[];
    }, [membros]);

    const filtrados = useMemo(() => {
        let result = membros;
        
        if (filtroEquipe) {
            result = result.filter((m: any) => m.equipe_nome === filtroEquipe);
        }

        if (busca.trim()) {
            const b = busca.toLowerCase();
            result = result.filter((m: any) => 
                m.nome.toLowerCase().includes(b) || 
                m.email.toLowerCase().includes(b)
            );
        }
        
        return result;
    }, [membros, busca, filtroEquipe]);

    const isOnline = (id: string) => onlineMembers.some((om: any) => om.id === id);

    const handleVerHistorico = (membro: any) => {
        setMembroSelecionado({ id: membro.id, nome: membro.nome, email: membro.email });
        setModalAberto(true);
    };

    const { configuracoes } = usarConfiguracoes();
    const metaConfig = configuracoes?.meta_semanal_horas || 20;
    const META_SEMANAL_MINUTOS = metaConfig * 60;

    return (
        <div className="bg-white border border-slate-100 rounded-[3rem] shadow-sm flex flex-col flex-1 overflow-hidden min-h-[500px]">
            {/* Header com Busca */}
            <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <TrendingUp size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">Jornada Semanal</h3>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-amber-100 shadow-sm shadow-amber-50">
                                <CalendarDays size={10} /> Semana Atual
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Monitoramento de carga horária e entregas da semana.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full max-w-2xl group">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={16} />
                        <input 
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            placeholder="Buscar membro por nome ou e-mail..."
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-slate-300"
                        />
                    </div>
                    {/* Filtro de Equipe Rápido */}
                    <select 
                        onChange={(e) => setFiltroEquipe(e.target.value)}
                        className="px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer hover:bg-white transition-all shadow-sm"
                    >
                        <option value="">Todas Equipes</option>
                        {equipesUnicas.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                    </select>
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
                        {/* 📊 PAINEL DE MÉTRICAS RÁPIDAS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-slate-50/50 border-b border-slate-100">
                             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-indigo-200 transition-all">
                                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Users size={22} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Membros Online</p>
                                    <p className="text-2xl font-black text-emerald-600 leading-none">{onlineMembers.length}</p>
                                </div>
                             </div>
                             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-emerald-200 transition-all">
                                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <CalendarDays size={22} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Carga Horária (Semana)</p>
                                    <p className="text-2xl font-black text-slate-800 leading-none">
                                        {formatarHoras(filtrados.reduce((acc: number, m: any) => acc + (m.total_minutos || 0), 0))}
                                    </p>
                                </div>
                             </div>
                             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-amber-200 transition-all">
                                <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <History size={22} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Sessões</p>
                                    <p className="text-2xl font-black text-slate-800 leading-none">
                                        {filtrados.reduce((acc: number, m: any) => acc + (m.dias_presentes || 0), 0)}
                                    </p>
                                </div>
                             </div>
                        </div>

                        {/* 🖥️ VISÃO DESKTOP: TABELA */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/30">
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Membro</th>
                                        <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe / Cargo</th>
                                        <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso Semanal ({metaConfig}h)</th>
                                        <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Batidas</th>
                                        <th className="px-6 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Última Presença</th>
                                        <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filtrados.map((m: any) => {
                                        const porcentagem = Math.min(100, (m.total_minutos || 0) / META_SEMANAL_MINUTOS * 100);
                                        return (
                                        <tr key={m.id} className="group hover:bg-indigo-50/5 transition-all">
                                            <td className="px-10 py-7">
                                                <div className="flex items-center gap-5">
                                                    <div className="relative group/avatar">
                                                        <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm ring-4 ring-transparent group-hover:ring-indigo-100">
                                                            {m.nome.charAt(0)}
                                                        </div>
                                                        <div className={`
                                                            absolute -bottom-1 -right-1 w-3.5 h-3.5 border-[3px] border-white rounded-full
                                                            ${isOnline(m.id) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}
                                                        `} title={isOnline(m.id) ? 'Online na Fábrica' : 'Offline'} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1.5 group-hover:text-indigo-600 transition-colors">{m.nome}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-opacity">{m.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-7">
                                                <div className="space-y-1.5">
                                                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest inline-block ${m.equipe_nome ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
                                                        {m.equipe_nome || 'Liderança'}
                                                    </div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">{m.grupo_nome || 'Geral'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-7">
                                                <div className="w-40 space-y-2">
                                                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400">
                                                        <span className="text-slate-900">{formatarHoras(m.total_minutos || 0)} <span className="text-slate-300">/ {metaConfig}H</span></span>
                                                        <span className="text-slate-600">{Math.round(porcentagem)}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-1000 ${porcentagem >= 100 ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]' : 'bg-emerald-500'}`} 
                                                            style={{ width: `${porcentagem}%` }} 
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-7 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xl font-black text-slate-800 leading-none">{m.dias_presentes || 0}</span>
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">Sessões</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-7 text-right">
                                                {m.ultima_batida ? (
                                                    <div className="flex flex-col items-end">
                                                        <p className="text-[10px] font-black text-slate-600">
                                                            {formatarDataHora(m.ultima_batida).split('às')[0]}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-slate-400 opacity-60 italic">
                                                            às {formatarDataHora(m.ultima_batida).split('às')[1]}
                                                        </p>
                                                    </div>
                                                ) : <span className="text-[9px] font-black text-slate-200">SEM REGISTRO</span>}
                                            </td>
                                            <td className="px-10 py-7 text-right">
                                                <button 
                                                    onClick={() => handleVerHistorico(m)}
                                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-xl transition-all duration-300 group/btn shadow-sm hover:shadow-indigo-100 active:scale-95"
                                                >
                                                    <History size={16} strokeWidth={2.5} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest hidden xl:inline">Auditar</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );})}
                                </tbody>
                            </table>
                        </div>

                        {/* 📱 VISÃO MOBILE: CARDS DE FREQUÊNCIA */}
                        <div className="lg:hidden p-8 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/20">
                            {filtrados.map((m: any) => {
                                const porcentagem = Math.min(100, (m.total_minutos || 0) / META_SEMANAL_MINUTOS * 100);
                                return (
                                <div key={m.id} className="p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm flex flex-col gap-5 group hover:border-indigo-100 transition-all">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-indigo-100 shadow-lg">
                                                    {m.nome.charAt(0)}
                                                </div>
                                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-4 border-white rounded-full ${isOnline(m.id) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[12px] font-black uppercase tracking-tight text-slate-800 truncate leading-none mb-1.5">{m.nome}</span>
                                                <div className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[7px] font-black uppercase tracking-widest inline-block w-fit">
                                                    {m.equipe_nome || 'Liderança'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[22px] font-black text-slate-900 leading-none">{formatarHoras(m.total_minutos || 0)}</span>
                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-0.5">Semana</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400">
                                            <span>Progresso: {Math.round(porcentagem)}%</span>
                                            <span>Meta: {metaConfig}H</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-indigo-600 rounded-full" 
                                                style={{ width: `${porcentagem}%` }} 
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Presença</span>
                                            <p className="text-[10px] font-bold text-slate-600">
                                                {m.ultima_batida ? formatarDataHora(m.ultima_batida) : 'Nenhum registro'}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => handleVerHistorico(m)}
                                            className="h-12 w-12 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center active:bg-indigo-600 active:text-white transition-all shadow-sm"
                                        >
                                            <History size={20} />
                                        </button>
                                    </div>
                                </div>
                            );})}
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
