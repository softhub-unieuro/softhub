import { useState } from 'react';
import { MoreHorizontal, Trash, Edit2 } from 'lucide-react';
import { formatarTempoAtras } from '@/utilitarios/formatadores';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import type { Comentario } from '@/funcionalidades/kanban/hooks/usarComentarios';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/compartilhado/componentes/ui/dropdown-menu';
import { ConfirmacaoExclusao } from '@/compartilhado/componentes/ConfirmacaoExclusao';
import { Botao } from '@/compartilhado/componentes/ui/Botao';

interface CartaoComentarioProps {
    comentario: Comentario;
    usuarioLogadoId: string;
    ehLider: boolean;
    aoExcluir: (id: string) => Promise<void>;
    aoEditar: (id: string, conteudo: string) => Promise<void>;
}

export function CartaoComentario({ comentario, usuarioLogadoId, ehLider, aoExcluir, aoEditar }: CartaoComentarioProps) {
    const [editando, setEditando] = useState(false);
    const [novoConteudo, setNovoConteudo] = useState(comentario.conteudo);
    const [salvando, setSalvando] = useState(false);
    const [modalExclusao, setModalExclusao] = useState(false);

    const podeEditar = comentario.autor_id === usuarioLogadoId;
    const podeExcluir = podeEditar || ehLider;

    const handleSalvarEdicao = async () => {
        if (!novoConteudo.trim() || novoConteudo === comentario.conteudo) {
            setEditando(false);
            return;
        }

        setSalvando(true);
        try {
            await aoEditar(comentario.id, novoConteudo);
            setEditando(false);
        } catch (error) {
            console.error('[Comentário] Falha ao editar:', error);
        } finally {
            setSalvando(false);
        }
    };

    const handleExcluir = async () => {
        setSalvando(true);
        try {
            await aoExcluir(comentario.id);
            setModalExclusao(false);
        } catch (error) {
            console.error('[Comentário] Falha ao excluir:', error);
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className="flex gap-4 group">
            <div className="shrink-0 mt-1">
                <Avatar nome={comentario.autor_nome} fotoPerfil={comentario.autor_foto} tamanho="md" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{comentario.autor_nome}</span>
                        <span className="text-xs text-muted-foreground">{formatarTempoAtras(comentario.criado_em)}</span>
                        {comentario.atualizado_em && (
                            <span className="text-[10px] text-muted-foreground font-medium">(editado)</span>
                        )}
                    </div>

                    {(podeEditar || podeExcluir) && !editando && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded-2xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground">
                                {podeEditar && (
                                    <DropdownMenuItem onClick={() => setEditando(true)} className="focus:bg-accent cursor-pointer gap-2">
                                        <Edit2 className="w-4 h-4 text-muted-foreground" /> Editar
                                    </DropdownMenuItem>
                                )}
                                {podeExcluir && (
                                    <DropdownMenuItem onClick={() => setModalExclusao(true)} className="focus:bg-destructive/20 text-destructive focus:text-destructive gap-2 cursor-pointer">
                                        <Trash className="w-4 h-4" /> Excluir
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {editando ? (
                    <div className="flex flex-col gap-2 mt-2">
                        <textarea
                            autoFocus
                            value={novoConteudo}
                            onChange={(e) => setNovoConteudo(e.target.value)}
                            className="w-full bg-background border border-input rounded-2xl p-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                        />
                        <div className="flex items-center gap-2 justify-end">
                            <Botao
                                onClick={() => { setEditando(false); setNovoConteudo(comentario.conteudo); }}
                                disabled={salvando}
                                variante="fantasma"
                                tamanho="pequeno"
                                rotulo="Cancelar"
                            />
                            <Botao
                                onClick={handleSalvarEdicao}
                                disabled={salvando || !novoConteudo.trim()}
                                carregando={salvando}
                                variante="primario"
                                tamanho="pequeno"
                                rotulo={salvando ? 'Salvando...' : 'Atualizar'}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/50 p-3 rounded-2xl border border-border inline-block w-full">
                        {comentario.conteudo}
                    </div>
                )}
            </div>

            <ConfirmacaoExclusao
                aberto={modalExclusao}
                aoFechar={() => setModalExclusao(false)}
                aoConfirmar={handleExcluir}
                titulo="Excluir Comentário"
                descricao="Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita."
                carregando={salvando}
            />
        </div>
    );
}
