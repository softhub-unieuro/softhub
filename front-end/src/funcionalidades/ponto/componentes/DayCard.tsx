import { memo, useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock } from 'lucide-react';
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
            flex flex-col items-center w-full p-4 sm:p-5 rounded-2xl border transition-all duration-500 relative group
            ${hoje
                ? 'bg-white border-primary/20 shadow-[0_25px_60px_-15px_rgba(var(--primary-rgb),0.15)] ring-1 ring-primary/5'
                : 'bg-white/40 border-slate-200/60 hover:bg-white hover:border-slate-300 hover:shadow-xl'
            }
        `}>
            {/* Top Identity Line */}
            {hoje && (
                <div className="absolute top-0 inset-x-8 sm:inset-x-12 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-b-full opacity-60" />
            )}

            {/* Header: Clean Typography */}
            <div className="flex flex-col items-center justify-center w-full mb-4 sm:mb-6 pt-1 sm:pt-2">
                <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-1 sm:mb-2 ${hoje ? 'text-primary' : 'text-slate-400'}`}>
                    {format(dia, 'EEEE', { locale: ptBR }).split('-')[0]}
                </span>
                <div className="relative flex items-center justify-center mb-1">
                    <span className={`text-4xl sm:text-5xl font-black tabular-nums tracking-tighter transition-all ${hoje ? 'text-slate-900 scale-105' : 'text-slate-200'}`}>
                        {format(dia, 'dd')}
                    </span>
                    {hoje && (
                        <div className="absolute -right-2 sm:-right-3 -top-1 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)] animate-pulse" />
                    )}
                </div>
                {temRegistros && (
                    <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border ${hoje ? 'bg-primary/5 border-primary/10 text-primary' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                        <Clock size={11} className="sm:w-[13px] sm:h-[13px]" strokeWidth={2.5} />
                        <span className="text-[10px] sm:text-[11px] font-black tabular-nums tracking-tight">
                            {formatarHoras(totalMinutos)}
                        </span>
                    </div>
                )}
            </div>

            {/* activity records - chronological log ribbon with internal scroll */}
            <div className="flex flex-col w-full h-[160px] sm:h-[200px] px-1 overflow-y-auto scrollbar-none scroll-smooth">
                {temRegistros ? (
                    <div className="flex flex-col gap-5 py-2">
                        {registrosOrdenados.map((reg, idx, arr) => (
                            <div key={reg.id} className="relative flex items-center gap-3 group/item">
                                {/* Visual Connector */}
                                {idx < arr.length - 1 && (
                                    <div className="absolute left-[7px] top-4 w-[2px] h-7 bg-slate-100/80 rounded-full" />
                                )}
                                
                                {/* Dynamic Node */}
                                <div className={`
                                    w-4 h-4 rounded-full border-2 bg-white z-10 shrink-0 transition-all duration-300
                                    ${reg.tipo === 'entrada' 
                                        ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)] group-hover/item:shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                                        : 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)] group-hover/item:shadow-[0_0_15px_rgba(244,63,94,0.4)]'}
                                `} />

                                <div className="flex flex-col justify-center">
                                    <span className="text-sm font-black text-slate-800 tabular-nums leading-none">
                                        {format(new Date(reg.registrado_em), 'HH:mm')}
                                    </span>
                                    <span className={`text-[8px] font-black uppercase tracking-[0.15em] mt-1 ${reg.tipo === 'entrada' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {reg.tipo}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-6 border border-dashed border-slate-100 rounded-2xl opacity-30">
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-2">Sem atividade</span>
                    </div>
                )}
            </div>
        </div>
    );
});
