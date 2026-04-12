import { useEffect, useState } from 'react';
import { api } from '@/compartilhado/servicos/api';
import { formatarTempoAtras, formatarEventoHistorico } from '@/utilitarios/formatadores';
import { History, CheckSquare, Star, Trash2, Plus, ArrowLeftRight, Pencil } from 'lucide-react';

interface EventoHistorico {
    id: string;
    campo_alterado: string;
    valor_antigo: string | null;
    valor_novo: string;
    alterado_em: string;
    usuario_nome: string;
    usuario_foto: string | null;
}

interface SecaoHistoricoProps {
    tarefaId: string;
}

export function SecaoHistorico({ tarefaId }: SecaoHistoricoProps) {
    const [historico, setHistorico] = useState<EventoHistorico[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [pagina, setPagina] = useState(1);
    const [temMais, setTemMais] = useState(true);

    useEffect(() => {
        if (!tarefaId) return;
        setCarregando(true);
        api.get(`/tarefas/${tarefaId}/historico`, { params: { page: pagina, limit: 20 } })
            .then(res => {
                const novos = res.data;
                if (novos.length < 20) setTemMais(false);
                setHistorico(prev => pagina === 1 ? novos : [...prev, ...novos]);
            })
            .finally(() => setCarregando(false));
    }, [tarefaId, pagina]);

    const carregarMais = () => setPagina(prev => prev + 1);

    const getIcone = (evento: EventoHistorico) => {
        const c = evento.campo_alterado.toUpperCase();
        
        // Ações de Remoção
        if (c.includes('REMOVIDO') || c.includes('EXCLUIDO') || c.includes('REMOVER')) return <Trash2 className="w-3 h-3 text-rose-500/70" />;
        
        // Ações de Adição
        if (c.includes('ADICIONADO') || c.includes('CRIADO') || c.includes('COMENTADA')) return <Plus className="w-3 h-3 text-emerald-500/70" />;
        
        // Ações de Movimentação/Status
        if (c.includes('STATUS') || c === 'TAREFA_MOVIDA') return <ArrowLeftRight className="w-3 h-3 text-blue-500/70" />;
        
        // Ações de Edição/Alteração
        if (c.includes('CHECKLIST')) return <CheckSquare className="w-3 h-3 text-amber-500/70" />;
        if (c.includes('COMENTARIO_EDITADO')) return <Pencil className="w-3 h-3 text-amber-500/70" />;
        if (c.includes('FEEDBACK')) return <Star className="w-3 h-3 text-indigo-500/70" />;
        
        // Padrão para alteração de campos (Título, Descrição, etc)
        return <Pencil className="w-3 h-3 text-muted-foreground/70" />;
    };

    if (carregando) return <div className="text-xs text-muted-foreground py-4 animate-pulse">Carregando histórico...</div>;

    if (historico.length === 0) return null;

    return (
        <div className="mt-8 pt-8 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Histórico de Atividades
            </h3>

            <div className="space-y-6">
                {historico.map((evento) => (
                    <div key={evento.id} className="relative pl-8 pb-1">
                        {/* Linha vertical conectora */}
                        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-muted last:hidden"></div>

                        {/* Círculo do ícone */}
                        <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground z-10">
                            {getIcone(evento)}
                        </div>

                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{evento.usuario_nome}</span>
                                <span>•</span>
                                <span>{formatarTempoAtras(evento.alterado_em)}</span>
                            </div>
                            <p className="text-sm text-foreground mt-1">
                                {formatarEventoHistorico(evento.campo_alterado, evento.valor_antigo || '', evento.valor_novo)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
            
            {temMais && (
                <button 
                  onClick={carregarMais} 
                  disabled={carregando}
                  className="mt-6 w-full py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors border border-dashed border-border rounded-lg hover:border-primary/30"
                >
                  {carregando ? 'Carregando...' : 'Carregar mais atividades'}
                </button>
            )}
        </div>
    );
}
