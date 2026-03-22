import { useState, memo } from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { SeletorBuscavel } from './SeletorBuscavel';

interface FormGrupoEquipeProps {
    titulo: string;
    tipo: 'equipe' | 'grupo';
    equipes?: { id: string; nome: string }[];
    equipeAtivaId?: string;
    aoSalvar: (dados: any) => Promise<void>;
    aoFechar: () => void;
}

export const FormGrupoEquipe = memo(({ titulo, tipo, equipes, equipeAtivaId, aoSalvar, aoFechar }: FormGrupoEquipeProps) => {
    const [salvando, setSalvando] = useState(false);
    const [nome, setNome] = useState('');
    const [equipeId, setEquipeId] = useState(equipeAtivaId || '');
    const [grupos, setGrupos] = useState<string[]>([]);
    const [novoGrupo, setNovoGrupo] = useState('');

    const handleAdicionarGrupo = () => {
        if (!novoGrupo.trim()) return;
        setGrupos([...grupos, novoGrupo.trim()]);
        setNovoGrupo('');
    };

    const handleRemoverGrupo = (index: number) => {
        setGrupos(grupos.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSalvando(true);
        try {
            const dados = tipo === 'equipe'
                ? { nome, grupos }
                : { nome, equipe_id: equipeId || null };
            await aoSalvar(dados);
        } finally {
            setSalvando(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Nome {tipo === 'equipe' ? 'da Equipe' : 'do Grupo'}</label>
                    <input
                        required
                        autoFocus
                        value={nome}
                        onChange={e => setNome(e.target.value)}
                        placeholder={tipo === 'equipe' ? "Ex: Desenvolvimento, Comercial..." : "Ex: Squad Alpha, Operações..."}
                        className="w-full h-12 bg-muted/10 border border-border rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/30"
                    />
                </div>

                {tipo === 'grupo' && equipes && !equipeAtivaId && (
                    <SeletorBuscavel
                        label="Equipe Responsável"
                        valor={equipeId}
                        aoAlterar={setEquipeId}
                        opcoes={equipes}
                        placeholderVazio="Selecione a equipe de comando..."
                        icone={Users}
                    />
                )}

                {tipo === 'equipe' && (
                    <div className="space-y-4 pt-6 border-t border-border/40">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Estrutura Interna</span>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Crie os grupos de trabalho desta equipe</span>
                            </div>
                            <div className="h-7 px-3 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center">
                                <span className="text-[10px] font-black text-primary">{grupos.length} {grupos.length === 1 ? 'GRUPO' : 'GRUPOS'}</span>
                            </div>
                        </div>

                        <div className="relative group p-1.5 bg-muted/20 border border-border/40 rounded-2xl flex items-center gap-2 focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary transition-all">
                            <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-muted-foreground group-focus-within:text-primary transition-colors">
                                <Plus size={16} strokeWidth={3} />
                            </div>
                            <input
                                type="text"
                                value={novoGrupo}
                                onChange={e => setNovoGrupo(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdicionarGrupo())}
                                placeholder="Nome do novo grupo..."
                                className="flex-1 bg-transparent border-none text-[11px] font-bold outline-none placeholder:text-muted-foreground/40"
                            />
                            {novoGrupo.trim() && (
                                <button
                                    type="button"
                                    onClick={handleAdicionarGrupo}
                                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-[9px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-right-2"
                                >
                                    Adicionar
                                </button>
                            )}
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1 pb-2">
                            {grupos.length === 0 ? (
                                <div className="py-8 border-2 border-dashed border-border/40 rounded-3xl flex flex-col items-center justify-center gap-3 opacity-30">
                                    <Users size={32} strokeWidth={1} />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sem grupos definidos</p>
                                </div>
                            ) : (
                                grupos.map((g, idx) => (
                                    <div 
                                        key={idx} 
                                        className="group/item flex items-center justify-between p-3 bg-white/50 border border-border/80 rounded-2xl hover:bg-white hover:shadow-lg hover:shadow-slate-100 hover:border-primary/20 transition-all duration-300 animate-in slide-in-from-bottom-2"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center group-hover/item:bg-primary/5 group-hover/item:text-primary transition-colors">
                                                <span className="text-[10px] font-black">{idx + 1}</span>
                                            </div>
                                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{g}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoverGrupo(idx)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/30 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover/item:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                <button 
                    type="button" 
                    onClick={aoFechar} 
                    className="h-12 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/20 rounded-xl transition-all"
                >
                    Descartar
                </button>
                <button
                    type="submit"
                    disabled={salvando || !nome.trim()}
                    className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl text-[10px] font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-30 flex items-center justify-center uppercase tracking-widest"
                >
                    {salvando ? <Carregando /> : `Confirmar Cadastro`}
                </button>
            </div>
        </form>
    );
});
