import { memo, useEffect, useState } from 'react';
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, CheckCircle2, Github, BookText, Figma, Link2, Copy, Check } from 'lucide-react';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { Modal } from '@/compartilhado/componentes/Modal';
import { usarIA } from '@/funcionalidades/ia/hooks/usarIA';
import { usarToast } from '@/compartilhado/hooks/usarToast';
import type { Projeto } from '@/funcionalidades/projetos/hooks/usarProjetos';
import type { Equipe } from '@/funcionalidades/admin/hooks/usarEquipes';

export const esquemaProjeto = z.object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 letras').max(100),
    descricao: z.string(),
    publico: z.boolean(),
    github_repo: z.string().optional(),
    documentacao_url: z.string().optional(),
    figma_url: z.string().optional(),
    setup_url: z.string().optional(),
    equipes: z.array(z.object({
        equipe_id: z.string().min(1, 'Selecione uma equipe'),
        acesso: z.enum(['LEITURA', 'EDICAO', 'GESTAO'])
    })).optional()
});

export type FormProjeto = z.infer<typeof esquemaProjeto>;

interface ModalFormularioProjetoProps {
    aberto: boolean;
    aoFechar: () => void;
    projetoEditando: string | null;
    projetoInicial: FormProjeto;
    equipes: Equipe[];
    onSubmit: SubmitHandler<FormProjeto>;
    carregando: boolean;
    processando: boolean;
}

export const ModalFormularioProjeto = memo(({ 
    aberto, 
    aoFechar, 
    projetoEditando, 
    projetoInicial, 
    equipes: listaEquipes, 
    onSubmit, 
    carregando, 
    processando 
}: ModalFormularioProjetoProps) => {
    const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormProjeto>({
        resolver: zodResolver(esquemaProjeto),
        defaultValues: projetoInicial
    });

    const { sugerirInfra, criarRepositorioGitHub, carregando: iaProcessando } = usarIA();
    const { exibirToast } = usarToast();
    const [infraSugerida, setInfraSugerida] = useState<string | null>(null);
    const [copiado, setCopiado] = useState(false);

    // Reset fields when the modal opens with new expected values
    useEffect(() => {
        if (aberto) {
            reset(projetoInicial);
            setInfraSugerida(null);
        }
    }, [aberto, projetoInicial, reset]);

    const { fields: camposEquipes, append: adicionarEquipe, remove: removerEquipe } = useFieldArray({
        control,
        name: 'equipes'
    });

    const publicoAtivo = watch('publico');

    const handleSugerirInfra = async () => {
        const nome = watch('nome');
        const desc = watch('descricao');
        if (!nome) return exibirToast('Dê um nome ao projeto primeiro!', 'erro');
        
        try {
            const res = await sugerirInfra(nome, desc);
            setInfraSugerida(res);
            exibirToast('Infraestrutura sugerida com sucesso!');
        } catch (e) {
            exibirToast('Não foi possível gerar a sugestão.', 'erro');
        }
    };

    const handleCriarRepo = async () => {
        const nome = watch('nome');
        const desc = watch('descricao');
        const publico = watch('publico');
        
        if (!nome) return exibirToast('Dê um nome ao projeto primeiro!', 'erro');

        try {
            const res = await criarRepositorioGitHub(nome, desc, publico);
            setValue('github_repo', res.repo);
            exibirToast(`Repositório "${res.repo}" criado com sucesso!`);
        } catch (e: any) {
            exibirToast(e.response?.data?.erro || 'Erro ao criar repositório.', 'erro');
        }
    };

    const handleCopiar = () => {
        if (!infraSugerida) return;
        navigator.clipboard.writeText(infraSugerida);
        setCopiado(true);
        exibirToast('Copiado para a área de transferência!');
        setTimeout(() => setCopiado(false), 2000);
    };

    return (
        <Modal
            aberto={aberto}
            aoFechar={aoFechar}
            titulo={projetoEditando ? 'Editar Projeto' : 'Novo Projeto'}
            largura="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4 animar-entrada">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Nome do Projeto</label>
                            <input
                                {...register('nome')}
                                className="w-full h-12 bg-background border border-border rounded-2xl px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="Ex: App de Delivery, ERP Escolar..."
                            />
                            {errors.nome && <p className="text-xs text-destructive mt-2">{errors.nome.message}</p>}
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Descrição</label>
                            <textarea
                                {...register('descricao')}
                                rows={4}
                                className="w-full bg-background border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                                placeholder="Sobre o que é este projeto?"
                            />
                        </div>

                        <div className="pt-2">
                             <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Repositório GitHub (Opcional)</label>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={handleSugerirInfra}
                                        disabled={iaProcessando}
                                        className="text-[9px] font-black uppercase tracking-wider text-primary hover:text-primary/70 flex items-center gap-1.5 transition-all group/ia"
                                    >
                                        {iaProcessando ? (
                                            <Carregando tamanho="sm" Centralizar={false} />
                                        ) : (
                                            <>
                                                <div className="p-1 rounded-md bg-primary/10 group-hover/ia:bg-primary/20 transition-colors">
                                                    <Plus size={10} strokeWidth={3} />
                                                </div>
                                                Deploy (IA)
                                            </>
                                        )}
                                    </button>

                                    {!projetoEditando && (
                                        <button
                                            type="button"
                                            onClick={handleCriarRepo}
                                            disabled={iaProcessando}
                                            className="text-[9px] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 transition-all group/git"
                                        >
                                            <div className="p-1 rounded-md bg-emerald-100 group-hover/git:bg-emerald-200 transition-colors">
                                                <Github size={10} strokeWidth={3} />
                                            </div>
                                            Criar Novo
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="relative">
                               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                   <Github size={14} className="text-muted-foreground" />
                               </div>
                               <input
                                   {...register('github_repo')}
                                   className="w-full h-12 bg-background border border-border rounded-2xl pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                   placeholder="Ex: meu-projeto-api"
                               />
                            </div>

                            {infraSugerida && (
                                <div className="mt-3 p-4 bg-slate-950 rounded-2xl border border-primary/20 shadow-inner relative group/code overflow-hidden animar-barra">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Sugestão GitHub Action (.yml)</h5>
                                        <button 
                                            type="button"
                                            onClick={handleCopiar}
                                            className="px-2 py-1 bg-primary/20 text-primary border border-primary/30 rounded-lg text-[9px] font-bold uppercase hover:bg-primary hover:text-white transition-all flex items-center gap-1"
                                        >
                                            {copiado ? <Check size={10} /> : <Copy size={10} />}
                                            {copiado ? 'Copiado' : 'Copiar'}
                                        </button>
                                    </div>
                                    <textarea
                                        readOnly
                                        value={infraSugerida}
                                        className="w-full h-32 bg-transparent text-[10px] font-mono text-slate-400 resize-none outline-none custom-scrollbar leading-relaxed"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Figma (URL)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Figma size={14} className="text-muted-foreground" />
                                    </div>
                                    <input
                                        {...register('figma_url')}
                                        className="w-full h-11 bg-background border border-border rounded-2xl pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="https://figma.com/..."
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Documentação (URL)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <BookText size={14} className="text-muted-foreground" />
                                    </div>
                                    <input
                                        {...register('documentacao_url')}
                                        className="w-full h-11 bg-background border border-border rounded-2xl pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="https://docs.google.com/..."
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Setup / Wiki (URL)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Link2 size={14} className="text-muted-foreground" />
                                    </div>
                                    <input
                                        {...register('setup_url')}
                                        className="w-full h-11 bg-background border border-border rounded-2xl pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="Guia de instalação ou Notion..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border/40">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground">Equipes Envolvidas</h4>
                                    <p className="text-[10px] text-muted-foreground">Quem opera este projeto</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => adicionarEquipe({ equipe_id: '', acesso: 'EDICAO' })}
                                    className="h-8 px-3 bg-secondary/30 hover:bg-secondary/50 text-secondary-foreground text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                                >
                                    <Plus size={14} /> Vincular
                                </button>
                            </div>
                            
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                {camposEquipes.length === 0 ? (
                                    <div className="text-center p-4 border border-dashed border-border rounded-2xl bg-muted/5">
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest opacity-40 italic">Livre para todas as equipes</p>
                                    </div>
                                ) : (
                                    camposEquipes.map((campo, index) => (
                                        <div key={campo.id} className="flex gap-2 items-center p-2 border border-border bg-muted/10 rounded-2xl">
                                            <select
                                                {...register(`equipes.${index}.equipe_id`)}
                                                className="flex-1 h-9 bg-background border border-border rounded-xl px-2 text-[11px] font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                            >
                                                <option value="">Equipe...</option>
                                                {listaEquipes.map(eq => (
                                                    <option key={eq.id} value={eq.id}>{eq.nome}</option>
                                                ))}
                                            </select>
                                            
                                            <select
                                                {...register(`equipes.${index}.acesso`)}
                                                className="w-24 h-9 bg-background border border-border rounded-xl px-2 text-[10px] font-black uppercase focus:ring-2 focus:ring-primary/20 outline-none"
                                            >
                                                <option value="LEITURA">Ver</option>
                                                <option value="EDICAO">Fazer</option>
                                                <option value="GESTAO">Gerenciar</option>
                                            </select>

                                            <button
                                                type="button"
                                                onClick={() => removerEquipe(index)}
                                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/10 rounded-3xl cursor-pointer hover:bg-primary/10 transition-all group"
                     onClick={() => setValue('publico', !publicoAtivo)}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${publicoAtivo ? 'bg-primary border-primary scale-110 shadow-lg shadow-primary/20' : 'bg-background border-border shadow-inner'}`}>
                        {publicoAtivo && <CheckCircle2 size={14} className="text-primary-foreground" />}
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-foreground">Exibir no Portfólio Público</h4>
                        <p className="text-[11px] text-muted-foreground font-medium">Torna este projeto visível para visitantes sem login (Showcase).</p>
                    </div>
                    <input
                        type="checkbox"
                        {...register('publico')}
                        className="hidden"
                    />
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={aoFechar}
                        className="flex-1 h-12 rounded-2xl border border-border text-[11px] font-black uppercase tracking-[0.2em] hover:bg-muted transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={carregando || processando}
                        className="flex-[2] h-12 bg-primary text-primary-foreground rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:opacity-90 shadow-lg shadow-primary/25 hover:scale-[1.01] transition-all flex items-center justify-center"
                    >
                        {carregando || processando ? (
                            <Carregando tamanho="sm" Centralizar={false} />
                        ) : (
                            <>
                                <CheckCircle2 size={16} className="mr-2" />
                                {projetoEditando ? 'Salvar Projeto' : 'Finalizar Criação'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
});
