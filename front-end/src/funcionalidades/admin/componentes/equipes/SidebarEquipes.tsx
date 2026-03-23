import { Users, Trash2 } from 'lucide-react';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { memo } from 'react';

interface SidebarEquipesProps {
    equipes: any[];
    idEquipeAtiva: string | null;
    aoSelecionar: (id: string) => void;
    podeEditar: boolean;
    aoExcluir: (e: any) => void;
    podeCriar: boolean;
    aoCriar: () => void;
}

export const SidebarEquipes = memo(({
    equipes,
    idEquipeAtiva,
    aoSelecionar,
    podeEditar,
    aoExcluir,
    podeCriar,
    aoCriar
}: SidebarEquipesProps) => {
    return (
        <aside className="w-full lg:w-80 flex flex-col shrink-0 h-full">
            <div className="bg-card border border-border rounded-3xl shadow-sm flex flex-col h-full overflow-hidden">
                <div className="p-5 border-b border-border bg-muted/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary shadow-sm shadow-primary/5">
                            <Users size={14} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground leading-none">Equipes Ativas</h3>
                    </div>
                    <span className="text-[9px] font-black text-muted-foreground/60">{equipes.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                    {equipes.map((e, index) => (
                        <div
                            key={e.id}
                            onClick={() => aoSelecionar(e.id)}
                            className={`group/card relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer animar-entrada atraso-${(index % 5) + 1} ${
                                idEquipeAtiva === e.id
                                    ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                    : 'bg-muted/10 border-transparent hover:bg-muted/30 hover:border-border/50 text-muted-foreground'
                            }`}
                        >
                            <div className="flex flex-col min-w-0 pr-6 w-full">
                                <span className={`text-[11px] font-black uppercase tracking-wider truncate mb-1 ${idEquipeAtiva === e.id ? 'text-primary' : 'text-foreground/80'}`}>
                                    {e.nome}
                                </span>
                                <div className="flex items-center gap-1.5 opacity-60">
                                    <Users size={10} />
                                    <span className="text-[9px] font-bold uppercase tracking-tight">{e.total_membros || 0} Membros</span>
                                </div>
                            </div>

                            {podeEditar && (
                                <button
                                    onClick={(ev) => {
                                        ev.stopPropagation();
                                        aoExcluir(e);
                                    }}
                                    className={`p-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-95 ${idEquipeAtiva === e.id ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100'}`}
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    ))}

                    {equipes.length === 0 && (
                        <div className="py-12 flex flex-col items-center justify-center">
                            <EstadoVazio 
                                titulo="Sem Equipes"
                                descricao="Nenhuma equipe foi criada ainda."
                                compacto={true}
                                acao={podeCriar ? {
                                    rotulo: "Criar Equipe",
                                    aoClicar: aoCriar
                                } : undefined}
                            />
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
});
