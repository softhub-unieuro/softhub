import { memo } from 'react';
import { ChevronRight, User } from 'lucide-react';
import { Emblema } from '@/compartilhado/componentes/Emblema';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { LABELS_PRIORIDADE, LABELS_STATUS } from '@/utilitarios/constantes';
import { Botao } from '@/compartilhado/componentes/ui/Botao';
import type { Tarefa } from '@/funcionalidades/kanban/hooks/usarKanban';

interface LinhaTarefaBacklogProps {
    tarefa: Tarefa;
    aoClicar: (tarefa: Tarefa) => void;
}

/**
 * Representa uma linha individual na tabela de Backlog operacional.
 * Focada em legibilidade e densidade de informação para desktop.
 */
export const LinhaTarefaBacklog = memo(({ tarefa, aoClicar }: LinhaTarefaBacklogProps) => {
    return (
        <tr 
            onClick={() => aoClicar(tarefa)}
            className="group hover:bg-muted/30 transition-all duration-300 cursor-pointer"
        >
            <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-bold text-foreground/90 group-hover:text-primary transition-colors duration-300 tracking-tight">{tarefa.titulo}</span>
                    <span className="text-[11px] text-muted-foreground/60 line-clamp-1 max-w-sm font-medium leading-relaxed group-hover:text-muted-foreground transition-colors">
                        {tarefa.descricao || "Sem detalhes adicionais fornecidos via IA ou manualmente."}
                    </span>
                </div>
            </td>
            <td className="px-4 py-4 text-center">
                <Emblema
                    texto={LABELS_PRIORIDADE[tarefa.prioridade as keyof typeof LABELS_PRIORIDADE]}
                    variante={
                        tarefa.prioridade === 'urgente' ? 'vermelho' :
                            tarefa.prioridade === 'alta' ? 'amarelo' :
                                tarefa.prioridade === 'media' ? 'azul' : 'cinza'
                    }
                    className="shadow-sm group-hover:scale-105 transition-transform duration-300"
                />
            </td>
            <td className="px-4 py-4 text-center">
                <Emblema
                    texto={LABELS_STATUS[tarefa.status as keyof typeof LABELS_STATUS]}
                    variante={
                        tarefa.status === 'concluida' ? 'verde' :
                        tarefa.status === 'in_progress' ? 'azul' :
                        tarefa.status === 'em_revisao' ? 'roxo' :
                        tarefa.status === 'todo' ? 'alerta' : 'cinza'
                    }
                    className="opacity-90 group-hover:opacity-100 transition-opacity"
                />
            </td>
            <td className="px-4 py-4">
                <div className="flex items-center justify-center -space-x-2.5">
                    {tarefa.responsaveis && tarefa.responsaveis.length > 0 ? (
                        tarefa.responsaveis.map((resp: any) => (
                            <div key={resp.id} className="relative group/avatar">
                                <Avatar
                                    nome={resp.nome}
                                    fotoPerfil={resp.foto || null}
                                    tamanho="sm"
                                    className="ring-2 ring-background group-hover/avatar:ring-primary/50 group-hover/avatar:scale-110 transition-all z-0 hover:z-10"
                                />
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background border border-border/10 rounded text-[10px] font-bold opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                    {resp.nome}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="w-8 h-8 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground/40 group-hover:border-primary/40 group-hover:text-primary transition-all">
                            <User size={12} />
                        </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <Botao
                    variante="fantasma"
                    tamanho="icone"
                    className="p-2.5 bg-muted hover:bg-primary text-muted-foreground hover:text-primary-foreground rounded-xl transition-all duration-300 shadow-sm hover:shadow-primary/30 group-hover:translate-x-1"
                    icone={<ChevronRight size={16} />}
                    onClick={() => aoClicar(tarefa)}
                />
            </td>
        </tr>
    );
});

