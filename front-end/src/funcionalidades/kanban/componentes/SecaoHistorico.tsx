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
    const [exibirTudo, setExibirTudo] = useState(false);

    useEffect(() => {
        if (!tarefaId) return;
        setCarregando(true);
        api.get(`/tarefas/${tarefaId}/historico`, { params: { page: pagina, limit: 30 } })
            .then(res => {
                const novos = res.data;
                if (novos.length < 30) setTemMais(false);
                setHistorico(prev => pagina === 1 ? novos : [...prev, ...novos]);
            })
            .finally(() => setCarregando(false));
    }, [tarefaId, pagina]);

    const carregarMais = () => setPagina(prev => prev + 1);

    const ehImportante = (campo: string) => {
        const c = campo.toUpperCase();
        // Ações que realmente mostram PROGRESSO ou DECISÃO
        const fundamentais = [
            'STATUS', 
            'TAREFA_MOVIDA', 
            'PRIORIDADE', 
            'TAREFA_FEEDBACK_REGISTRADO'
        ];
        
        // Ignoramos criação e comentários (pois o comentário já aparece na aba de comentários e a criação é óbvia)
        if (c === 'TAREFA_CRIADA' || c === 'TAREFA_COMENTADA' || c === 'TAREFA_COMENT') return false;

        // Se estiver na lista fundamental ou for uma alteração direta de campo (ex: titulo, responsavel)
        return fundamentais.includes(c) || (!campo.startsWith('TAREFA_') && campo.length < 25);
    };

    const historicoExibido = exibirTudo ? historico : historico.filter(e => ehImportante(e.campo_alterado));
    const totalOmitidos = historico.length - (historico.filter(e => ehImportante(e.campo_alterado)).length);

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

    if (carregando && pagina === 1) return <div className="text-xs text-muted-foreground py-4 animate-pulse">Carregando histórico...</div>;

    if (historico.length === 0) return null;

    return (
        <div className="mt-8 pt-8 border-t border-border">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <History className="w-4 h-4 text-muted-foreground" />
                    Atividades da Tarefa
                </h3>
                
                {totalOmitidos > 0 && (
                    <button 
                        onClick={() => setExibirTudo(!exibirTudo)}
                        className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60 hover:text-primary transition-all bg-muted/50 px-2 py-1 rounded-md"
                    >
                        {exibirTudo ? 'Ver apenas principais' : `+${totalOmitidos} secundárias`}
                    </button>
                )}
            </div>

            <div className="space-y-6">
                {historicoExibido.map((evento) => (
                    <div key={evento.id} className="relative pl-8 pb-1 animate-in fade-in slide-in-from-left-2 duration-300">
                        {/* Linha vertical conectora */}
                        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-muted last:hidden"></div>

                        {/* Círculo do ícone */}
                        <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground z-10 shadow-sm">
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
                  className="mt-8 w-full py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all border border-dashed border-border rounded-xl hover:bg-muted/30"
                >
                  {carregando ? 'Buscando mais...' : 'Ver atividades anteriores'}
                </button>
            )}
        </div>
    );
}
