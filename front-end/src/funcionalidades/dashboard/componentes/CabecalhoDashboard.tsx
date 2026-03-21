import { memo } from 'react';
import { 
    CheckCircle2, 
    AlertCircle, 
    Target,
    Zap,
    Briefcase,
    Activity,
    Layers
} from 'lucide-react';
import type { ProjetoDashboard } from '../hooks/usarDashboard';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';

interface CabecalhoDashboardProps {
    nomeUsuario: string;
    projetosAtivos: ProjetoDashboard[];
    metricas: {
        totalTarefas: number;
        tarefasConcluidas: number;
        tarefasAtrasadas: number;
        horasRegistradasHoje: number;
        progressoGeral: number;
    } | null;
}

/**
 * 🛰️ HUB DE MÉTRICAS: THE SILK HUD
 * Design de elite baseado em módulos limpos, bordas sutis e tipografia cristalina.
 */
export const CabecalhoDashboard = memo(({ nomeUsuario, projetosAtivos, metricas }: CabecalhoDashboardProps) => {

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* KPI: TOTAL ATIVO */}
            <div className="group relative bg-card/10 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 flex flex-col justify-between transition-all hover:bg-white/[0.04] hover:border-blue-500/20 active:scale-95">
                <div className="flex items-center justify-between mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/10">
                        <Target className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500/60">Ativos</span>
                </div>
                <div>
                   <h4 className="text-5xl font-black tracking-tighter text-foreground group-hover:translate-x-1 transition-transform">{metricas?.totalTarefas || 0}</h4>
                   <p className="text-[9px] font-bold text-muted-foreground/30 uppercase mt-2 tracking-widest">Tasks em aberto no radar</p>
                </div>
            </div>

            {/* KPI: ENTREGAS */}
            <div className="group relative bg-card/10 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 flex flex-col justify-between transition-all hover:bg-white/[0.04] hover:border-emerald-500/20 active:scale-95">
                <div className="flex items-center justify-between mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60">Entregues</span>
                </div>
                <div>
                   <h4 className="text-5xl font-black tracking-tighter text-foreground group-hover:translate-x-1 transition-transform">{metricas?.tarefasConcluidas || 0}</h4>
                   <p className="text-[9px] font-bold text-muted-foreground/30 uppercase mt-2 tracking-widest">Sucessos validados hoje</p>
                </div>
            </div>

            {/* KPI: ATRASOS */}
            <div className="group relative bg-card/10 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 flex flex-col justify-between transition-all hover:bg-white/[0.04] hover:border-rose-500/20 active:scale-95">
                <div className="flex items-center justify-between mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/10">
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500/60">Alertas</span>
                </div>
                <div>
                   <h4 className="text-5xl font-black tracking-tighter text-foreground group-hover:translate-x-1 transition-transform">{metricas?.tarefasAtrasadas || 0}</h4>
                   <p className="text-[9px] font-bold text-rose-500 uppercase mt-2 tracking-widest">Ações críticas urgentes</p>
                </div>
            </div>

            {/* KPI: EFICIÊNCIA */}
            <div className="group relative bg-card/10 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 flex flex-col justify-between transition-all hover:bg-white/[0.04] hover:border-primary/20 active:scale-95">
                <div className="flex items-center justify-between mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
                        <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Eficiência</span>
                </div>
                <div>
                   <h4 className="text-5xl font-black tracking-tighter text-foreground group-hover:translate-x-1 transition-transform">{metricas?.progressoGeral || 0}%</h4>
                   <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden border border-white/5">
                        <div 
                            className="h-full bg-primary"
                            style={{ width: `${metricas?.progressoGeral || 0}%` }}
                        />
                   </div>
                </div>
            </div>

        </div>
    );
});
