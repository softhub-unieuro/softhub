import { useState, useContext, type FormEvent } from 'react';
import { usarJornalTarefa } from '@/funcionalidades/kanban/hooks/usarJornalTarefa';
import { usarComentarios } from '@/funcionalidades/kanban/hooks/usarComentarios';
import { formatarTempoAtras, formatarEventoHistorico } from '@/utilitarios/formatadores';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { History, Send, Layout, UserPlus, Tag, CheckCircle2 } from 'lucide-react';
import { Tooltip } from '@/compartilhado/componentes/Tooltip';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { Carregando } from '@/compartilhado/componentes/Carregando';

import { ContextoAutenticacao } from '@/contexto/ContextoAutenticacao';
import { Alerta } from '@/compartilhado/componentes/Alerta';

interface JornalTarefaProps {
    tarefaId: string;
}

export function JornalTarefa({ tarefaId }: JornalTarefaProps) {
    const { entradas, carregando, erro, recarregar } = usarJornalTarefa(tarefaId);
    const { enviarComentario } = usarComentarios(tarefaId);
    const contextoAuth = useContext(ContextoAutenticacao);
    const podeComentar = usarPermissaoAcesso('tarefas:comentar');
    const podeVerHistorico = usarPermissaoAcesso('tarefas:visualizar_historico');
    const [novoComentario, setNovoComentario] = useState('');
    const [enviando, setEnviando] = useState(false);

    const handleEnviar = async (e: FormEvent) => {
        e.preventDefault();
        if (!novoComentario.trim()) return;

        setEnviando(true);
        try {
            await enviarComentario(novoComentario);
            setNovoComentario('');
            recarregar(); // Recarrega o jornal para mostrar o novo comentário
        } catch (error) {
            console.error('[Jornal] Falha ao registrar atividade:', error);
        } finally {
            setEnviando(false);
        }
    };

    if (erro) return <div className="py-4"><Alerta tipo="erro" mensagem={erro} /></div>;

    const entradasFiltradas = entradas.filter(e => {
        // Se for comentário real, sempre exibe
        if (e.tipo === 'comentario') return true;
        
        // Se for log de sistema, verifica se tem permissão E se não é lixo técnico
        if (podeVerHistorico) {
            const c = e.conteudo?.campo?.toUpperCase();
            const redundantes = ['TAREFA_COMENTADA', 'TAREFA_CRIADA', 'TAREFA_COMENT'];
            return !redundantes.includes(c);
        }
        
        return false;
    });

    return (
        <div className="flex flex-col gap-6 mt-8 animar-entrada">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Linha do Tempo
            </h3>

            {/* Formulário de Comentário Estilo Social */}
            {podeComentar && (
                <div className="flex gap-3">
                    <Avatar 
                        nome={contextoAuth?.usuario?.nome || ''} 
                        fotoPerfil={contextoAuth?.usuario?.foto_perfil || null} 
                        tamanho="md"
                    />
                    <form onSubmit={handleEnviar} className="flex-1 relative">
                        <textarea
                            value={novoComentario}
                            onChange={(e) => setNovoComentario(e.target.value)}
                            placeholder="Escreva um comentário ou atualização..."
                            className="w-full bg-muted/40 border border-border/60 rounded-2xl p-4 pr-12 text-sm text-foreground resize-none focus:outline-none focus:bg-card focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all min-h-[90px] shadow-sm"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleEnviar(e);
                                }
                            }}
                        />
                        <Tooltip texto="Enviar comentário">
                            <button
                                type="submit"
                                disabled={!novoComentario.trim() || enviando}
                                className="absolute right-3 bottom-3 p-2.5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-30 flex items-center justify-center shadow-lg active:scale-95"
                            >
                                {enviando ? <Carregando tamanho="sm" /> : <Send className="w-4 h-4" />}
                            </button>
                        </Tooltip>
                    </form>
                </div>
            )}

            {/* Feed Chronológico */}
            <div className="relative space-y-8 pl-2">
                {/* Linha vertical centralizada nos avatares */}
                <div className="absolute left-[26px] top-6 bottom-4 w-px bg-border/60" />

                {carregando && entradasFiltradas.length === 0 ? (
                    <div className="flex justify-center py-10"><Carregando /></div>
                ) : entradasFiltradas.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm italic">Nenhuma atividade registrada ainda.</div>
                ) : (
                    entradasFiltradas.map((entrada, index) => (
                        <div key={entrada.id} className={`relative flex gap-4 group animar-entrada atraso-${(index % 5) + 1}`}>
                            {/* Avatar / Ícone */}
                            <div className="relative z-10 shrink-0">
                                {entrada.tipo === 'comentario' ? (
                                    <Avatar 
                                        nome={entrada.usuario.nome} 
                                        fotoPerfil={entrada.usuario.foto} 
                                        tamanho="md"
                                        className="ring-[6px] ring-background relative z-10"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-muted border border-border/50 flex items-center justify-center text-muted-foreground shadow-sm ring-[6px] ring-background relative z-10">
                                        <IconeEvento campo={entrada.conteudo.campo} />
                                    </div>
                                )}
                            </div>

                            {/* Conteúdo */}
                            <div className="flex-1 pt-0.5">
                                <div className="flex items-center gap-2.5 mb-2">
                                    <span className="text-[13px] font-bold text-foreground">{entrada.usuario.nome}</span>
                                    <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">
                                        {formatarTempoAtras(entrada.data)}
                                    </span>
                                </div>

                                {entrada.tipo === 'comentario' ? (
                                    <div className="bg-card border border-border/60 rounded-2xl p-4 text-[14px] text-card-foreground leading-relaxed shadow-sm hover:border-border transition-colors">
                                        {entrada.conteudo}
                                    </div>
                                ) : (
                                    <div className="bg-muted/30 border border-border/30 rounded-2xl rounded-tl-sm px-4 py-3 text-[13px] text-muted-foreground font-medium flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                                        {formatarEventoHistorico(entrada.conteudo.campo, entrada.conteudo.antigo, entrada.conteudo.novo)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function IconeEvento({ campo }: { campo: string }) {
    switch (campo) {
        case 'status': return <Layout size={14} />;
        case 'responsavel': return <UserPlus size={14} />;
        case 'prioridade': return <Tag size={14} />;
        case 'concluido': return <CheckCircle2 size={14} className="text-green-500" />;
        default: return <History size={14} />;
    }
}
