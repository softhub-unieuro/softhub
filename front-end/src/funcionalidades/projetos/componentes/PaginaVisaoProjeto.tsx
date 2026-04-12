import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '@/compartilhado/servicos/api';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { usarProjetos } from '@/funcionalidades/projetos/hooks/usarProjetos';
import { FolderKanban, Globe, Lock, Github, FileText, BarChart3, Layers, ExternalLink, LayoutGrid, Figma, BookOpen, Terminal, Users2, Rocket, History, Megaphone, Box, ArrowRight, CheckCircle2 } from 'lucide-react';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { formatarDataHora, formatarTempoAtras, formatarEventoHistorico } from '@/utilitarios/formatadores';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { Botao } from '@/compartilhado/componentes/ui/Botao';
import { Avatar } from '@/compartilhado/componentes/Avatar';

interface VisaoProjeto {
    feed: any[];
    avisos: any[];
}

export default function PaginaVisaoProjeto() {
    const navegar = useNavigate();
    const { projetoAtivoId } = usarAutenticacao();
    const { projetos, carregando } = usarProjetos();
    const [visao, setVisao] = useState<VisaoProjeto>({ feed: [], avisos: [] });
    const [carregandoVisao, setCarregandoVisao] = useState(false);
    
    const podeVerDocumentos = usarPermissaoAcesso('projetos:documentos');

    const projeto = projetos.find(p => p.id === projetoAtivoId);

    // Carregar dados extras (feed e avisos) quando o projeto mudar
    useEffect(() => {
        if (!projetoAtivoId) return;
        setCarregandoVisao(true);
        api.get(`/api/projetos/${projetoAtivoId}/visao`)
            .then(res => setVisao(res.data))
            .catch(() => {})
            .finally(() => setCarregandoVisao(false));
    }, [projetoAtivoId]);

    if (carregando && !projeto) {
        return <div className="flex justify-center py-20"><Carregando /></div>;
    }

    if (!projeto) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Layers size={24} className="text-muted-foreground" />
                </div>
                <h3 className="text-foreground font-black uppercase tracking-widest mb-2">Nenhum Projeto Selecionado</h3>
                <p className="text-muted-foreground text-sm">Selecione um projeto na barra lateral para ver seus detalhes.</p>
            </div>
        );
    }

    const urGitHubDocs = projeto.github_repo ? `https://github.com/${import.meta.env.VITE_GITHUB_STORAGE_OWNER}/${projeto.github_repo}/tree/main/docs/softhub` : '#';

    const pctConcluido = projeto.total_tarefas && projeto.total_tarefas > 0 
        ? Math.round(((projeto.tarefas_concluidas || 0) / projeto.total_tarefas) * 100) 
        : 0;

    return (
        <div className="flex flex-col gap-6 animar-entrada">
            <CabecalhoFuncionalidade
                titulo={projeto.nome}
                subtitulo="Visão geral e artefatos deste projeto."
                icone={FolderKanban}
            >
                <div className="flex gap-3">
                    <Botao 
                        variante="secundario"
                        onClick={() => navegar(`/app/kanban?projetoId=${projeto.id}`)}
                        className="h-11 px-6 rounded-full flex items-center gap-2 text-[11px] font-black uppercase tracking-widest border-border hover:border-primary/30 transition-all"
                        icone={<LayoutGrid size={18} strokeWidth={3} />}
                        rotulo="Abrir Kanban"
                    />
                    {podeVerDocumentos && projeto.github_repo && (
                        <Botao 
                            variante="primario"
                            onClick={() => window.open(urGitHubDocs, '_blank')}
                            className="h-11 px-6 rounded-full flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all"
                            icone={<FileText size={18} strokeWidth={3} />}
                            rotulo="Docs no GitHub"
                        />
                    )}
                </div>
            </CabecalhoFuncionalidade>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Coluna Esquerda - Governança e Detalhes */}
                <div className="lg:col-span-8 flex flex-col gap-8">
                    
                    {/* HUB PRINCIPAL: Sobre + Progresso */}
                    <div className="bg-card border border-border/60 rounded-[32px] p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                {projeto.publico ? (
                                    <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
                                        <Globe size={12} strokeWidth={3} /> Público
                                    </div>
                                ) : (
                                    <div className="px-3 py-1.5 bg-muted text-muted-foreground border border-border rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
                                        <Lock size={12} strokeWidth={3} /> Privado
                                    </div>
                                )}
                                <div className="w-1 h-1 rounded-full bg-border" />
                                <span className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-[0.2em]">
                                    {formatarDataHora(projeto.criado_em)}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 text-primary">
                                <Rocket size={16} />
                                <span className="text-[11px] font-black tracking-widest">{pctConcluido}% CONCLUÍDO</span>
                            </div>
                        </div>

                        {/* Barra de Progresso High-Tech */}
                        <div className="relative w-full h-4 bg-muted/50 rounded-full overflow-hidden mb-12 border border-border/50">
                            <div 
                                className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary via-indigo-500 to-indigo-600 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                                style={{ width: `${pctConcluido}%` }}
                            />
                            {/* Reflexo glassmorphic na barra */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div>
                                <h2 className="text-sm font-black text-foreground/50 uppercase tracking-[0.2em] mb-4">Descrição do Projeto</h2>
                                <p className="text-base text-foreground/80 leading-relaxed font-medium">
                                    {projeto.descricao || 'Nenhuma descrição detalhada.'}
                                </p>
                            </div>

                            <div className="flex flex-col gap-6">
                                <h2 className="text-sm font-black text-foreground/50 uppercase tracking-[0.2em]">Equipe Ativa</h2>
                                <div className="flex flex-wrap gap-3">
                                    {projeto.membros && projeto.membros.length > 0 ? (
                                        projeto.membros.map((membro, i) => (
                                            <div key={i} className="flex items-center gap-2 pr-3 py-1.5 bg-muted/40 rounded-full border border-border/40 hover:border-primary/30 transition-all group cursor-default">
                                                <Avatar nome={membro.nome} fotoPerfil={membro.foto} tamanho="sm" className="border-2 border-background shadow-sm" />
                                                <span className="text-[11px] font-black text-muted-foreground/80 group-hover:text-foreground transition-colors">{membro.nome.split(' ')[0]}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-muted-foreground/50 italic">Nenhum membro vinculado.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MURAL DE AVISOS DO PROJETO */}
                    <div className="bg-gradient-to-br from-indigo-600/5 to-primary/5 border border-indigo-500/20 rounded-[32px] p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Megaphone size={16} strokeWidth={3} />
                                Mural do Líder
                            </h3>
                            <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded font-black tracking-widest">{visao.avisos.length} AVISOS</span>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                            {visao.avisos.length > 0 ? (
                                visao.avisos.map(aviso => (
                                    <div key={aviso.id} className="bg-white/40 dark:bg-black/20 border border-indigo-100 dark:border-indigo-900/30 p-5 rounded-2xl">
                                        <div className="flex items-start gap-4">
                                            <Avatar nome={aviso.autor_nome} fotoPerfil={aviso.autor_foto} tamanho="sm" />
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="text-sm font-black text-foreground leading-tight">{aviso.titulo}</h4>
                                                    <span className="text-[10px] text-muted-foreground font-bold">{formatarTempoAtras(aviso.criado_em)}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground/80 leading-relaxed italic line-clamp-2">{aviso.conteudo}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center text-muted-foreground/40 italic text-xs flex flex-col items-center gap-2">
                                    <History size={24} className="opacity-20" />
                                    Nenhum aviso importante fixado ainda.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ARTEFATOS DE ENTREGA (DELIVERABLES) */}
                    <div className="bg-card border border-border/60 rounded-[32px] p-8 shadow-sm">
                         <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em] flex items-center gap-2 mb-8">
                            <Box size={16} className="text-muted-foreground" />
                            Artefatos de Entrega
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ArtifactCard 
                                titulo="Google Drive" 
                                descricao="Pasta compartilhada com assets e PDFs."
                                url="#"
                                icone={<FolderKanban className="text-amber-500" />}
                            />
                            <ArtifactCard 
                                titulo="Demo do Sistema" 
                                descricao="Link de visualização (Vercel/Netlify)."
                                url="#"
                                icone={<Globe className="text-emerald-500" />}
                            />
                             <ArtifactCard 
                                titulo="Manual do Usuário" 
                                descricao="Guia em PDF para treinamento."
                                url="#"
                                icone={<FileText className="text-rose-500" />}
                            />
                             <ArtifactCard 
                                titulo="Requisitos (PRD)" 
                                descricao="Documento de escopo aprovado."
                                url="#"
                                icone={<CheckCircle2 className="text-indigo-500" />}
                            />
                        </div>
                    </div>
                </div>

                {/* Coluna Direita - Feed, Links e Métricas */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    
                    {/* FEED DE ATIVIDADES RECENTES */}
                    <div className="bg-card border border-border/60 rounded-[32px] p-7 shadow-sm">
                        <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em] flex items-center gap-2 mb-8">
                            <History size={16} className="text-muted-foreground" />
                            Feed Ativo
                        </h3>
                        <div className="space-y-6">
                            {carregandoVisao ? (
                                <div className="space-y-4 animate-pulse">
                                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-xl" />)}
                                </div>
                            ) : visao.feed.length > 0 ? (
                                visao.feed.map(item => (
                                    <div key={item.id} className="relative pl-6">
                                        <div className="absolute left-0 top-1 bottom-0 w-px bg-border" />
                                        <div className="absolute left-[-3px] top-1 w-1.5 h-1.5 rounded-full bg-primary" />
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-foreground truncate max-w-[120px]">{item.usuario_nome}</span>
                                                <span className="text-[9px] text-muted-foreground font-bold">{formatarTempoAtras(item.alterado_em)}</span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground leading-snug">
                                                {formatarEventoHistorico(item.campo_alterado, item.valor_antigo || '', item.valor_novo || '')}
                                                <span className="block mt-1 font-bold text-[9px] text-primary uppercase">"{item.tarefa_titulo}"</span>
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground/50 text-center py-4 italic">Nenhuma atividade recente.</p>
                            )}
                        </div>
                    </div>

                    {/* LINKS TÉCNICOS */}
                    <div className="bg-card border border-border/60 rounded-[32px] p-7 shadow-sm">
                        <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                            <Layers size={16} className="text-muted-foreground" />
                            Recursos Externos
                        </h3>
                        <div className="flex flex-col gap-3">
                             <MinimalLink 
                                titulo="Figma Design" 
                                url={projeto.figma_url ?? undefined} 
                                icone={<Figma size={14} className="text-pink-500" />} 
                            />
                            <MinimalLink 
                                titulo="Documentação" 
                                url={projeto.documentacao_url ?? undefined} 
                                icone={<BookOpen size={14} className="text-blue-500" />} 
                            />
                            <MinimalLink 
                                titulo="Setup Local" 
                                url={projeto.setup_url ?? undefined} 
                                icone={<Terminal size={14} className="text-emerald-500" />} 
                            />
                            <MinimalLink 
                                titulo="Repositório Git" 
                                url={projeto.github_repo ? `https://github.com/${import.meta.env.VITE_GITHUB_STORAGE_OWNER}/${projeto.github_repo}` : undefined} 
                                icone={<Github size={14} className="text-slate-500" />} 
                            />
                        </div>
                    </div>

                    {/* MÉTRICAS DE ENTREGA */}
                    <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-7 shadow-xl shadow-slate-950/20 text-white">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-8">
                            <BarChart3 size={16} />
                            Status de Saúde
                        </h3>
                        <div className="space-y-6">
                            <MetricBox label="CONCLUÍDAS" valor={projeto.tarefas_concluidas || 0} sub={`${pctConcluido}% do total`} cor="text-emerald-400" />
                            <MetricBox label="TOTAL TAREFAS" valor={projeto.total_tarefas || 0} sub="no backlog ativo" cor="text-slate-200" />
                            <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Entrega Estimada</span>
                                <span className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-black rounded-full border border-primary/30">EM DIA</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

/**
 * Componentes de Apoio
 */

function ArtifactCard({ titulo, descricao, url, icone }: { titulo: string, descricao: string, url?: string, icone: React.ReactNode }) {
    const disabled = !url || url === '#' || url === '';
    return (
        <a 
            href={disabled ? undefined : url} 
            target="_blank" 
            rel="noreferrer"
            className={`
                group p-5 bg-card border border-border/60 rounded-2xl flex items-start gap-4 transition-all duration-300
                ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/30 hover:shadow-sm hover:-translate-y-0.5'}
            `}
        >
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                {icone}
            </div>
            <div className="flex-1">
                <h4 className="text-[12px] font-black text-foreground tracking-tight flex items-center justify-between">
                    {titulo}
                    {!disabled && <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />}
                </h4>
                <p className="text-[10px] text-muted-foreground/60 font-medium leading-relaxed mt-1">
                    {descricao}
                </p>
            </div>
        </a>
    );
}

function MinimalLink({ titulo, url, icone }: { titulo: string, url?: string, icone: React.ReactNode }) {
    const disabled = !url || url === '#' || url === '';
    return (
        <a 
            href={disabled ? undefined : url} 
            target="_blank" 
            rel="noreferrer"
            className={`
                flex items-center justify-between p-3 rounded-xl border border-border/50 transition-all
                ${disabled ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-muted hover:border-primary/20'}
            `}
        >
            <div className="flex items-center gap-3">
                {icone}
                <span className="text-xs font-bold text-foreground/80">{titulo}</span>
            </div>
            {!disabled && <ExternalLink size={12} className="text-muted-foreground" />}
        </a>
    );
}

function MetricBox({ label, valor, sub, cor }: { label: string, valor: number, sub: string, cor: string }) {
    return (
        <div>
            <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
                <span className={`text-2xl font-black ${cor}`}>{valor}</span>
            </div>
            <span className="text-[9px] text-slate-500 font-bold uppercase">{sub}</span>
        </div>
    );
}
