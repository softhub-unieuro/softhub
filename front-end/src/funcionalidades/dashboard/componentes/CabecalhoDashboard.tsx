import { memo, useState } from 'react';
import { 
    CheckCircle2, 
    AlertCircle, 
    Clock,
    Target,
    Zap,
    User,
    Briefcase
} from 'lucide-react';
import { ModalEdicaoPerfil } from '@/funcionalidades/perfil/componentes/ModalEdicaoPerfil';
import { usarPerfil } from '@/funcionalidades/perfil/hooks/usarPerfil';
import { LABELS_ROLES } from '@/utilitarios/constantes';
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
 * Cabeçalho de destaque do Dashboard com saudação e métricas rápidas.
 * Integração total com perfil e métricas em tempo real (Visão Global).
 */
export const CabecalhoDashboard = memo(({ nomeUsuario, projetosAtivos, metricas }: CabecalhoDashboardProps) => {
    const { perfil } = usarPerfil();
    const { projetoAtivoId, setProjetoAtivoId } = usarAutenticacao();
    const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
    const primeiroNome = nomeUsuario?.split(' ')[0] || 'Desenvolvedor';
    const ehGlobal = !projetoAtivoId || projetoAtivoId === 'global';
    
    // Encontrar o nome do projeto ativo
    const projetoAtivoNome = projetosAtivos.find(p => p.id === projetoAtivoId)?.nome;

    return (
        <div className="space-y-6 mb-8">
            {/* Saudação e Ações Rápidas */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-black tracking-tighter text-foreground sm:text-5xl drop-shadow-sm">
                            Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-indigo-400">{primeiroNome}</span>! 👋
                        </h1>
                        {perfil?.esta_em_expediente && (
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Em Expediente</span>
                            </div>
                        )}
                        {ehGlobal && !perfil?.esta_em_expediente && (
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-primary/20 border border-primary/30 rounded-full animate-pulse">
                                <Zap className="w-3 h-3 text-primary fill-primary" />
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Global</span>
                            </div>
                        )}
                    </div>
                    <p className="text-muted-foreground font-medium text-sm sm:text-base max-w-2xl">
                        {ehGlobal 
                            ? "Acompanhando a operação consolidada de todos os seus projetos ativos."
                            : `Status atual da operação no projeto ${projetoAtivoNome || 'selecionado'}.`
                        }
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setModalPerfilAberto(true)}
                        className="group flex items-center gap-2.5 px-6 py-3 bg-card/40 backdrop-blur-md hover:bg-card border border-border/40 rounded-3xl transition-all active:scale-95 shadow-sm hover:shadow-md"
                    >
                        <User className="w-4 h-4 text-primary group-hover:scale-110 transition-transform duration-300" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-foreground/80">Perfil</span>
                    </button>

                    <div className="flex items-center gap-2.5 px-5 py-3 bg-primary/5 border border-primary/10 rounded-3xl backdrop-blur-sm">
                        <Briefcase className="w-4 h-4 text-primary" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-primary leading-none">
                            {perfil?.equipe_nome || 'S/ Equipe'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Modal de Perfil Unificado */}
            <ModalEdicaoPerfil aberto={modalPerfilAberto} aoFechar={() => setModalPerfilAberto(false)} />

            {/* Lista de Projetos Monitorados (Radar Clickable) */}
            <div className="flex flex-wrap items-center gap-3 animate-in slide-in-from-left-4 duration-700">
                <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-card/50 backdrop-blur-md border border-border/40 rounded-[24px]">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-80 px-2">Radar:</span>
                    
                    {/* Botão Global */}
                    <button
                        onClick={() => setProjetoAtivoId('')}
                        className={`h-7 px-4 rounded-full flex items-center transition-all text-[10px] font-black uppercase tracking-widest ${ehGlobal ? 'bg-primary text-white shadow-lg shadow-primary/20 ring-2 ring-primary/20' : 'bg-primary/5 text-primary/60 hover:bg-primary/10'}`}
                    >
                        Visão Global
                    </button>

                    <div className="w-px h-4 bg-border/40 mx-1" />

                    <div className="flex flex-wrap items-center gap-2">
                        {projetosAtivos.map(p => (
                            <button 
                                key={p.id} 
                                onClick={() => setProjetoAtivoId(p.id)}
                                className={`h-7 px-4 rounded-full flex items-center transition-all text-[10px] font-bold border ${projetoAtivoId === p.id ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-card/40 border-border/40 text-muted-foreground hover:border-blue-500/40 hover:text-foreground'}`}
                            >
                                {p.nome}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid de Performance Operacional (Vision System System) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Ativas */}
                <div className="group relative bg-card/40 backdrop-blur-xl hover:bg-card border border-border/40 hover:border-blue-500/30 p-5 rounded-[32px] transition-all duration-500 shadow-sm hover:shadow-xl active:scale-95">
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/10 shadow-inner group-hover:bg-blue-500/20 transition-colors">
                                <Target className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Ativas</span>
                                <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">Total</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-4xl font-black text-foreground tracking-tighter group-hover:translate-x-1 transition-transform">{metricas?.totalTarefas || 0}</div>
                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-2">Tarefas em Aberto</p>
                        </div>
                    </div>
                </div>

                {/* Entregues */}
                <div className="group relative bg-card/40 backdrop-blur-xl hover:bg-card border border-border/40 hover:border-emerald-500/30 p-5 rounded-[32px] transition-all duration-500 shadow-sm hover:shadow-xl active:scale-95">
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10 shadow-inner group-hover:bg-emerald-500/20 transition-colors">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Concluídas</span>
                                <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">Sucesso</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-4xl font-black text-foreground tracking-tighter group-hover:translate-x-1 transition-transform">{metricas?.tarefasConcluidas || 0}</div>
                            <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest mt-2 leading-none">Total Entregue</p>
                        </div>
                    </div>
                </div>

                {/* Críticas */}
                <div className="group relative bg-card/40 backdrop-blur-xl hover:bg-card border border-border/40 hover:border-rose-500/30 p-5 rounded-[32px] transition-all duration-500 shadow-sm hover:shadow-xl active:scale-95">
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/10 shadow-inner group-hover:bg-rose-500/20 transition-colors">
                                <AlertCircle className="w-5 h-5 text-rose-600" />
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black uppercase tracking-widest text-rose-600">Atrasadas</span>
                                <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">Alerta</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-4xl font-black text-foreground tracking-tighter group-hover:translate-x-1 transition-transform">{metricas?.tarefasAtrasadas || 0}</div>
                            <p className="text-[9px] text-rose-600 font-black uppercase tracking-widest mt-2 underline decoration-rose-500/20 underline-offset-4">Fora do Prazo</p>
                        </div>
                    </div>
                </div>

                {/* Eficiência / Progresso */}
                <div className="group relative bg-card/40 backdrop-blur-xl hover:bg-card border border-border/40 hover:border-primary/40 p-5 rounded-[32px] transition-all duration-500 shadow-sm hover:shadow-xl active:scale-95">
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10 shadow-inner group-hover:bg-primary/20 transition-colors">
                                <Zap className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary">Progresso</span>
                                <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">Status</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-4xl font-black text-primary tracking-tighter group-hover:translate-x-1 transition-transform">{metricas?.progressoGeral || 0}%</div>
                            <div className="w-full h-1.5 bg-primary/10 rounded-full mt-3 overflow-hidden border border-primary/5">
                                <div 
                                    className="h-full bg-gradient-to-r from-primary via-blue-400 to-primary/80 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${metricas?.progressoGeral || 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
