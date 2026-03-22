import { memo, useMemo, useEffect, useState } from 'react';
import { usarDashboard } from '@/funcionalidades/dashboard/hooks/usarDashboard';
import { usarProjetos } from '@/funcionalidades/projetos/hooks/usarProjetos';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { EstadoErro } from '@/compartilhado/componentes/EstadoErro';
import { DashboardVazio } from './DashboardVazio';
import { ComunicadosPrioritarios } from './ComunicadosPrioritarios';
import { MinhasTarefasLista } from './MinhasTarefasLista';
import { ResumoPessoalDashboard } from './ResumoPessoalDashboard';
import { Skeleton } from '@/compartilhado/componentes/Skeleton';
import { CabecalhoDashboard } from './CabecalhoDashboard';
import { ModalEdicaoPerfil } from '@/funcionalidades/perfil/componentes/ModalEdicaoPerfil';
import { usarPerfil } from '@/funcionalidades/perfil/hooks/usarPerfil';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { 
    LayoutPanelLeft, 
    Zap, 
    Users, 
    ChevronRight,
    CalendarDays,
    Sparkles
} from 'lucide-react';

// Saudação inteligente baseada na hora do dia
function obterSaudacao(): string {
    const hora = new Date().getHours();
    if (hora >= 0 && hora < 6) return 'Boa madrugada';
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
}

// Data formatada elegante
function obterDataFormatada(): string {
    return new Date().toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    });
}

/**
 * 💎 DASHBOARD — THE SILK COCKPIT v3
 * Header reimaginado como um Command Center pessoal.
 */
export const PaginaDashboard = memo(() => {
    const { projetoAtivoId, setProjetoAtivoId, usuario } = usarAutenticacao();
    const { projetos, carregando: carregandoProjetos } = usarProjetos();
    const { perfil, stats } = usarPerfil();
    const podeGerenciarProjetos = usarPermissaoAcesso('projetos:visualizar');
    
    const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
    
    useEffect(() => {
        if (!projetoAtivoId && projetos.length > 0) {
            setProjetoAtivoId(projetos[0].id);
        }
    }, [projetoAtivoId, projetos, setProjetoAtivoId]);
    
    const { 
        metricas: metricasGlobais, 
        carregando: carregandoGeral 
    } = usarDashboard('global');

    const { 
        avisos, 
        minhasTarefas, 
        carregando: carregandoProjeto, 
        erro 
    } = usarDashboard(projetoAtivoId !== 'global' ? projetoAtivoId : undefined);
    
    const carregando = carregandoGeral || carregandoProjeto || carregandoProjetos;

    const projetoAtivo = useMemo(() => 
        projetos.find(p => p.id === projetoAtivoId), 
        [projetos, projetoAtivoId]
    );

    const pendentes = (metricasGlobais?.totalTarefas || 0) - (metricasGlobais?.tarefasConcluidas || 0);

    if (erro) return <div className="flex-1 p-12"><EstadoErro titulo="Erro no Dashboard" mensagem={erro} /></div>;
    const semProjetos = !carregandoProjetos && projetos.length === 0;

    // Skeletons localizados para cada seção
    const SkeletonHeader = () => <Skeleton className="h-[220px] rounded-[32px] w-full" />;
    const SkeletonGrid = () => (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
            <div className="xl:col-span-8"><Skeleton className="h-[400px] rounded-[32px] w-full" /></div>
            <div className="xl:col-span-4"><Skeleton className="h-[400px] rounded-[32px] w-full" /></div>
        </div>
    );

    return (
        <div className="relative flex-1 w-full min-w-0 space-y-14 overflow-x-hidden">
            
            {/* ═══════════════════════════════════════════════════ */}
            {/* 🎯 COMMAND CENTER HEADER                          */}
            {/* ═══════════════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-[32px] border border-white/[0.06] bg-gradient-to-br from-card/80 via-background/60 to-card/40 backdrop-blur-2xl">
                
                {/* Textura sutil no fundo — geometria de precisão */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 0.5px, transparent 0)`,
                    backgroundSize: '24px 24px'
                }} />
                <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-primary/[0.04] to-transparent" />
                
                <div className="relative z-10 p-6 lg:p-2">
                    
                    {/* LINHA SUPERIOR: Saudação + Data */}
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Online</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                                    <CalendarDays className="w-3 h-3 text-muted-foreground/40" />
                                    <span className="text-[10px] font-medium text-muted-foreground/50 capitalize">{obterDataFormatada()}</span>
                                </div>
                            </div>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-foreground leading-[0.95]">
                                {obterSaudacao()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-indigo-400">
                                    {usuario?.nome?.split(' ')[0]}!
                                </span> {new Date().getHours() >= 18 || new Date().getHours() < 6 ? '🌙' : '✨'}
                            </h1>
                            <p className="text-muted-foreground/50 text-sm font-medium max-w-md">
                                {pendentes > 0 
                                    ? `Você tem ${pendentes} tarefa${pendentes > 1 ? 's' : ''} pendente${pendentes > 1 ? 's' : ''} — foco no que importa.`
                                    : 'Tudo concluído por agora. Bom trabalho!'
                                }
                            </p>
                        </div>

                        {/* QUICK STATS — Mini resumo visual */}
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                <span className="text-2xl font-black text-foreground">{stats?.tarefas.concluidas || 0}</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/60">entregas</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                <span className="text-2xl font-black text-foreground">{stats?.tarefas.aproveitamento || 0}%</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500/60">qualidade</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                <span className="text-2xl font-black text-foreground">{stats?.ponto.estimativaHoras || 0}h</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-blue-500/60">horas</span>
                            </div>
                        </div>
                    </div>

                    {/* LINHA INFERIOR: Perfil + Equipe + Role */}
                    <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.04]">
                        
                        {/* CARD PERFIL */}
                        <button 
                            onClick={() => setModalPerfilAberto(true)}
                            className="group/card flex items-center gap-3.5 py-2 pl-2 pr-5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-primary/20 transition-all duration-300 active:scale-[0.97]"
                        >
                            <div className="relative">
                                <div className="p-[2px] bg-gradient-to-br from-primary via-blue-500 to-indigo-500 rounded-full">
                                    <div className="bg-background rounded-full p-[2px]">
                                        <Avatar 
                                            nome={usuario?.nome || ''} 
                                            fotoPerfil={perfil?.foto_perfil || null} 
                                            tamanho="md" 
                                        />
                                    </div>
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background" />
                            </div>
                            <div className="flex flex-col items-start min-w-0">
                                <span className="text-xs font-bold text-foreground truncate group-hover/card:text-primary transition-colors">{usuario?.nome?.split(' ').slice(0, 2).join(' ')}</span>
                                <span className="text-[10px] text-muted-foreground/40 truncate">{perfil?.email || 'Ver Perfil'}</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover/card:text-primary group-hover/card:translate-x-0.5 transition-all ml-1" />
                        </button>

                        {/* CARD EQUIPE */}
                        <div className="flex items-center gap-3 py-2 pl-2.5 pr-5 rounded-full bg-white/[0.04] border border-white/5">
                            <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/15">
                                <Users className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold text-foreground">{perfil?.equipe_nome || 'Sem equipe'}</span>
                                <span className="text-[10px] text-muted-foreground/40">{perfil?.grupo_nome || 'Não atribuído'}</span>
                            </div>
                        </div>

                        {/* BADGE DE ROLE */}
                        {perfil?.role && (
                            <div className="flex items-center gap-2 py-2 pl-3 pr-4 rounded-full bg-primary/5 border border-primary/10">
                                <Sparkles className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{perfil.role}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Perfil Integrado */}
            <ModalEdicaoPerfil aberto={modalPerfilAberto} aoFechar={() => setModalPerfilAberto(false)} />

            {/* ═══════════════════════════════════════════════════ */}
            {/* 📊 MÉTRICAS OPERACIONAIS E GRID OPERACIONAL       */}
            {/* ═══════════════════════════════════════════════════ */}
            {semProjetos ? (
                <DashboardVazio podeGerenciarProjetos={podeGerenciarProjetos} />
            ) : carregandoGeral ? (
                <div className="space-y-12">
                    <SkeletonHeader />
                    <SkeletonGrid />
                </div>
            ) : (
                <>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-7 bg-blue-500 rounded-full" />
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/70">Métricas Operacionais</h3>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">{projetoAtivo?.nome || 'Global'}</span>
                        </div>
                        <CabecalhoDashboard 
                            nomeUsuario={usuario?.nome || ''} 
                            projetosAtivos={projetos} 
                            metricas={metricasGlobais}
                        />
                    </div>

                    {carregandoProjeto ? (
                        <SkeletonGrid />
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
                            {/* COLUNA ESQUERDA (SPAN 8) */}
                            <div className="xl:col-span-8 space-y-12">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 px-1">
                                        <div className="w-1 h-7 bg-rose-500/50 rounded-full" />
                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/70">Fila de Trabalho</h3>
                                    </div>
                                    <MinhasTarefasLista minhasTarefas={minhasTarefas} />
                                </div>
                            </div>

                            {/* COLUNA DIREITA (SPAN 4) */}
                            <div className="xl:col-span-4 space-y-12">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 px-1">
                                        <div className="w-1 h-7 bg-amber-500/50 rounded-full" />
                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/70">Briefing</h3>
                                    </div>
                                    <ComunicadosPrioritarios avisos={avisos} />
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

export default PaginaDashboard;
