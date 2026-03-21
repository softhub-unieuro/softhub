import { useState } from 'react';
import { Star, MessageSquareQuote, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { api } from '@/compartilhado/servicos/api';
import { servicoIA } from '@/compartilhado/servicos/servico-ia';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { logger } from '@/utilitarios/gerenciador-logs';
import { Carregando } from '@/compartilhado/componentes/Carregando';

interface SecaoFeedbackMentoriaProps {
    tarefaId: string;
    feedbackAtual?: string | null;
    notaAtual?: number | null;
    status: string;
    aoFeedbackEnviado: () => void;
}

export function SecaoFeedbackMentoria({ 
    tarefaId, 
    feedbackAtual, 
    notaAtual, 
    status,
    aoFeedbackEnviado 
}: SecaoFeedbackMentoriaProps) {
    const podeAvaliar = usarPermissaoAcesso('tarefas:editar'); // Liderança
    const [feedback, setFeedback] = useState(feedbackAtual || '');
    const [nota, setNota] = useState(notaAtual || 0);
    const [enviando, setEnviando] = useState(false);
    const [refinando, setRefinando] = useState(false);

    const handleRefinarIA = async () => {
        if (!feedback.trim() || feedback.length < 10) return;
        setRefinando(true);
        try {
            const novoFeedback = await servicoIA.aprimorarDescricao('Feedback de Mentoria', feedback);
            if (novoFeedback) setFeedback(novoFeedback);
        } catch (e: any) {
            logger.aviso('IA', 'Módulo de linguagem ocupado. Tente novamente.');
        } finally {
            setRefinando(false);
        }
    };

    if (status !== 'concluida') return null;

    const handleSalvarFeedback = async () => {
        if (!nota) {
            logger.aviso('Mentoria', 'Selecione uma nota de aprendizado.');
            return;
        }
        if (!feedback.trim()) {
            logger.aviso('Mentoria', 'Escreva um feedback para o estudante.');
            return;
        }

        setEnviando(true);
        try {
            await api.patch(`/api/tarefas/${tarefaId}/feedback`, {
                feedback_lider: feedback.trim(),
                nota_aprendizado: nota
            });
            logger.sucesso('Mentoria', 'Feedback registrado com sucesso!');
            aoFeedbackEnviado();
        } catch (e) {
            logger.erro('Mentoria', 'Falha ao salvar feedback.');
        } finally {
            setEnviando(false);
        }
    };

    const notaSalva = !!notaAtual;

    return (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                    <MessageSquareQuote size={14} />
                    Feedback de Mentoria
                </h4>
                {notaSalva && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-500 rounded-lg text-[10px] font-bold uppercase">
                        <CheckCircle2 size={12} />
                        Avaliado
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {/* Notas de Estrelas */}
                <div>
                    <label className="block text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-2">
                        Percepção de Aprendizado
                    </label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <button
                                key={i}
                                type="button"
                                disabled={!podeAvaliar || notaSalva}
                                onClick={() => setNota(i)}
                                className={`p-2 rounded-xl transition-all ${
                                    i <= (nota || 0) 
                                        ? 'text-amber-500 bg-amber-500/10' 
                                        : 'text-muted-foreground/40 bg-muted/20 hover:bg-muted/40'
                                } ${!podeAvaliar || notaSalva ? 'cursor-default' : 'hover:scale-110'}`}
                            >
                                <Star size={20} fill={i <= (nota || 0) ? 'currentColor' : 'none'} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Campo de Texto */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
                            Comentários do Líder/Mentor
                        </label>
                        <button
                            type="button"
                            onClick={handleRefinarIA}
                            disabled={refinando || !feedback || feedback.length < 10}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary hover:text-primary/70 transition-all disabled:opacity-30 group"
                        >
                            {refinando ? (
                                <Carregando tamanho="sm" Centralizar={false} />
                            ) : (
                                <Sparkles size={12} className="text-amber-500 group-hover:scale-125 transition-transform" />
                            )}
                            Sugerir Melhoria
                        </button>
                    </div>
                    {podeAvaliar && !notaSalva ? (
                        <div className="space-y-3">
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Dê um feedback construtivo sobre a entrega..."
                                rows={3}
                                className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                            />
                            <button
                                onClick={handleSalvarFeedback}
                                disabled={enviando}
                                className="w-full h-10 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 flex items-center justify-center gap-2"
                            >
                                {enviando ? <Carregando tamanho="sm" Centralizar={false} /> : (
                                    <>
                                        <Send size={14} />
                                        Registrar Feedback
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-card/50 border border-border/50 rounded-xl p-4 italic text-sm text-foreground">
                            {feedback || 'Nenhum feedback registrado ainda.'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
