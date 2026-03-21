import { memo } from 'react';
import { 
    CheckCircle2, 
    Clock, 
    Trophy, 
    Target,
    Zap,
    Star
} from 'lucide-react';
import { usarPerfil } from '@/funcionalidades/perfil/hooks/usarPerfil';

/**
 * ⚡ PERFORMANCE MONITOR: THE TACTICAL HUD
 * Design minimalista e sofisticado para monitoramento individual.
 */
export const ResumoPessoalDashboard = memo(() => {
    const { perfil, stats, carregando } = usarPerfil();

    if (carregando) {
        return (
            <div className="h-40 w-full bg-card/10 animate-pulse rounded-[40px] border border-white/5" />
        );
    }

    if (!perfil) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Metrica: Concluídas */}
            <div className="group flex flex-col justify-between p-8 bg-card/10 border border-white/5 rounded-[40px] transition-all hover:bg-white/[0.04] hover:border-emerald-500/20 active:scale-95">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
                        <Star className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Entregas</span>
                </div>
                <div>
                    <span className="text-4xl font-black text-foreground group-hover:translate-x-1 transition-transform">{stats?.tarefas.concluidas || 0}</span>
                    <p className="text-[9px] font-bold text-muted-foreground/30 uppercase mt-1 tracking-[0.2em] leading-none">Total Validade</p>
                </div>
            </div>

            {/* Metrica: Aproveitamento */}
            <div className="group flex flex-col justify-between p-8 bg-card/10 border border-white/5 rounded-[40px] transition-all hover:bg-white/[0.04] hover:border-amber-500/20 active:scale-95">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/10">
                        <Trophy className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Qualidade</span>
                </div>
                <div>
                    <span className="text-4xl font-black text-foreground group-hover:translate-x-1 transition-transform">{stats?.tarefas.aproveitamento || 0}%</span>
                    <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden border border-white/5">
                        <div 
                            className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                            style={{ width: `${stats?.tarefas.aproveitamento || 0}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Metrica: Engajamento */}
            <div className="group flex flex-col justify-between p-8 bg-card/10 border border-white/5 rounded-[40px] transition-all hover:bg-white/[0.04] hover:border-blue-500/20 active:scale-95">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/10">
                        <Clock className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Frequência</span>
                </div>
                <div>
                    <span className="text-4xl font-black text-foreground group-hover:translate-x-1 transition-transform">{stats?.ponto.batidasMes || 0}d</span>
                    <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden border border-white/5">
                        <div 
                            className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                            style={{ width: `${Math.min(((stats?.ponto.batidasMes || 0) / 22) * 100, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Metrica: Esforço */}
            <div className="group flex flex-col justify-between p-8 bg-card/10 border border-white/5 rounded-[40px] transition-all hover:bg-white/[0.04] hover:border-primary/20 active:scale-95">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
                        <Target className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Estimado</span>
                </div>
                <div>
                    <span className="text-4xl font-black text-foreground group-hover:translate-x-1 transition-transform">{stats?.ponto.estimativaHoras || 0}h</span>
                    <p className="text-[9px] font-bold text-muted-foreground/30 uppercase mt-1 tracking-[0.2em] leading-none">Horas Alocadas</p>
                </div>
            </div>

        </div>
    );

});
