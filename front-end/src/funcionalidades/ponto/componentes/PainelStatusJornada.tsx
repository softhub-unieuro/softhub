import { memo } from 'react';
import { LayoutDashboard, Clock } from 'lucide-react';
import type { RegistroPonto } from '@/funcionalidades/ponto/hooks/usarPonto';

interface PainelStatusJornadaProps {
    ultimoRegistro: RegistroPonto | null;
    cronometroJornada: { texto: string; finalizadoAuto: boolean } | null;
}

export const PainelStatusJornada = memo(({ ultimoRegistro, cronometroJornada }: PainelStatusJornadaProps) => {
    return (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* TILE 2: STATUS */}
            <div className="card-glass p-4 sm:p-6 flex flex-col justify-between gap-3 sm:gap-4 card-glass-hover group transition-all">
                <div className="flex items-start justify-between">
                    <div className="p-2 sm:p-3 bg-slate-950/[0.03] text-slate-950 rounded-xl sm:rounded-2xl border border-slate-950/5 group-hover:bg-emerald-500/5 group-hover:text-emerald-600 transition-colors">
                        <LayoutDashboard size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
                    </div>
                    <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mt-1 sm:mt-2 ring-2 sm:ring-4 ${ultimoRegistro?.tipo === 'entrada' ? 'bg-emerald-500 ring-emerald-500/10 animate-pulse' : 'bg-slate-200 ring-slate-100'}`} />
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Minha Situação</p>
                    <p className="text-lg sm:text-2xl font-black text-slate-900 leading-tight tracking-tight">
                        {ultimoRegistro?.tipo === 'entrada' ? 'Trabalhando' : 'Descanso'}
                    </p>
                </div>
            </div>

            {/* TILE 3: JORNADA */}
            <div className="card-glass p-4 sm:p-6 flex flex-col justify-between gap-3 sm:gap-4 card-glass-hover group transition-all">
                <div className="flex items-start justify-between">
                    <div className="p-2 sm:p-3 bg-amber-500/5 text-amber-600 rounded-xl sm:rounded-2xl border border-amber-500/5">
                        <Clock size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
                    </div>
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Horas de Hoje</p>
                    <p className="text-lg sm:text-2xl font-black text-slate-900 leading-tight tabular-nums tracking-tight">
                        {cronometroJornada?.texto || '00:00:00'}
                    </p>
                </div>
            </div>
        </div>
    );
});
