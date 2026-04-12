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
            {/* SITUAÇÃO ATUAL */}
            <div className={`
                card-glass p-5 sm:p-7 flex flex-col justify-between gap-6 card-glass-hover group transition-all relative overflow-hidden
                ${ultimoRegistro?.tipo === 'entrada' ? 'bg-emerald-500/[0.02] border-emerald-500/20' : ''}
            `}>
                <div className="flex items-start justify-between relative z-10">
                    <div className={`
                        p-3 rounded-2xl border transition-all duration-500
                        ${ultimoRegistro?.tipo === 'entrada' 
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 rotate-3' 
                            : 'bg-slate-950/[0.03] text-slate-400 border-slate-950/5 group-hover:rotate-6'}
                    `}>
                        <LayoutDashboard size={20} className="sm:w-[24px] sm:h-[24px]" strokeWidth={2.5} />
                    </div>
                </div>
                <div className="space-y-1 relative z-10">
                    <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-slate-400/80">Minha Situação</p>
                    <p className={`
                        text-xl sm:text-2xl font-black leading-tight tracking-tight
                        ${ultimoRegistro?.tipo === 'entrada' ? 'text-emerald-600' : 'text-slate-900'}
                    `}>
                        {ultimoRegistro?.tipo === 'entrada' ? 'Trabalhando' : 'Descanso'}
                    </p>
                </div>
                {ultimoRegistro?.tipo === 'entrada' && (
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
                )}
            </div>

            {/* CRONÔMETRO DE HOJE */}
            <div className="card-glass p-5 sm:p-7 flex flex-col justify-between gap-6 card-glass-hover group transition-all relative overflow-hidden bg-slate-900 text-white border-slate-800">
                <div className="flex items-start justify-between relative z-10">
                    <div className="p-3 bg-white/5 text-amber-400 rounded-2xl border border-white/10 group-hover:scale-110 transition-transform">
                        <Clock size={20} className="sm:w-[24px] sm:h-[24px]" strokeWidth={2.5} />
                    </div>
                    {cronometroJornada && (
                         <div className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-black tracking-widest">LIVE</div>
                    )}
                </div>
                <div className="space-y-1 relative z-10">
                    <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Horas de Hoje</p>
                    <p className="text-xl sm:text-2xl font-black leading-tight tabular-nums tracking-tight text-white">
                        {cronometroJornada?.texto || '00:00:00'}
                    </p>
                </div>
            </div>
        </div>
    );
});
