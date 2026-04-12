import { Modal } from '@/compartilhado/componentes/Modal';
import { Emblema } from '@/compartilhado/componentes/Emblema';
import { CORES_PRIORIDADE, LABELS_PRIORIDADE, LABELS_STATUS } from '@/utilitarios/constantes';
import type { Tarefa } from '@/funcionalidades/kanban/hooks/usarKanban';
import { SecaoChecklist } from './SecaoChecklist';
import { JornalTarefa } from './JornalTarefa';
import { SecaoFeedbackMentoria } from './SecaoFeedbackMentoria';
import { usarKanban } from '../hooks/usarKanban';

interface ModalDetalhesTarefaProps {
    tarefa: Tarefa | null;
    aberto: boolean;
    aoFechar: () => void;
}

export function ModalDetalhesTarefa({ tarefa, aberto, aoFechar }: ModalDetalhesTarefaProps) {
    const { recarregar } = usarKanban();
    if (!tarefa) return null;

    return (
        <Modal aberto={aberto} aoFechar={aoFechar} titulo="Visualizar Tarefa" largura="lg">
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Cabeçalho do Conteúdo */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-6">
                        <h2 className="text-2xl font-black text-foreground leading-tight tracking-tight">
                            {tarefa.titulo}
                        </h2>
                        <Emblema
                            texto={LABELS_PRIORIDADE[tarefa.prioridade]}
                            variante={CORES_PRIORIDADE[tarefa.prioridade]}
                            className={`shrink-0 shadow-sm mt-1 py-1 px-3 ${tarefa.prioridade === 'urgente' ? 'animate-pulse' : ''}`}
                        />
                    </div>
                </div>

                {/* Grid de Informações Rápidas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm transition-colors hover:bg-muted/50">
                        <div className="w-10 h-10 rounded-2xl bg-background border border-border/60 flex items-center justify-center text-muted-foreground shadow-sm">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Onde está</h4>
                            <p className="text-sm font-bold text-foreground capitalize">
                                {LABELS_STATUS[tarefa.status as keyof typeof LABELS_STATUS] || tarefa.status}
                            </p>
                        </div>
                    </div>

                    {tarefa.pontos !== null && (
                        <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm transition-colors hover:bg-muted/50">
                            <div className="w-10 h-10 rounded-2xl bg-background border border-border/60 flex items-center justify-center text-primary font-black text-xs shadow-sm">
                                {tarefa.pontos}
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Custo da Tarefa</h4>
                                <p className="text-sm font-bold text-foreground">Pontos de Esforço</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Descrição em Destaque */}
                <div className="relative">
                    <h4 className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <span className="w-1 h-3 bg-primary/40 rounded-full" />
                        Descrição Técnica
                    </h4>
                    {tarefa.descricao ? (
                        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm leading-relaxed">
                            <p className="text-[15px] text-card-foreground leading-relaxed whitespace-pre-wrap font-medium">{tarefa.descricao}</p>
                        </div>
                    ) : (
                        <div className="bg-muted/20 border border-dashed border-border/60 rounded-2xl p-8 text-center">
                            <p className="text-sm text-muted-foreground/60 font-medium italic">Esta tarefa não possui detalhes técnicos descritos.</p>
                        </div>
                    )}
                </div>

                {/* FASE 2: Feedback de Mentoria (Apenas em Concluídas) */}
                <SecaoFeedbackMentoria 
                    tarefaId={tarefa.id}
                    feedbackAtual={tarefa.feedback_lider}
                    notaAtual={tarefa.nota_aprendizado}
                    status={tarefa.status}
                    aoFeedbackEnviado={recarregar}
                />

                {/* Divisor Visual */}
                <div className="h-px bg-border/40 w-full" />

                {/* WF 31 - Checklist da Tarefa */}
                <SecaoChecklist tarefaId={tarefa.id} />

                {/* WF 25 & 29 - Jornal da Tarefa (Comentários + Histórico) */}
                <JornalTarefa tarefaId={tarefa.id} />
            </div>
        </Modal>
    );
}
