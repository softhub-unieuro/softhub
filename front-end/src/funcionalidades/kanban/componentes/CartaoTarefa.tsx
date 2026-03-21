import { useState } from 'react';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { Emblema } from '@/compartilhado/componentes/Emblema';
import { CORES_PRIORIDADE, LABELS_PRIORIDADE } from '@/utilitarios/constantes';
import type { Tarefa } from '@/funcionalidades/kanban/hooks/usarKanban';
import { useDraggable } from '@dnd-kit/core';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { usarChecklist } from '@/funcionalidades/kanban/hooks/usarChecklist';
import { CheckCircle2, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';

import { usarMembrosOnline } from '@/compartilhado/hooks/usarMembrosOnline';

interface CartaoTarefaProps {
    tarefa: Tarefa;
    aoClicar?: (tarefa: Tarefa) => void;
    aoVerPerfil?: (id: string) => void;
}

/**
 * Representa uma única tarefa visualmente dentro da coluna.
 * Agora com comportamento de expansão: discreto por padrão, detalhado ao clicar.
 */
export function CartaoTarefa({ tarefa, aoClicar, aoVerPerfil }: CartaoTarefaProps) {
    const [expandido, setExpandido] = useState(false);
    const isUrgente = tarefa.prioridade === 'urgente';
    const { totalConcluidos, totalItens } = usarChecklist(tarefa.id);
    const podeMover = usarPermissaoAcesso('tarefas:mover');
    const podeVerDetalhes = usarPermissaoAcesso('tarefas:visualizar_detalhes');
    const { estaOnline } = usarMembrosOnline();

    // Configuração DnD Kit
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: tarefa.id,
        data: {
            type: 'Task',
            tarefa,
        },
        disabled: !podeMover
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const handleToggleExpansao = (e: React.MouseEvent) => {
        // Evita abrir expansão durante o drag (distância já tratada pelo dnd-kit)
        e.stopPropagation();
        setExpandido(!expandido);
    };

    const handleAbrirDetalhes = (e: React.MouseEvent) => {
        e.stopPropagation();
        aoClicar?.(tarefa);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={handleToggleExpansao}
            className={`
                bg-card rounded-2xl border border-border/60 flex flex-col select-none transition-all duration-300 shadow-sm relative overflow-hidden group/card
                ${podeMover ? 'cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-lg' : 'cursor-default opacity-80'}
                ${isDragging ? 'opacity-40 scale-95 ring-4 ring-primary/30 z-50 shadow-2xl' : ''}
                ${isUrgente ? 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10' : ''}
                ${expandido ? 'p-5 gap-4' : 'p-3.5 gap-2 hover:bg-muted/30'}
            `}
        >
            {isUrgente && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500/80 to-rose-400/80" />}

            {/* Cabeçalho Minimalista (Sempre Visível) */}
            <div className="flex justify-between items-start gap-3">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <h4 className={`
                        font-bold text-foreground leading-snug tracking-tight transition-colors group-hover/card:text-primary
                        ${expandido ? 'text-[14px]' : 'text-[13px] truncate'}
                    `}>
                        {tarefa.titulo}
                    </h4>
                    
                    {!expandido && (
                        <div className="flex items-center gap-2">
                            {tarefa.pontos !== null && (
                                <span className="text-[10px] font-black text-primary/60 bg-primary/5 px-1.5 rounded-lg border border-primary/10">
                                    {tarefa.pontos} pts
                                </span>
                            )}
                            <Emblema
                                texto={LABELS_PRIORIDADE[tarefa.prioridade]}
                                variante={CORES_PRIORIDADE[tarefa.prioridade]}
                                className="scale-75 origin-left opacity-70 group-hover/card:opacity-100 transition-opacity"
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    {!expandido && tarefa.responsaveis.length > 0 && (
                        <div className="flex items-center -space-x-4 opacity-40 group-hover/card:opacity-100 transition-opacity scale-75">
                            {tarefa.responsaveis.slice(0, 1).map((resp) => (
                                <Avatar 
                                    key={resp.id} 
                                    nome={resp.nome} 
                                    fotoPerfil={resp.foto || null} 
                                    tamanho="sm" 
                                    status={estaOnline(resp.id) ? 'online' : 'none'}
                                />
                            ))}
                        </div>
                    )}
                    <div className="text-muted-foreground/30 group-hover/card:text-primary/50 transition-colors">
                        {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                </div>
            </div>

            {/* Conteúdo Expansível (Transição Suave) */}
            <div className={`grid transition-all duration-300 ease-in-out ${expandido ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden flex flex-col gap-4">
                    {tarefa.descricao && (
                        <p className="text-[12px] text-muted-foreground/80 font-medium leading-relaxed">
                            {tarefa.descricao}
                        </p>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2.5">
                            {tarefa.pontos !== null && (
                                <span className="flex items-center justify-center min-w-[22px] h-6 px-1.5 bg-primary/10 rounded-2xl text-[11px] font-black text-primary border border-primary/20 shadow-sm">
                                    {tarefa.pontos}
                                </span>
                            )}

                            {totalItens > 0 && (
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-2xl border shadow-sm transition-colors ${totalConcluidos === totalItens ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-muted/50 text-muted-foreground/70 border-border/60'}`}>
                                    <CheckCircle2 className="w-[14px] h-[14px]" strokeWidth={2.5} />
                                    <span className="text-[11px] font-black tracking-tight">{totalConcluidos}/{totalItens}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center -space-x-2.5">
                            {tarefa.responsaveis.map((resp) => (
                                <div key={resp.id} className="relative group/avatar">
                                    <Avatar
                                        nome={resp.nome}
                                        fotoPerfil={resp.foto || null}
                                        tamanho="sm"
                                        status={estaOnline(resp.id) ? 'online' : 'none'}
                                        className="ring-2 ring-card shadow-sm group-hover/avatar:ring-primary/40 group-hover/avatar:scale-110 transition-all z-0 hover:z-10 cursor-pointer"
                                        onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            aoVerPerfil?.(resp.id);
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {podeVerDetalhes && (
                        <button
                            onClick={handleAbrirDetalhes}
                            className="w-full py-2 bg-primary/5 hover:bg-primary text-primary hover:text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border border-primary/10 hover:border-transparent"
                        >
                            <Maximize2 size={12} />
                            Ver Detalhes
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
