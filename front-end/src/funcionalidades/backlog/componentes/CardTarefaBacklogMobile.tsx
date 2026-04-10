import { memo } from 'react';
import { ChevronRight, User, Clock } from 'lucide-react';
import { Emblema } from '@/compartilhado/componentes/Emblema';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { LABELS_PRIORIDADE, LABELS_STATUS } from '@/utilitarios/constantes';
import type { Tarefa } from '@/funcionalidades/kanban/hooks/usarKanban';

interface CardTarefaBacklogMobileProps {
    tarefa: Tarefa;
    aoClicar: (tarefa: Tarefa) => void;
}

/**
 * Versão otimizada para toque da tarefa no Backlog.
 * Exibida apenas em dispositivos móveis.
 */
export const CardTarefaBacklogMobile = memo(({ tarefa, aoClicar }: CardTarefaBacklogMobileProps) => {
    const prioridadeCor = {
        urgente: 'vermelho' as const,
        alta: 'amarelo' as const,
        media: 'azul' as const,
        baixa: 'cinza' as const
    }[tarefa.prioridade] || 'cinza';

    const statusCor = {
        concluida: 'verde' as const,
        in_progress: 'azul' as const,
        em_revisao: 'roxo' as const,
        todo: 'amarelo' as const,
        backlog: 'cinza' as const
    }[tarefa.status] || 'cinza';

    return (
        <div 
            onClick={() => aoClicar(tarefa)}
            className="group relative bg-card/40 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 flex flex-col gap-5 active:scale-[0.98] transition-all duration-300 cursor-pointer"
        >
            {/* Header: Título e Menu */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <h3 className="text-base font-black text-foreground tracking-tight leading-tight group-hover:text-primary transition-colors truncate">
                        {tarefa.titulo}
                    </h3>
                    <p className="text-[11px] text-muted-foreground/50 line-clamp-2 leading-relaxed">
                        {tarefa.descricao || "Sem descrição técnica definida."}
                    </p>
                </div>
                <div className="w-10 h-10 shrink-0 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <ChevronRight size={18} strokeWidth={3} />
                </div>
            </div>

            {/* Badges e Infos */}
            <div className="flex items-center flex-wrap gap-2">
                <Emblema 
                    texto={LABELS_PRIORIDADE[tarefa.prioridade]} 
                    variante={prioridadeCor}
                />
                <Emblema 
                    texto={LABELS_STATUS[tarefa.status]} 
                    variante={statusCor}
                    className="!bg-white/5 !text-white/40 !border-white/5"
                />
                
                <div className="ml-auto flex items-center -space-x-2">
                    {tarefa.responsaveis && tarefa.responsaveis.length > 0 ? (
                        tarefa.responsaveis.map((resp: any) => (
                            <Avatar
                                key={resp.id}
                                nome={resp.nome}
                                fotoPerfil={resp.foto || null}
                                tamanho="sm"
                                className="ring-2 ring-slate-950"
                            />
                        ))
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5 text-muted-foreground/30">
                            <User size={12} />
                        </div>
                    )}
                </div>
            </div>

            {/* Footer: Timeline ou ID */}
            <div className="pt-4 border-t border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-1.5 opacity-40">
                    <Clock size={10} />
                    <span className="text-[9px] font-bold uppercase tracking-widest italic">
                        {tarefa.id ? `Tarefa ativa` : 'Rascunho'}
                    </span>
                </div>
                <span className="text-[8px] font-black text-primary/40 uppercase tracking-tighter">
                    #{tarefa.id.split('-')[0]}
                </span>
            </div>
        </div>
    );
});

