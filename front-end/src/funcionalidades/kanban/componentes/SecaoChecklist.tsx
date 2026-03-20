import { useState } from 'react';
import { usarChecklist } from '@/funcionalidades/kanban/hooks/usarChecklist';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import { Tooltip } from '@/compartilhado/componentes/Tooltip';
import { Carregando } from '@/compartilhado/componentes/Carregando';

interface SecaoChecklistProps {
    tarefaId: string;
}

export function SecaoChecklist({ tarefaId }: SecaoChecklistProps) {
    const { itens, carregando, adicionarItem, alternarItem, removerItem, totalConcluidos, totalItens, progresso } = usarChecklist(tarefaId);
    const podeGerenciar = usarPermissaoAcesso('tarefas:checklist');
    const [novoTexto, setNovoTexto] = useState('');
    const [enviando, setEnviando] = useState(false);

    const aoAdicionar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!novoTexto.trim() || enviando) return;

        setEnviando(true);
        try {
            await adicionarItem(novoTexto);
            setNovoTexto('');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="mt-8 space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                        Checklist
                    </h3>
                    <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-2xl border border-primary/20 shadow-sm">
                        {totalConcluidos} de {totalItens}
                    </span>
                </div>

                {totalItens > 0 && (
                    <div className="flex items-center gap-3">
                         <span className="text-[11px] font-black text-emerald-500/80 tracking-tighter">{Math.round(progresso)}%</span>
                        <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden border border-border/40 shadow-inner">
                            <div
                                className="bg-emerald-500 h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                style={{ width: `${progresso}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-1">
                {itens.map((item: any) => (
                    <div key={item.id} className="group flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/40 transition-all border border-transparent hover:border-border/40">
                        <button
                            onClick={() => podeGerenciar && alternarItem(item.id, !item.concluido)}
                            disabled={!podeGerenciar}
                            className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-2xl border-2 transition-all ${!podeGerenciar ? 'opacity-40 cursor-not-allowed border-muted-foreground/20' : item.concluido ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'border-muted-foreground/30 text-transparent hover:border-primary/50'}`}
                        >
                            <CheckSquare className={`w-3.5 h-3.5 ${item.concluido ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} strokeWidth={3} />
                        </button>

                        <span className={`text-[13px] font-medium flex-1 transition-all ${item.concluido ? 'text-muted-foreground/60 line-through decoration-muted-foreground/30' : 'text-foreground hover:text-primary transition-colors cursor-default'}`}>
                            {item.texto}
                        </span>

                        {podeGerenciar && (
                            <Tooltip texto="Remover item">
                                <button
                                    onClick={() => removerItem(item.id)}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-2xl transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </Tooltip>
                        )}
                    </div>
                ))}
            </div>

            {podeGerenciar && (
                <form onSubmit={aoAdicionar} className="relative mt-2">
                    <input
                        type="text"
                        placeholder="Adicionar um novo item ao checklist..."
                        value={novoTexto}
                        onChange={(e) => setNovoTexto(e.target.value)}
                        className="w-full bg-muted/30 border border-border/60 rounded-2xl pl-4 pr-12 py-3 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:bg-card focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                    />
                    <button
                        type="submit"
                        disabled={!novoTexto.trim() || enviando}
                        className="absolute right-2 top-2 p-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-0 shadow-lg"
                    >
                        {enviando ? <Carregando tamanho="sm" /> : <Plus className="w-4.5 h-4.5" />}
                    </button>
                </form>
            )}

            {!carregando && totalItens === 0 && !podeGerenciar && (
                <p className="text-xs text-muted-foreground italic py-2">Nenhum item no checklist.</p>
            )}
        </div>
    );
}
