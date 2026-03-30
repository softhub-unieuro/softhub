// Componente: DocumentosProjetoModal
import { memo } from 'react';
import { ExternalLink, FileText, Github, X } from 'lucide-react';
import { Modal } from '@/compartilhado/componentes/Modal';
import { Botao } from '@/compartilhado/componentes/ui/Botao';

interface DocumentosProjetoModalProps {
    projeto: {
        id: string;
        nome: string;
        github_repo?: string | null;
    };
    aberto: boolean;
    aoFechar: () => void;
}

/**
 * Modal para visualizar e acessar documentos do projeto.
 * Integração com o repositório GitHub para centralização de artefatos.
 */
export const DocumentosProjetoModal = memo(({ projeto, aberto, aoFechar }: DocumentosProjetoModalProps) => {
    if (!projeto) return null;

    const urlGithub = projeto.github_repo 
        ? `https://github.com/${import.meta.env.VITE_GITHUB_STORAGE_OWNER}/${projeto.github_repo}`
        : null;

    const urlDocs = urlGithub ? `${urlGithub}/tree/main/docs/softhub` : null;

    return (
        <Modal
            aberto={aberto}
            aoFechar={aoFechar}
            titulo={`Documentos: ${projeto.nome}`}
            largura="md"
        >
            <div className="space-y-6 py-2">
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-foreground mb-1">Repositório de Artefatos</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Todos os documentos, diagramas e especificações técnicas deste projeto são versionados e armazenados no GitHub para garantir a integridade e histórico.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Links Rápidos</p>
                    
                    {projeto.github_repo ? (
                        <div className="grid grid-cols-1 gap-3">
                            <a 
                                href={urlDocs || '#'} 
                                target="_blank" 
                                rel="noreferrer"
                                className="group flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:border-primary/30 hover:shadow-md transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                        <FileText size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-foreground">Pasta de Documentação</span>
                                        <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-tight">docs/softhub</span>
                                    </div>
                                </div>
                                <ExternalLink size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                            </a>

                            <a 
                                href={urlGithub || '#'} 
                                target="_blank" 
                                rel="noreferrer"
                                className="group flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:border-primary/30 hover:shadow-md transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                        <Github size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-foreground">Repositório Principal</span>
                                        <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-tight">GitHub Code & Docs</span>
                                    </div>
                                </div>
                                <ExternalLink size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                            </a>
                        </div>
                    ) : (
                        <div className="py-12 border-2 border-dashed border-border/40 rounded-3xl flex flex-col items-center justify-center gap-3 opacity-40">
                            <Github size={32} strokeWidth={1} />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sem vínculo com GitHub</p>
                        </div>
                    )}
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-border/40">
                    <Botao
                        variante="secundario"
                        onClick={aoFechar}
                        rotulo="Fechar"
                    />
                </div>
            </div>
        </Modal>
    );
});

DocumentosProjetoModal.displayName = 'DocumentosProjetoModal';
