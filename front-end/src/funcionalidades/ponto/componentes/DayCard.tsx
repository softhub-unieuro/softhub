import { memo, useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Bot, CalendarRange } from 'lucide-react';
import { formatarHoras } from '@/utilitarios/formatadores';
import type { RegistroPonto } from '../hooks/usarPonto';

interface DayCardProps {
    dia: Date;
    registros: RegistroPonto[];
    hoje: boolean;
}

export const DayCard = memo(({ dia, registros, hoje }: DayCardProps) => {
    const temRegistros = registros.length > 0;

    // Ordenação memoizada para performance
    const registrosOrdenados = useMemo(() => {
        return [...registros].sort((a, b) => new Date(a.registrado_em).getTime() - new Date(b.registrado_em).getTime());
    }, [registros]);

    const totalMinutos = useMemo(() => {
        if (!temRegistros) return 0;
        let soma = 0;
        for (let i = 0; i < registrosOrdenados.length; i++) {
            if (registrosOrdenados[i].tipo === 'entrada' && registrosOrdenados[i + 1]?.tipo === 'saida') {
                const entrada = new Date(registrosOrdenados[i].registrado_em);
                const saida = new Date(registrosOrdenados[i + 1].registrado_em);
                soma += Math.floor((saida.getTime() - entrada.getTime()) / (1000 * 60));
                i++; // Pula o par processado
            }
        }
        return soma;
    }, [registrosOrdenados, temRegistros]);

    return (
        <div className={`
            flex flex-col items-center w-full h-full p-5 sm:p-6 rounded-[32px] border transition-all duration-700 relative group
            ${hoje
                ? 'bg-white border-primary/20 shadow-[0_40px_80px_-20px_rgba(var(--primary-rgb),0.15)] ring-1 ring-primary/5'
                : 'bg-white/40 border-slate-200/60 hover:bg-white hover:border-slate-300 hover:shadow-2xl'
            }
        `}>
            {/* Header: Clean Typography */}
            <div className="flex flex-col items-center justify-center w-full mb-8 pt-2">
                <span className={`text-[10px] font-black uppercase tracking-[0.3em] mb-2 ${hoje ? 'text-primary' : 'text-slate-400/60'}`}>
                    {format(dia, 'EEEE', { locale: ptBR }).split('-')[0]}
                </span>
                <div className="relative flex items-center justify-center mb-3">
                    <span className={`text-5xl sm:text-6xl font-black tabular-nums tracking-tighter transition-all duration-700 ${hoje ? 'text-slate-900 scale-110' : 'text-slate-200 group-hover:text-slate-300'}`}>
                        {format(dia, 'dd')}
                    </span>
                    {hoje && (
                        <div className="absolute -right-3 -top-1 w-3 h-3 rounded-full bg-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.6)] animate-pulse" />
                    )}
                </div>
                {temRegistros && (
                    <div className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500
                        ${hoje ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-100/50 border-slate-200 text-slate-500 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-800'}
                    `}>
                        <Clock size={12} strokeWidth={3} />
                        <span className="text-[11px] font-black tabular-nums tracking-tight">
                            {formatarHoras(totalMinutos)}
                        </span>
                    </div>
                )}
            </div>

            {/* activity records - chronological log ribbon with internal scroll */}
            <div className="flex flex-col w-full h-[250px] sm:h-[350px] px-1 overflow-y-auto scrollbar-none space-y-4">

                {temRegistros ? (
                    <div className="relative flex flex-col gap-6 py-2">
                        {/* Continuous Timeline Line */}
                        <div className="absolute left-[7px] top-4 bottom-4 w-[2px] bg-slate-100 group-hover:bg-slate-200/60 transition-colors rounded-full" />
                        
                        {registrosOrdenados.map((reg, idx) => (
                            <div key={reg.id} className="relative flex items-start gap-4 group/item">
                                {/* Visual Node */}
                                {reg.ip_origem === 'SISTEMA-AUTOMATICO' ? (
                                    <div className="z-10 shrink-0 w-[16px] h-[16px] flex items-center justify-center transition-transform group-hover/item:scale-125">
                                        <Bot size={16} className="text-rose-500" strokeWidth={3} />
                                    </div>
                                ) : reg.aviso ? (
                                    <div className="z-10 shrink-0 w-[16px] h-[16px] flex items-center justify-center transition-transform group-hover/item:scale-125">
                                        <CalendarRange size={16} className="text-emerald-500" strokeWidth={3} />
                                    </div>
                                ) : (
                                    <div className={`
                                        w-[16px] h-[16px] rounded-full border-[3px] bg-white z-10 shrink-0 transition-all duration-300
                                        ${reg.tipo === 'entrada' ? 'border-emerald-500' : 'border-rose-500'}
                                        group-hover/item:scale-110 shadow-sm
                                    `} />
                                )}

                                <div className="flex flex-col gap-0.5 -mt-0.5">
                                    <span className="text-[13px] font-black text-slate-900 tabular-nums">
                                        {format(new Date(reg.registrado_em), 'HH:mm')}
                                    </span>
                                    <div className={`
                                        text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded
                                        ${reg.tipo === 'entrada' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}
                                    `}>
                                        {reg.tipo} {reg.ip_origem === 'SISTEMA-AUTOMATICO' ? 'AUTO' : (reg.aviso ? 'FORA' : '')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                        <div className="w-px h-12 bg-gradient-to-b from-transparent via-slate-400 to-transparent mb-4" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] vertical-text">Vazio</span>
                    </div>
                )}
            </div>
        </div>
    );
});
