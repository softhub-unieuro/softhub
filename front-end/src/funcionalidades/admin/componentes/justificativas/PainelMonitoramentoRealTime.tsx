import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { Users, Clock, MapPin, Activity } from 'lucide-react';

export const PainelMonitoramentoRealTime = memo(() => {
    const { data: membrosOnline = [], isLoading, error } = useQuery({
        queryKey: ['membros-online-full'],
        queryFn: async () => {
            const res = await api.get('/api/ponto/online');
            return res.data.online || [];
        },
        refetchInterval: 30000 // 30 segundos
    });

    return (
        <div className="bg-white border border-slate-100 rounded-[3rem] shadow-sm flex flex-col flex-1 overflow-hidden min-h-[500px]">
            <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <Activity size={22} strokeWidth={2.5} className="animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none mb-1">Membros em Atividade</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Visão em tempo real de quem está com ponto aberto.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-6 py-2 bg-slate-50 border border-slate-100 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{membrosOnline.length} Conectados</span>
                </div>
            </div>

            <div className="flex-1 p-8 overflow-auto custom-scrollbar">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                        <Carregando Centralizar={true} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Sincronizando com a Fábrica...</p>
                    </div>
                ) : error ? (
                    <div className="h-full flex items-center justify-center p-12">
                        <EstadoVazio tipo="pesquisa" titulo="Falha na sincronização" descricao="Não foi possível recuperar os dados em tempo real. Tente novamente." />
                    </div>
                ) : membrosOnline.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-24 text-center">
                        <div className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 text-slate-300 mb-6 group-hover:scale-110 transition-transform duration-700">
                            <Users size={56} strokeWidth={1} />
                        </div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Ambiente Vazio</h3>
                        <p className="text-[10px] text-slate-400/60 mt-2 font-bold max-w-xs leading-relaxed">No momento não há registros de pontos abertos para monitoramento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {membrosOnline.map((m: any) => (
                            <div key={m.id} className="group relative flex flex-col bg-slate-50/10 border border-slate-100/50 hover:border-emerald-100 hover:bg-emerald-50/30 rounded-[2.5rem] p-6 transition-all duration-500 hover:shadow-xl hover:shadow-emerald-100/20">
                                <div className="flex items-start justify-between mb-4">
                                    <Avatar nome={m.nome} fotoPerfil={m.foto_perfil} tamanho="lg" className="rounded-2xl ring-4 ring-white shadow-sm shadow-black/5 group-hover:scale-105 transition-transform" />
                                    <div className="flex flex-col items-end gap-1.5">
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100/40 border border-emerald-200/50 text-emerald-700 rounded-full">
                                            <Clock size={10} />
                                            <span className="text-[9px] font-black uppercase tracking-tighter">Ponto Aberto</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                            <MapPin size={9} />
                                            <span className="text-[8px] font-bold text-slate-500">{m.ip || 'Rede Local'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-2">
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-emerald-700 transition-colors">{m.nome}</p>
                                    <p className="text-[10px] text-slate-400 font-bold mb-4">{m.email}</p>
                                    
                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Equipe</span>
                                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tight truncate max-w-[120px]">{m.equipe_nome || 'Liderança'}</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Início</span>
                                            <span className="text-[9px] font-black text-slate-800 tabular-nums">Hoje às {new Date(m.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Brilho sutil no hover */}
                                <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});
