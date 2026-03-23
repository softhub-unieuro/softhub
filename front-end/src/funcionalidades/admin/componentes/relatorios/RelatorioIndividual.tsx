import { memo, useState, useEffect, useMemo } from 'react';
import { Search, User, Clock, MapPin, Printer, Download } from 'lucide-react';
import { formatarDataHora, formatarHoras } from '@/utilitarios/formatadores';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { usarRelatorios } from '@/funcionalidades/admin/hooks/usarRelatorios';

interface RelatorioIndividualProps {
    membros: any[];
    dataInicio?: string;
    dataFim?: string;
}

/**
 * RELATÓRIO INDIVIDUAL DE FREQUÊNCIA
 * Exibe o extrato completo de batidas de um membro em um período.
 */
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
        <div className="space-y-8 animar-entrada pb-20">
            {/* Seleção de Membro */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm print:hidden">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-14 h-14 bg-primary/5 text-primary rounded-2xl flex items-center justify-center shrink-0">
                        <User size={28} />
                    </div>
                    <div className="flex-1 space-y-1">
                        <h3 className="text-lg font-black text-slate-900 uppercase">Selecione o Membro</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gere o extrato semestral individualizado para auditoria.</p>
                    </div>
                    <div className="w-full md:w-96 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16} />
                        <select 
                            value={membroId}
                            onChange={(e) => setMembroId(e.target.value)}
                            className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all appearance-none"
                        >
                            <option value="">Selecione uma pessoa...</option>
                            {membros.map(m => (
                                <option key={m.id} value={m.id}>{m.nome} ({m.email})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Resultado do Relatório */}
            {!membroId ? (
                <div className="bg-white border border-slate-50 rounded-[2rem] h-96 flex items-center justify-center">
                    <EstadoVazio 
                        tipo="pesquisa"
                        titulo="Nenhum membro selecionado"
                        descricao="Escolha um membro na lista acima para visualizar o extrato semestral."
                    />
                </div>
            ) : carregando ? (
                <div className="h-96 flex items-center justify-center bg-white rounded-[2rem]">
                    <Carregando Centralizar={true} />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Header do Extrato (Visível no Print) */}
                    <div className="p-10 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-primary text-white rounded-[1.8rem] flex items-center justify-center font-black text-3xl shadow-xl shadow-primary/20">
                                {membroSelecionado?.nome?.charAt(0)}
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-2">{membroSelecionado?.nome}</h1>
                                <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                                    <span className="flex items-center gap-1.5"><Clock size={14} className="text-primary"/> {membroSelecionado?.email}</span>
                                    <span className="w-1 h-1 bg-slate-200 rounded-full"/>
                                    <span className="uppercase tracking-widest">{membroSelecionado?.equipe_nome || 'Sem Equipe'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-10 border-l border-slate-100 pl-10 h-full">
                            <div className="text-center">
                                <p className="text-[32px] font-black text-primary leading-none mb-1">{estatisticas.diasAtivos}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sessões</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[32px] font-black text-slate-900 leading-none mb-1">{formatarHoras(estatisticas.totalHoras)}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Carga Total</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabela de Registros */}
                    <div className="bg-white border border-border/40 rounded-[2rem] overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrada</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Saída</th>
                                        <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Duração</th>
                                        <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {registros.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">Nenhum registro no período</td>
                                        </tr>
                                    ) : registros.map((reg: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-black text-slate-900 uppercase font-mono">{formatarDataHora(reg.data).split(' às')[0]}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{new Date(reg.data).toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
                                                    <span className="text-xs font-black text-slate-700">{reg.entrada ? reg.entrada.slice(0, 5) : '--:--'}</span>
                                                    <span className="text-[9px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">({reg.ip_entrada})</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"/>
                                                    <span className="text-xs font-black text-slate-700">{reg.saida ? reg.saida.slice(0, 5) : '--:--'}</span>
                                                    <span className="text-[9px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">({reg.ip_saida})</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${reg.saida ? 'bg-indigo-50 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                                                    {reg.tempo_total ? formatarHoras(reg.tempo_total) : 'Em Aberto'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex flex-col items-end opacity-20 group-hover:opacity-100 transition-opacity">
                                                    <span className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase truncate">
                                                        <MapPin size={10}/> {reg.ip_entrada}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Rodapé do Extrato (Ações) */}
                    <div className="flex items-center justify-end gap-3 print:hidden">
                        <button 
                            onClick={() => exportarPontoMembro(membroId)}
                            className="h-14 px-8 bg-white border border-slate-200 text-emerald-600 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm"
                        >
                            <Download size={18} />
                            <span>Baixar CSV</span>
                        </button>
                        <button 
                            onClick={() => window.print()}
                            className="h-14 px-8 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <Printer size={18} />
                            <span>Imprimir Comprovante</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});
