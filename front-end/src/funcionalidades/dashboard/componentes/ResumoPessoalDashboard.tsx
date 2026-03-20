import { memo, useState } from 'react';
import { 
    CheckCircle2, 
    Clock, 
    Trophy, 
    Target,
    ArrowUpRight,
    Briefcase,
    User
} from 'lucide-react';
import { usarPerfil } from '@/funcionalidades/perfil/hooks/usarPerfil';
import { Skeleton } from '@/compartilhado/componentes/Skeleton';
import { ModalEdicaoPerfil } from '@/funcionalidades/perfil/componentes/ModalEdicaoPerfil';

/**
 * Componente de resumo pessoal para o Dashboard.
 * Exibe métricas individuais do usuário, independente do projeto selecionado.
 * Agora integrado com Modal de Ajustes de Perfil.
 */
export const ResumoPessoalDashboard = memo(() => {
    const { perfil, stats, carregando } = usarPerfil();
    const [modalAberto, setModalAberto] = useState(false);

    if (carregando) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 bg-muted/20 rounded-3xl border border-border/40" />
                ))}
            </div>
        );
    }

    if (!perfil) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Card: Tarefas Concluídas */}
            <div className="group relative bg-card/40 backdrop-blur-xl border border-border/40 p-5 rounded-[32px] transition-all duration-300 hover:shadow-lg active:scale-95">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Entregas</span>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-foreground group-hover:translate-x-1 transition-transform">{stats?.tarefas.concluidas || 0}</div>
                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-1">Concluídas</p>
                    </div>
                </div>
            </div>

            {/* Card: Aproveitamento */}
            <div className="group relative bg-card/40 backdrop-blur-xl border border-border/40 p-6 rounded-[40px] transition-all duration-300 hover:shadow-lg active:scale-95">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-amber-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600/60">Qualidade</span>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-amber-600 group-hover:translate-x-1 transition-transform">{stats?.tarefas.aproveitamento || 0}%</div>
                        <div className="w-full h-1.5 bg-amber-500/10 rounded-full mt-2 overflow-hidden border border-amber-500/5">
                            <div 
                                className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-1000"
                                style={{ width: `${stats?.tarefas.aproveitamento || 0}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Card: Frequência (Ponto) */}
            <div className="group relative bg-card/40 backdrop-blur-xl border border-border/40 p-6 rounded-[40px] transition-all duration-300 hover:shadow-lg active:scale-95">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600/60">Presença (Global)</span>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-blue-600 group-hover:translate-x-1 transition-transform">{stats?.ponto.batidasMes || 0}d</div>
                        <div className="w-full h-1.5 bg-blue-500/10 rounded-full mt-2 overflow-hidden border border-blue-500/5">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(((stats?.ponto.batidasMes || 0) / 22) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Card: Estimativa de Horas */}
            <div className="group relative bg-card/40 backdrop-blur-xl border border-border/40 p-6 rounded-[40px] transition-all duration-300 hover:shadow-lg active:scale-95">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                            <Target className="w-5 h-5 text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60">Tempo (Global)</span>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-indigo-600 group-hover:translate-x-1 transition-transform">{stats?.ponto.estimativaHoras || 0}h</div>
                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-1">Duração Total</p>
                    </div>
                </div>
            </div>
        </div>
    );

});
