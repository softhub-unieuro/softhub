import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/compartilhado/componentes/Modal';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { api } from '@/compartilhado/servicos/api';
import { Wand2, Sparkles, AlertCircle, Zap } from 'lucide-react';
import { useState } from 'react';
import { LABELS_PRIORIDADE } from '@/utilitarios/constantes';
import { servicoIA } from '@/compartilhado/servicos/servico-ia';

const esquemaTarefa = z.object({
    titulo: z.string().min(3, 'Mínimo 3 caracteres').max(100),
    descricao: z.string().min(5, 'Mínimo 5 caracteres'),
    prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']),
});

type TarefaFormData = z.infer<typeof esquemaTarefa>;

interface ModalCriarTarefaProps {
    aberto: boolean;
    aoFechar: () => void;
    aoCriar: (dados: any) => Promise<void>;
}

export function ModalCriarTarefa({ aberto, aoFechar, aoCriar }: ModalCriarTarefaProps) {
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<TarefaFormData>({
        resolver: zodResolver(esquemaTarefa),
        defaultValues: { prioridade: 'media', descricao: '' }
    });

    const [processandoDescricaoIA, setProcessandoDescricaoIA] = useState(false);
    const [processandoPrioridadeIA, setProcessandoPrioridadeIA] = useState(false);
    const [erroIA, setErroIA] = useState<string | null>(null);
    const [carregandoCriacao, setCarregandoCriacao] = useState(false);
    const titulo = watch('titulo');
    const descricao = watch('descricao');

    const handleSugerirPrioridadeIA = async () => {
        if (!titulo || !descricao) return;
        setProcessandoPrioridadeIA(true);
        setErroIA(null);
        try {
            const res = await servicoIA.sugerirPrioridade(titulo + ' ' + descricao);
            if (res?.prioridade) setValue('prioridade', res.prioridade);
        } catch (e: any) {
            setErroIA('Não foi possível analisar a prioridade agora.');
        } finally {
            setProcessandoPrioridadeIA(false);
        }
    };

    const handleAprimorarDescricaoIA = async () => {
        if (!titulo || !descricao) return;
        setProcessandoDescricaoIA(true);
        setErroIA(null);
        try {
            const novaDescricao = await servicoIA.aprimorarDescricao(titulo, descricao);
            if (novaDescricao) setValue('descricao', novaDescricao);
        } catch (e: any) {
            setErroIA(e.response?.data?.detalhe || 'O Mentor Tech está ocupado. Tente novamente mais tarde.');
        } finally {
            setProcessandoDescricaoIA(false);
        }
    };

    const onSubmit = async (dados: TarefaFormData) => {
        setCarregandoCriacao(true);
        try {
            await aoCriar(dados);
            aoFechar();
        } catch (e) {
            console.error(e);
        } finally {
            setCarregandoCriacao(false);
        }
    };

    return (
        <Modal aberto={aberto} aoFechar={aoFechar} titulo="Nova Tarefa">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 ml-1">Título da Tarefa</label>
                    <input
                        {...register('titulo')}
                        placeholder="Ex: Refatorar middleware de autenticação..."
                        className="w-full bg-background border border-border rounded-2xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                    {errors.titulo && <p className="text-xs text-destructive mt-1">{errors.titulo.message}</p>}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descrição Detalhada</label>
                        <button
                            type="button"
                            onClick={handleAprimorarDescricaoIA}
                            disabled={processandoDescricaoIA || !titulo || !descricao || descricao.length < 10}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary hover:text-primary/70 transition-all disabled:opacity-30 group"
                        >
                            {processandoDescricaoIA ? (
                                <Carregando tamanho="sm" Centralizar={false} />
                            ) : (
                                <Sparkles size={12} className="text-amber-500 group-hover:scale-125 transition-transform" />
                            )}
                            Refinar com IA
                        </button>
                    </div>
                    {erroIA && (
                        <div className="mb-3 p-3 bg-destructive/5 border border-destructive/10 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                            <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
                            <p className="text-[10px] font-medium text-destructive leading-tight">{erroIA}</p>
                        </div>
                    )}
                    <textarea
                        {...register('descricao')}
                        rows={4}
                        placeholder="Descreva o que precisa ser feito..."
                        className="w-full bg-background border border-border rounded-2xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                    />
                    {errors.descricao && <p className="text-xs text-destructive mt-1">{errors.descricao.message}</p>}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Prioridade</label>
                        <button
                            type="button"
                            onClick={handleSugerirPrioridadeIA}
                            disabled={processandoPrioridadeIA || !titulo || !descricao}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary hover:text-primary/70 transition-all disabled:opacity-30 group"
                        >
                            {processandoPrioridadeIA ? (
                                <Carregando tamanho="sm" Centralizar={false} />
                            ) : (
                                <Zap size={12} className="text-amber-500 group-hover:scale-125 transition-transform" />
                            )}
                            Sugerir com IA
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(LABELS_PRIORIDADE).map(([key, label]) => (
                            <label
                                key={key}
                                className={`
                                    flex-1 min-w-[80px] cursor-pointer group
                                    ${watch('prioridade') === key ? 'opacity-100' : 'opacity-60 hover:opacity-100'}
                                `}
                            >
                                <input
                                    type="radio"
                                    value={key}
                                    {...register('prioridade')}
                                    className="hidden"
                                />
                                <div className={`
                                    py-2 text-center rounded-2xl border text-[10px] font-black uppercase tracking-tighter transition-all shadow-sm
                                    ${watch('prioridade') === key 
                                        ? key === 'urgente' ? 'bg-rose-500 border-rose-500 text-white shadow-rose-500/20' :
                                          key === 'alta' ? 'bg-amber-500 border-amber-500 text-white shadow-amber-500/20' :
                                          key === 'media' ? 'bg-primary border-primary text-white shadow-primary/20' :
                                          'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20'
                                        : 'bg-muted/30 border-border/50 md:hover:bg-muted/50 text-muted-foreground/60'}
                                `}>
                                    {label}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="pt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={aoFechar}
                        className="flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-border hover:bg-muted transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={carregandoCriacao}
                        className="flex-[2] h-12 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        {carregandoCriacao ? <Carregando tamanho="sm" Centralizar={false} /> : <Plus size={14} />}
                        Criar Tarefa
                    </button>
                </div>
            </form>
        </Modal>
    );
}

import { Plus } from 'lucide-react';
