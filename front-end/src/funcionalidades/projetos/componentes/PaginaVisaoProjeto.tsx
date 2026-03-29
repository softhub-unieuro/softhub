import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { usarProjetos } from '@/funcionalidades/projetos/hooks/usarProjetos';
import { FolderKanban, Globe, Lock, Github, FileText, BarChart3, Layers, ExternalLink } from 'lucide-react';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { formatarDataHora } from '@/utilitarios/formatadores';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { Botao } from '@/compartilhado/componentes/ui/Botao';

export default function PaginaVisaoProjeto() {
    const { projetoAtivoId } = usarAutenticacao();
    const { projetos, carregando } = usarProjetos();
    
    const podeVerDocumentos = usarPermissaoAcesso('projetos:documentos');

    const projeto = projetos.find(p => p.id === projetoAtivoId);

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

    return (
        <div className="flex flex-col gap-6 animar-entrada">
            <CabecalhoFuncionalidade
                titulo={projeto.nome}
                subtitulo="Visão geral e artefatos deste projeto."
                icone={FolderKanban}
            >
                <div className="flex gap-2">
                    {podeVerDocumentos && projeto.github_repo && (
                        <Botao 
                            variante="primario"
                            onClick={() => window.open(urGitHubDocs, '_blank')}
                            className="h-11 px-6 rounded-full flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all"
                            icone={<FileText size={18} strokeWidth={3} />}
                            rotulo="Documentos no GitHub"
                        />
                    )}
                </div>
            </CabecalhoFuncionalidade>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Card Principal - Detalhes */}
                <div className="md:col-span-2 bg-card border border-border rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        {projeto.publico ? (
                            <div className="p-2 bg-green-500/10 text-green-500 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                                <Globe size={14} /> Público
                            </div>
                        ) : (
                            <div className="p-2 bg-muted text-muted-foreground rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                                <Lock size={14} /> Privado
                            </div>
                        )}
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                            Criado em {formatarDataHora(projeto.criado_em)}
                        </span>
                    </div>

                    <h2 className="text-xl font-black text-foreground mb-4">Sobre o Projeto</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {projeto.descricao || 'Nenhuma descrição fornecida para este projeto.'}
                    </p>
                </div>

                {/* Coluna Direita - Informações e Links */}
                <div className="flex flex-col gap-6">
                    
                    {/* Github Repo */}
                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col items-start gap-4 hover:shadow-md transition-shadow">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                            <Github size={16} className="text-muted-foreground" />
                            Repositório GitHub
                        </h3>
                        {projeto.github_repo ? (
                            <div className="w-full">
                                <a 
                                    href={`https://github.com/${import.meta.env.VITE_GITHUB_STORAGE_OWNER}/${projeto.github_repo}`} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="px-4 py-3 bg-muted hover:bg-muted/80 w-full rounded-2xl flex items-center justify-between group transition-colors"
                                >
                                    <span className="text-primary font-bold text-sm truncate">{projeto.github_repo}</span>
                                    <ExternalLink size={16} className="text-muted-foreground group-hover:text-primary shrink-0" />
                                </a>
                                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                                    Acesse o repositório externo onde os código fontes e PDFs do projeto são versionados.
                                </p>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground/60 italic">Nenhum repositório GitHub vinculado a este projeto.</p>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2 mb-4">
                            <BarChart3 size={16} className="text-muted-foreground" />
                            Estatísticas
                        </h3>
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Total Tarefas</span>
                                <span className="text-lg font-black text-foreground">{projeto.total_tarefas || 0}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
