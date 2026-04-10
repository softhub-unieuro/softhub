import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Circle, Zap, Search, CheckCircle2 } from 'lucide-react';
import type { Tarefa } from '@/funcionalidades/kanban/hooks/usarKanban';
import { CartaoTarefa } from './CartaoTarefa';

const ICONES_COLUNAS: Record<string, any> = {
    todo: Circle,
    in_progress: Zap,
    em_revisao: Search,
    concluida: CheckCircle2
};

interface ColunaDropZoneProps {
    id: string;
    titulo: string;
    tarefas: Tarefa[];
    aoApertarTarefa: (t: Tarefa) => void;
    aoVerPerfil?: (id: string) => void;
    delayClass?: string;
    className?: string;
}

export const ColunaDropZone = memo(({ id, titulo, tarefas, aoApertarTarefa, aoVerPerfil, delayClass, className }: ColunaDropZoneProps) => {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: { type: 'Column', coluna: id }
    });
    const Icone = ICONES_COLUNAS[id] || Circle;

    return (
        <div className={`flex flex-col shrink-0 w-full lg:flex-1 lg:max-w-[420px] card-glass card-glass-hover overflow-hidden h-full transition-all duration-500 group/column animar-entrada ${delayClass} ${className || ''}`}>
            <div className="p-5 border-b border-border/50 bg-muted/30 flex items-center justify-between shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/column:opacity-100 transition-opacity duration-700" />
                <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2.5 relative z-10">
                    <div className="w-8 h-8 rounded-2xl bg-background border border-border/60 flex items-center justify-center text-primary/60 shadow-sm">
                        <Icone size={14} />
                    </div>
                    {titulo}
                </h3>
                <span className="px-3 py-1 rounded-2xl bg-primary/10 text-[10px] font-black text-primary border border-primary/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]">
                    {tarefas.length}
                </span>
            </div>
            <div
                ref={setNodeRef}
                className={`
                    flex-1 p-4 overflow-y-auto overflow-x-hidden flex flex-col gap-4 scrollbar-none transition-all duration-300 relative
                    ${isOver 
                        ? 'bg-primary/5 ring-2 ring-primary/20 rounded-2xl shadow-[inset_0_0_20px_rgba(var(--primary-rgb),0.05)]' 
                        : 'border-transparent'}
                `}
            >
                {isOver && (
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none animate-pulse" />
                )}

                {tarefas.map(tarefa => (
                    <CartaoTarefa key={tarefa.id} tarefa={tarefa} aoClicar={aoApertarTarefa} aoVerPerfil={aoVerPerfil} />
                ))}
            </div>
        </div>
    );
});
