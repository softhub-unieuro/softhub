import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { api } from '@/compartilhado/servicos/api';
import { Sparkles } from 'lucide-react';
import { usarAvisos } from '@/funcionalidades/avisos/hooks/usarAvisos';

const esquemaAviso = z.object({
    titulo: z.string().min(5, 'O título deve ter pelo menos 5 caracteres.').max(100, 'Máximo de 100 caracteres.'),
    conteudo: z.string().optional(),
    prioridade: z.enum(['urgente', 'importante', 'info']),
    expira_em: z.string().optional(),
});

type FormularioAvisoDados = z.infer<typeof esquemaAviso>;

interface FormularioAvisoProps {
    aoSalvar: () => void;
}

/**
 * Formulário para criar um novo aviso no mural.
 * Baseado no React Hook Form e Zod.
 */
export function FormularioAviso({ aoSalvar }: FormularioAvisoProps) {
    const { criarAviso } = usarAvisos();
    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormularioAvisoDados>({
        resolver: zodResolver(esquemaAviso),
        defaultValues: { prioridade: 'info' }
    });

    const [temExpiracao, setTemExpiracao] = useState(false);
    const [refinando, setRefinando] = useState(false);
    const rascunho = watch('conteudo');
    const prioridadeAtual = watch('prioridade');

    const handleRefinarIA = async () => {
        if (!rascunho || rascunho.length < 10) return;
        setRefinando(true);
        try {
            const res = await api.post('/api/ia/refinar-aviso', { rascunho });
            if (res.data.titulo) setValue('titulo', res.data.titulo);
            if (res.data.conteudo) setValue('conteudo', res.data.conteudo);
        } catch (e) {
            console.error('Erro ao refinar com IA', e);
        } finally {
            setRefinando(false);
        }
    };

    const onSubmit = async (dados: FormularioAvisoDados) => {
        try {
            await criarAviso({
                ...dados,
                conteudo: dados.conteudo ?? '',
                expira_em: (temExpiracao && dados.expira_em) ? dados.expira_em : null,
            });
            aoSalvar();
        } catch (e) {
            console.error('Erro ao criar aviso', e);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            <div>
                <label htmlFor="titulo" className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 ml-1">
                    Título do Aviso
                </label>
                <input
                    id="titulo"
                    type="text"
                    placeholder="Ex: Prazo de entrega do Módulo 1..."
                    className="h-11 w-full bg-background border border-border rounded-2xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/30 font-medium"
                    {...register('titulo')}
                />
                {errors.titulo && (
                    <p role="alert" className="mt-1 text-xs font-medium text-destructive">{errors.titulo.message}</p>
                )}
            </div>

            <div>
                <div className="flex justify-between items-end mb-1">
                    <label htmlFor="conteudo" className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        Conteúdo Detalhado
                    </label>
                    <button
                        type="button"
                        onClick={handleRefinarIA}
                        disabled={refinando || !rascunho || rascunho.length < 10}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {refinando ? (
                            <Carregando tamanho="sm" Centralizar={false} className="border-primary" />
                        ) : (
                            <Sparkles size={12} />
                        )}
                        Refinar com IA
                    </button>
                </div>
                <textarea
                    id="conteudo"
                    rows={4}
                    placeholder="Descreva o que precisa ser comunicado..."
                    className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/30 font-medium resize-none shadow-sm"
                    {...register('conteudo')}
                />
                {errors.conteudo && (
                    <p role="alert" className="mt-1 text-xs font-medium text-destructive">{errors.conteudo.message}</p>
                )}
            </div>

            <div className="flex flex-col gap-5 mt-1">
                <div>
                    <label htmlFor="prioridade" className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 ml-1">
                        Nível de Prioridade
                    </label>
                    <div className="flex flex-wrap gap-2 w-full">
                        {[
                            { value: 'info', label: 'Informativo', icon: '💬' },
                            { value: 'importante', label: 'Importante', icon: '⚠️' },
                            { value: 'urgente', label: 'Urgente', icon: '🚨' }
                        ].map((opt) => {
                            const ativo = prioridadeAtual === opt.value;
                            let classesAtivas = '';
                            if (ativo) {
                                if (opt.value === 'urgente') classesAtivas = 'bg-rose-500 border-rose-500 text-white shadow-rose-500/20';
                                else if (opt.value === 'importante') classesAtivas = 'bg-amber-500 border-amber-500 text-white shadow-amber-500/20';
                                else classesAtivas = 'bg-primary border-primary text-white shadow-primary/20';
                            }

                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setValue('prioridade', opt.value as 'info' | 'importante' | 'urgente')}
                                    className={`flex-1 min-w-[100px] h-11 flex items-center justify-center gap-2 rounded-2xl border text-[10px] font-black uppercase tracking-tighter transition-all duration-300 shadow-sm ${
                                        ativo
                                            ? classesAtivas
                                            : 'bg-muted/30 border-border/50 text-muted-foreground/60 hover:bg-muted/50'
                                    }`}
                                >
                                    <span>{opt.icon}</span>
                                    <span>{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    {errors.prioridade && (
                        <p role="alert" className="mt-1 text-xs font-medium text-destructive">{errors.prioridade.message}</p>
                    )}
                </div>

                <div>
                    <label className="flex items-center gap-3 text-[14px] font-bold text-foreground mb-2 cursor-pointer select-none h-[20px]">
                        <div className="relative flex items-center shrink-0">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={temExpiracao}
                                onChange={(e) => {
                                    setTemExpiracao(e.target.checked);
                                    if (!e.target.checked) setValue('expira_em', undefined); // Limpa valor ao desmarcar
                                }}
                            />
                            <div className="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary transition-colors"></div>
                        </div>
                        <span className="text-muted-foreground peer-checked:text-foreground transition-colors pt-0.5">Deseja que expire?</span>
                    </label>

                    {/* Input só aparece com toggle ativo, animado */}
                    <div className={`transition-all duration-300 overflow-hidden ${temExpiracao ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <input
                            id="expira_em"
                            type="datetime-local"
                            className="w-full h-12 bg-background border border-input rounded-2xl px-4 py-2 shrink-0 text-foreground text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                            {...register('expira_em')}
                        />
                    </div>
                </div>
            </div>

            <div className="pt-6 mt-auto border-t border-border flex flex-col sm:flex-row justify-end gap-3">
                <button
                    type="button"
                    onClick={aoSalvar}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-border text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground transition-all transform active:scale-95 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-primary/20 min-w-32"
                >
                    {isSubmitting ? (
                        <>
                            <Carregando tamanho="sm" className="border-current" /> Publicando...
                        </>
                    ) : (
                        'Publicar Aviso'
                    )}
                </button>
            </div>

        </form>
    );
}
