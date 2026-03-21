import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/compartilhado/componentes/Modal';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { api } from '@/compartilhado/servicos/api';
import { Wand2, Sparkles, AlertCircle, Zap, User, Users, X, Check, Search } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { LABELS_PRIORIDADE } from '@/utilitarios/constantes';
import { servicoIA } from '@/compartilhado/servicos/servico-ia';
import { Avatar } from '@/compartilhado/componentes/Avatar';

const esquemaTarefa = z.object({
    titulo: z.string().min(3, 'Mínimo 3 caracteres').max(100),
    descricao: z.string().min(5, 'Mínimo 5 caracteres'),
    prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']),
    responsaveis: z.array(z.string()),
    equipe_id: z.string().nullable(),
});

type TarefaFormData = z.infer<typeof esquemaTarefa>;

interface ModalCriarTarefaProps {
    aberto: boolean;
    aoFechar: () => void;
    aoCriar: (dados: any) => Promise<void>;
}

export function ModalCriarTarefa({ aberto, aoFechar, aoCriar }: ModalCriarTarefaProps) {
    const { register, handleSubmit, setValue, watch, control, formState: { errors }, reset } = useForm<TarefaFormData>({
        resolver: zodResolver(esquemaTarefa),
        defaultValues: { 
            prioridade: 'media', 
            descricao: '', 
            responsaveis: [], 
            equipe_id: null 
        }
    });

    const [processandoDescricaoIA, setProcessandoDescricaoIA] = useState(false);
    const [processandoPrioridadeIA, setProcessandoPrioridadeIA] = useState(false);
    const [erroIA, setErroIA] = useState<string | null>(null);
    const [carregandoCriacao, setCarregandoCriacao] = useState(false);
    
    // Estados para listagens
    const [membros, setMembros] = useState<any[]>([]);
    const [equipes, setEquipes] = useState<any[]>([]);
    const [carregandoOpcoes, setCarregandoOpcoes] = useState(false);
    const [buscaMembro, setBuscaMembro] = useState('');

    const titulo = watch('titulo');
    const descricao = watch('descricao');
    const responsaveisSelecionados = watch('responsaveis');
    const equipeSelecionadaId = watch('equipe_id');

    useEffect(() => {
        if (aberto) {
            reset();
            carregarOpcoes();
        }
    }, [aberto, reset]);

    const carregarOpcoes = async () => {
        setCarregandoOpcoes(true);
        try {
            const [resMembros, resEquipes] = await Promise.all([
                api.get('/api/usuarios/opcoes'),
                api.get('/api/equipes/equipes').catch(() => ({ data: { equipes: [] } }))
            ]);
            setMembros(resMembros.data.membros || []);
            setEquipes(resEquipes.data.equipes || []);
        } catch (e) {
            console.error('Erro ao carregar opções para o modal', e);
        } finally {
            setCarregandoOpcoes(false);
        }
    };

    const membrosFiltrados = useMemo(() => {
        if (!buscaMembro) return membros.slice(0, 10);
        return membros.filter(m => 
            m.nome.toLowerCase().includes(buscaMembro.toLowerCase()) || 
            m.role?.toLowerCase().includes(buscaMembro.toLowerCase())
        ).slice(0, 10);
    }, [membros, buscaMembro]);

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

    const toggleMembro = (id: string) => {
        const novos = responsaveisSelecionados.includes(id)
            ? responsaveisSelecionados.filter(x => x !== id)
            : [...responsaveisSelecionados, id];
        setValue('responsaveis', novos);
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
        <Modal aberto={aberto} aoFechar={aoFechar} titulo="Nova Tarefa" largura="lg">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Coluna Esquerda: Conteúdo */}
                    <div className="space-y-5">
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
                                rows={6}
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
                                            flex-1 min-w-[70px] cursor-pointer group
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
                                            py-2 text-center rounded-2xl border text-[9px] font-black uppercase tracking-tighter transition-all shadow-sm
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
                    </div>

                    {/* Coluna Direita: Destinação */}
                    <div className="space-y-6 lg:border-l lg:border-border/50 lg:pl-8">
                        {/* Atribuição de Equipe/Grupo */}
                        <div>
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 ml-1">
                                <Users size={12} className="text-primary" />
                                Destinar para Grupo/Equipe
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setValue('equipe_id', null)}
                                    className={`
                                        px-4 py-2.5 rounded-xl border text-[11px] font-bold text-left transition-all flex items-center justify-between
                                        ${!equipeSelecionadaId ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-background border-border text-muted-foreground hover:border-border-hover'}
                                    `}
                                >
                                    <span>Geral (Sem Grupo)</span>
                                    {!equipeSelecionadaId && <Check size={14} />}
                                </button>
                                {equipes.map(eq => (
                                    <button
                                        key={eq.id}
                                        type="button"
                                        onClick={() => setValue('equipe_id', eq.id)}
                                        className={`
                                            px-4 py-2.5 rounded-xl border text-[11px] font-bold text-left transition-all flex items-center justify-between
                                            ${equipeSelecionadaId === eq.id ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-background border-border text-muted-foreground hover:border-border-hover'}
                                        `}
                                    >
                                        <div className="flex flex-col">
                                            <span>{eq.nome}</span>
                                            {eq.grupos_nomes && <span className="text-[9px] opacity-50 font-medium">{eq.grupos_nomes}</span>}
                                        </div>
                                        {equipeSelecionadaId === eq.id && <Check size={14} />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Atribuição de Membros */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                <User size={12} className="text-primary" />
                                Responsáveis (Membros)
                            </label>

                            {/* Selecionados */}
                            {responsaveisSelecionados.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2 p-3 bg-muted/20 rounded-2xl border border-dashed border-border/50">
                                    {responsaveisSelecionados.map(ruid => {
                                        const m = membros.find(x => x.id === ruid);
                                        return (
                                            <div key={ruid} className="flex items-center gap-1.5 bg-background border border-border pl-1 pr-2 py-1 rounded-full animate-in zoom-in-95 duration-200">
                                                <Avatar nome={m?.nome || ''} fotoPerfil={m?.foto_perfil} tamanho="sm" />
                                                <span className="text-[10px] font-bold">{m?.nome?.split(' ')[0]}</span>
                                                <button onClick={() => toggleMembro(ruid)} className="p-0.5 hover:text-destructive transition-colors">
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Busca */}
                            <div className="relative group">
                                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Buscar membro..."
                                    value={buscaMembro}
                                    onChange={(e) => setBuscaMembro(e.target.value)}
                                    className="w-full bg-background border border-border rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                />
                            </div>

                            {/* Lista de Membros */}
                            <div className="max-h-[200px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                                {carregandoOpcoes ? (
                                    <div className="py-8"><Carregando Centralizar={true} tamanho="sm" /></div>
                                ) : (
                                    membrosFiltrados.map(m => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => toggleMembro(m.id)}
                                            className={`
                                                w-full flex items-center justify-between p-2 rounded-xl border transition-all
                                                ${responsaveisSelecionados.includes(m.id) ? 'bg-primary/5 border-primary/30' : 'bg-background border-transparent hover:bg-muted/30'}
                                            `}
                                        >
                                            <div className="flex items-center gap-2.5 text-left">
                                                <Avatar nome={m.nome} fotoPerfil={m.foto_perfil} tamanho="sm" />
                                                <div>
                                                    <p className="text-[11px] font-bold leading-none mb-1">{m.nome}</p>
                                                    <p className="text-[9px] text-muted-foreground opacity-60">{m.role}</p>
                                                </div>
                                            </div>
                                            {responsaveisSelecionados.includes(m.id) && <Check size={14} className="text-primary" />}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex gap-3 border-t border-border/50">
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
