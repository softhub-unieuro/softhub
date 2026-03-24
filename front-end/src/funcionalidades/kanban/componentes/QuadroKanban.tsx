import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { FolderKanban, Plus, Layers, FileText } from 'lucide-react';
import { useSearchParams } from 'react-router';

import { usarKanban } from '@/funcionalidades/kanban/hooks/usarKanban';
import type { Tarefa } from '@/funcionalidades/kanban/hooks/usarKanban';
import { usarBacklog } from '@/funcionalidades/backlog/hooks/usarBacklog';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { usarProjetos } from '@/funcionalidades/projetos/hooks/usarProjetos';
import { COLUNAS_KANBAN } from '@/utilitarios/constantes';

import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { CartaoTarefa } from './CartaoTarefa';
import { PainelFiltrosKanban } from './PainelFiltrosKanban';
import { ModalDetalhesTarefa } from './ModalDetalhesTarefa';
import { ModalCriarTarefa } from '@/funcionalidades/backlog/componentes/ModalCriarTarefa';
import { DocumentosProjetoModal } from '@/funcionalidades/projetos/componentes/DocumentosProjetoModal';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { EstadoErro } from '@/compartilhado/componentes/EstadoErro';
import { ModalEdicaoPerfil } from '@/funcionalidades/perfil/componentes/ModalEdicaoPerfil';
import { PerfilProvider } from '@/funcionalidades/perfil/contexto/PerfilContexto';
import { ColunaDropZone } from './ColunaDropZone';
import { KanbanVazioProjetos } from './KanbanVazioProjetos';
import { Skeleton, SkeletonCard } from '@/compartilhado/componentes/Skeleton';

const LABELS_COLUNAS: Record<string, string> = {
    backlog: 'Planejamento',
    todo: 'Para Fazer',
    in_progress: 'Em Execução',
    em_revisao: 'Revisão',
    concluida: 'Finalizado'
};

/**
 * Quadro Kanban Principal.
 * Gerencia a visualização e movimentação de tarefas entre colunas.
 * Segue o padrão estético premium do sistema.
 */
export const QuadroKanban = memo(() => {
    const { projetoAtivoId } = usarAutenticacao();
    const { projetos, carregando: carregandoProjetos } = usarProjetos();

    const [filtros, setFiltros] = useState<any>({});
    const { tarefas, carregando, erro, moverCard } = usarKanban(projetoAtivoId, filtros);
    const [colunaAtiva, setColunaAtiva] = useState<string>(COLUNAS_KANBAN[1]);
    const [activeTarefa, setActiveTarefa] = useState<Tarefa | null>(null);
    const [tarefaDetalhes, setTarefaDetalhes] = useState<Tarefa | null>(null);
    const [modalCriarAberto, setModalCriarAberto] = useState(false);
    const [modalDocsAberto, setModalDocsAberto] = useState(false);
    const [idPerfilParaVer, setIdPerfilParaVer] = useState<string | null>(null);

    const podeMover = usarPermissaoAcesso('tarefas:mover');
    const podeCriar = usarPermissaoAcesso('tarefas:criar');
    const podeVerDocumentos = usarPermissaoAcesso('projetos:documentos');
    const podeGerenciarProjetos = usarPermissaoAcesso('projetos:visualizar');

    const [searchParams, setSearchParams] = useSearchParams();
    const tarefaIdUrl = searchParams.get('tarefa');

    const { criarTarefa } = usarBacklog(projetoAtivoId);

    const tarefasPorStatus = useMemo(() => {
        const agrupado: Record<string, Tarefa[]> = { backlog: [], todo: [], in_progress: [], em_revisao: [], concluida: [] };
        tarefas.forEach((t: Tarefa) => {
            if (agrupado[t.status]) agrupado[t.status].push(t);
        });
        return agrupado;
    }, [tarefas]);

    // Detectar tarefa na URL e abrir detalhes
    useEffect(() => {
        if (tarefaIdUrl && tarefas.length > 0) {
            const tarefaEncontrada = tarefas.find((t: Tarefa) => t.id === tarefaIdUrl);
            if (tarefaEncontrada) {
                setTarefaDetalhes(tarefaEncontrada);
            }
        }
    }, [tarefaIdUrl, tarefas]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const temFiltroAtivo = !!(filtros.busca || filtros.prioridades?.length || filtros.responsavelId);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        if (!podeMover) return;
        const { active } = event;
        const t = tarefas.find((item: Tarefa) => item.id === active.id);
        if (t) setActiveTarefa(t);
    }, [podeMover, tarefas]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        if (!podeMover) return;
        const { active, over } = event;
        setActiveTarefa(null);
        if (!over) return;
        const tarefaId = active.id as string;
        const colDestino = over.id as string;
        const t = tarefas.find((item: Tarefa) => item.id === tarefaId);
        if (t && t.status !== colDestino) {
            moverCard(tarefaId, colDestino as any);
        }
    }, [podeMover, tarefas, moverCard]);

    const handleFiltrar = useCallback((f: any) => setFiltros(f), []);
    const handleFecharDetalhes = useCallback(() => {
        setTarefaDetalhes(null);
        if (tarefaIdUrl) {
            const novosParams = new URLSearchParams(searchParams);
            novosParams.delete('tarefa');
            setSearchParams(novosParams, { replace: true });
        }
    }, [tarefaIdUrl, searchParams, setSearchParams]);
    const handleAbrirCriar = useCallback(() => setModalCriarAberto(true), []);
    const handleFecharCriar = useCallback(() => setModalCriarAberto(false), []);
    const handleLimparFiltros = useCallback(() => setFiltros({}), []);
    const handleCriarTarefa = useCallback(async (dados: any) => {
        await criarTarefa({ ...dados, status: 'todo' });
        setModalCriarAberto(false);
    }, [criarTarefa]);

    const handleVerPerfil = useCallback((id: string) => setIdPerfilParaVer(id), []);
    const handleFecharPerfil = useCallback(() => setIdPerfilParaVer(null), []);

    if (carregandoProjetos) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Carregando Centralizar={false} tamanho="lg" />
            </div>
        );
    }

    if (!projetoAtivoId) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Layers size={24} className="text-muted-foreground" />
                </div>
                <h3 className="text-foreground font-black uppercase tracking-widest mb-2">Nenhum Projeto Selecionado</h3>
                <p className="text-muted-foreground text-sm">Selecione um projeto na barra lateral para ver o Kanban.</p>
            </div>
        );
    }

    const projeto = projetos.find(p => p.id === projetoAtivoId);

    return (
        <div className="flex flex-col flex-1 min-h-0 h-full w-full overflow-hidden">
            <CabecalhoFuncionalidade
                titulo="Quadro Kanban"
                subtitulo={`Visão geral e execução das tarefas do projeto ${projeto?.nome || 'não identificado'}.`}
                icone={FolderKanban}
            >
                <div className="flex gap-2.5">
                    {podeVerDocumentos && (
                        <button
                            onClick={() => setModalDocsAberto(true)}
                            className="h-11 px-6 bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 rounded-full flex items-center gap-2 text-[11px] font-black uppercase tracking-widest hover:-translate-y-0.5 active:scale-95 transition-all"
                        >
                            <FileText size={18} strokeWidth={2} />
                            <span>Arquivos e Docs</span>
                        </button>
                    )}
                    {podeCriar && (
                        <button
                            onClick={handleAbrirCriar}
                            className="h-11 px-6 bg-primary text-primary-foreground rounded-full flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all"
                        >
                            <Plus size={18} strokeWidth={3} />
                            <span>Nova Tarefa</span>
                        </button>
                    )}
                </div>
            </CabecalhoFuncionalidade>


            <PainelFiltrosKanban filtros={filtros} aoFiltrar={handleFiltrar} />

            {/* Seletor de Colunas Mobile */}
            <div className="lg:hidden flex overflow-x-auto scroll-none gap-2 px-6 py-4 -mx-6 mb-2 snap-x">
                {COLUNAS_KANBAN.map((coluna) => (
                    <button
                        key={coluna}
                        onClick={() => setColunaAtiva(coluna)}
                        className={`shrink-0 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all snap-center border ${
                            colunaAtiva === coluna 
                                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' 
                                : 'bg-card/40 text-muted-foreground/60 border-border/40'
                        }`}
                    >
                        {LABELS_COLUNAS[coluna]}
                    </button>
                ))}
            </div>


            {!carregandoProjetos && projetos.length === 0 ? (
                <KanbanVazioProjetos podeGerenciarProjetos={podeGerenciarProjetos} />
            ) : (
                <div className="flex-1 min-h-0 flex flex-col">
                    {carregando && tarefas.length === 0 ? (
                        <div className="h-full grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="space-y-4">
                                    <Skeleton className="h-6 w-1/2 mx-auto rounded-lg" />
                                    <SkeletonCard />
                                    <SkeletonCard />
                                </div>
                            ))}
                        </div>
                    ) : erro ? (
                        <div className="h-full flex items-center justify-center p-12">
                            <EstadoErro titulo="Erro no Kanban" mensagem={erro} />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col min-h-0">
                            {tarefas.length === 0 && temFiltroAtivo && (
                                <div className="mb-6">
                                    <div className="bg-card/20 border border-border/50 rounded-[32px] flex items-center justify-center py-6">
                                        <EstadoVazio
                                            tipo="pesquisa"
                                            titulo="Nenhuma tarefa encontrada"
                                            descricao="Não há tarefas que correspondam aos filtros ou termo de busca aplicados."
                                            compacto={true}
                                            acao={{ rotulo: "Limpar todos os filtros", aoClicar: handleLimparFiltros }}
                                        />
                                    </div>
                                </div>
                            )}
                            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                                <div className="flex-1 min-h-0 w-full overflow-hidden">
                                    <div className="flex h-full w-full gap-4">
                                        {COLUNAS_KANBAN.map((coluna, index) => (
                                            <ColunaDropZone
                                                key={coluna}
                                                id={coluna}
                                                titulo={LABELS_COLUNAS[coluna]}
                                                tarefas={tarefasPorStatus[coluna] || []}
                                                aoApertarTarefa={setTarefaDetalhes}
                                                aoVerPerfil={handleVerPerfil}
                                                delayClass={`atraso-${index + 1}`}
                                                className={colunaAtiva === coluna ? 'flex' : 'hidden lg:flex'}
                                            />
                                        ))}
                                        <DragOverlay dropAnimation={null}>
                                            {activeTarefa ? (
                                                <div className="scale-[1.03] shadow-2xl opacity-90 transition-transform">
                                                    <CartaoTarefa tarefa={activeTarefa} />
                                                </div>
                                            ) : null}
                                        </DragOverlay>
                                    </div>
                                </div>
                            </DndContext>
                        </div>
                    )}
                </div>
            )}

            <ModalDetalhesTarefa tarefa={tarefaDetalhes} aberto={!!tarefaDetalhes} aoFechar={handleFecharDetalhes} />
            <ModalCriarTarefa aberto={modalCriarAberto} aoFechar={handleFecharCriar} aoCriar={handleCriarTarefa} />

            {idPerfilParaVer && (
                <PerfilProvider customUsuarioId={idPerfilParaVer}>
                    <ModalEdicaoPerfil
                        aberto={!!idPerfilParaVer}
                        aoFechar={handleFecharPerfil}
                    />
                </PerfilProvider>
            )}

            {projeto && (
                <DocumentosProjetoModal
                    projeto={projeto}
                    aberto={modalDocsAberto}
                    aoFechar={() => setModalDocsAberto(false)}
                />
            )}
        </div>
    );
});

export default QuadroKanban;
