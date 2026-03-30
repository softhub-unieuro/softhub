import { memo, useState, useEffect, useMemo } from 'react';
import { Search, User, Clock, MapPin, Printer, Download, Calendar, ShieldCheck, Mail, Users, ChevronRight } from 'lucide-react';
import { formatarDataHora, formatarHoras } from '@/utilitarios/formatadores';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { usarRelatorios } from '@/funcionalidades/admin/hooks/usarRelatorios';

interface RelatorioIndividualProps {
    membros: any[];
    dataInicio?: string;
    dataFim?: string;
}

export const RelatorioIndividual = memo(({ membros, dataInicio, dataFim }: RelatorioIndividualProps) => {
    const [membroId, setMembroId] = useState<string>('');
    const [registros, setRegistros] = useState<any[]>([]);
    const [carregando, setCarregando] = useState(false);
    
    const { buscarFrequenciaMembro, exportarPontoMembro } = usarRelatorios(dataInicio, dataFim);

    const membroSelecionado = useMemo(() => 
        membros.find(m => m.id === membroId), 
    [membros, membroId]);

    const carregarExtrato = async (id: string) => {
        if (!id) return;
        setCarregando(true);
        try {
            const data = await buscarFrequenciaMembro(id);
            setRegistros(data);
        } catch (e) {
            console.error('Erro ao carregar extrato:', e);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        if (membroId) carregarExtrato(membroId);
    }, [membroId, dataInicio, dataFim]);

    const estatisticas = useMemo(() => {
        const totalHoras = registros.reduce((acc: number, curr: any) => acc + (curr.tempo_total || 0), 0);
        const diasAtivos = new Set(registros.map((r: any) => r.data)).size;
        return { totalHoras, diasAtivos };
    }, [registros]);

    return (
        <div className="space-y-12 animar-entrada pb-32">
            {/* Seleção de Membro */}
            <div className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-sm relative overflow-hidden group">
                <div className="flex flex-col lg:flex-row lg:items-center gap-10 relative z-10">
                    <div className="flex items-center gap-6 shrink-0">
                        <div className="w-16 h-16 bg-indigo-600 text-white rounded-[1.8rem] flex items-center justify-center shadow-xl shadow-indigo-100 transition-transform group-hover:scale-105 duration-500">
                            <User size={32} />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Histórico Individual</h3>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Extrato detalhado por colaborador.</p>
                        </div>
                    </div>

                    <div className="flex-1 max-w-2xl relative group/select">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/select:text-indigo-600 transition-colors" size={20} />
                        <select 
                            value={membroId}
                            onChange={(e) => setMembroId(e.target.value)}
                            className="w-full h-16 bg-slate-50 border border-slate-100 rounded-[1.8rem] pl-16 pr-10 text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-200 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Escolher colaborador...</option>
                            {membros.map(m => (
                                <option key={m.id} value={m.id}>{m.nome} — {m.email}</option>
                            ))}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                            <ChevronRight size={20} className="rotate-90" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Resultado do Relatório */}
            {!membroId ? (
                <div className="bg-slate-50/50 border border-slate-100 rounded-[3.5rem] h-[500px] flex items-center justify-center">
                    <div className="text-center space-y-6">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300"><User size={48} /></div>
                        <div className="space-y-1">
                            <h4 className="text-xl font-black text-slate-400 uppercase tracking-tighter">Nenhum perfil selecionado</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-sm mx-auto">Utilize o seletor acima para carregar o histórico completo de frequência deste colaborador.</p>
                        </div>
                    </div>
                </div>
            ) : carregando ? (
                <div className="h-[500px] flex items-center justify-center bg-white border border-slate-100 rounded-[3.5rem]">
                    <Carregando Centralizar={true} />
                </div>
            ) : (
                <div className="space-y-12">
                    {/* Resumo do Membro */}
                    <div className="p-12 bg-white border border-slate-100 rounded-[3.5rem] shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-12 relative overflow-hidden group">
                        <div className="flex flex-col md:flex-row items-center gap-10">
                            <div className="relative">
                                <div className="w-32 h-32 bg-slate-900 border-[10px] border-slate-50 text-white rounded-[2.8rem] flex items-center justify-center font-black text-4xl shadow-xl">
                                    {membroSelecionado?.nome?.charAt(0)}
                                </div>
                                <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-emerald-500 border-4 border-white rounded-full flex items-center justify-center text-white shadow-xl">
                                    <ShieldCheck size={24} />
                                </div>
                            </div>
                            
                            <div className="text-center md:text-left space-y-5">
                                <div>
                                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-4">{membroSelecionado?.nome}</h1>
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                        <div className="flex items-center gap-2 px-5 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black text-slate-600 uppercase tracking-widest">
                                            <Mail size={14} className="text-indigo-600" /> {membroSelecionado?.email}
                                        </div>
                                        <div className="flex items-center gap-2 px-5 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl text-[11px] font-black text-indigo-600 uppercase tracking-widest">
                                            <Users size={14} /> {membroSelecionado?.equipe_nome || 'Lotação Geral'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-12 xl:border-l border-slate-100 xl:pl-16">
                            <div className="space-y-2">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Dias Presentes</p>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-6xl font-black text-slate-900 leading-none tracking-tighter">{estatisticas.diasAtivos}</span>
                                    <span className="text-sm font-black text-emerald-500 uppercase">Sessões</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Horas Totais</p>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-6xl font-black text-indigo-600 leading-none tracking-tighter">{formatarHoras(estatisticas.totalHoras)}</span>
                                    <span className="text-sm font-black text-indigo-300 uppercase">Horas</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabela de Logs */}
                    <div className="bg-white border border-slate-100 rounded-[3.5rem] overflow-hidden shadow-sm">
                        <div className="p-12 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Histórico de Ponto</h3>
                            <div className="flex items-center gap-3 text-[11px] font-black text-slate-400 uppercase tracking-widest px-6 py-2.5 bg-white border border-slate-100 rounded-2xl">
                                <Calendar size={16} className="text-indigo-600" /> {dataInicio?.split('-').reverse().join('/')} — {dataFim?.split('-').reverse().join('/')}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-12 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Data</th>
                                        <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100">Entrada</th>
                                        <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100">Saída</th>
                                        <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100">Total</th>
                                        <th className="px-12 py-8 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Protocolo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {registros.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-44 text-center">
                                                <div className="space-y-6">
                                                    <Clock size={48} className="mx-auto text-slate-200" strokeWidth={1} />
                                                    <p className="text-sm font-black text-slate-300 uppercase tracking-[0.3em]">Nenhum registro encontrado</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : registros.map((reg: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-all group">
                                            <td className="px-12 py-10">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-base font-black text-slate-900 uppercase tracking-tighter group-hover:text-indigo-600 transition-colors">
                                                        {formatarDataHora(reg.data).split(' às')[0]}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                                        {new Date(reg.data).toLocaleDateString('pt-BR', { weekday: 'long' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-10">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <div className="flex items-center gap-2 text-base font-black text-slate-700 bg-emerald-50 px-4 py-2 rounded-xl group-hover:scale-110 transition-transform">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        {reg.entrada ? reg.entrada.slice(0, 5) : '--:--'}
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-200 uppercase tabular-nums">{reg.ip_entrada || '0.0.0.0'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-10">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <div className={`flex items-center gap-2 text-base font-black px-4 py-2 rounded-xl group-hover:scale-110 transition-transform ${reg.saida ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${reg.saida ? 'bg-blue-600' : 'bg-rose-600 animate-pulse'}`} />
                                                        {reg.saida ? reg.saida.slice(0, 5) : '--:--'}
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-200 uppercase tabular-nums">{reg.ip_saida || '0.0.0.0'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-10 text-center">
                                                <span className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest ${
                                                    reg.saida ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-300'
                                                }`}>
                                                    {reg.tempo_total ? formatarHoras(reg.tempo_total) : '---'}
                                                </span>
                                            </td>
                                            <td className="px-12 py-10 text-right">
                                                <div className="inline-flex items-center gap-2 text-slate-100 group-hover:text-indigo-200 transition-colors">
                                                    <MapPin size={12} strokeWidth={3} />
                                                    <span className="text-[9px] font-mono font-black">{reg.id ? reg.id.split('-')[0] : 'SCAE-UNIT'}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center justify-end gap-5 print:hidden">
                        <button 
                            onClick={() => exportarPontoMembro(membroId)}
                            className="h-20 px-12 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-[1.8rem] flex items-center gap-4 text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-emerald-50"
                        >
                            <Download size={20} strokeWidth={2.5} />
                            <span>Exportar Planilha</span>
                        </button>
                        <button 
                            onClick={() => window.print()}
                            className="h-20 px-12 bg-slate-900 text-white rounded-[1.8rem] flex items-center gap-4 text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-2xl shadow-slate-200"
                        >
                            <Printer size={20} strokeWidth={2.5} />
                            <span>Imprimir Extrato</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});
