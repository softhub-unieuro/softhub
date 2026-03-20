import { useState, useMemo, useCallback, memo } from 'react';
import { LayoutGrid, Users, Plus, Trash2 } from 'lucide-react';

import { usarEquipes } from '@/funcionalidades/admin/hooks/usarEquipes';
import type { Grupo, Equipe } from '@/funcionalidades/admin/hooks/usarEquipes';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { Modal } from '@/compartilhado/componentes/Modal';
import { ConfirmacaoExclusao } from '@/compartilhado/componentes/ConfirmacaoExclusao';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';

import { DetalheEquipe } from '@/funcionalidades/admin/componentes/equipes/DetalheEquipe';
import { FormGrupoEquipe } from '@/funcionalidades/admin/componentes/equipes/FormGrupoEquipe';
import { ModalAlocacao } from '@/funcionalidades/admin/componentes/equipes/ModalAlocacao';
import { ModalMovimentacao } from '@/funcionalidades/admin/componentes/equipes/ModalMovimentacao';
import { ModalSelecaoLider } from '@/funcionalidades/admin/componentes/equipes/ModalSelecaoLider';
import { SidebarEquipes } from '@/funcionalidades/admin/componentes/equipes/SidebarEquipes';

export const GerenciarEquipes = memo(() => {
    const {
        grupos, equipes, membros, carregando, erro,
        criarGrupo, editarGrupo, desativarGrupo,
        criarEquipe, editarEquipe, desativarEquipe,
        alocarMembro, moverMembro
    } = usarEquipes();

    const podeCriarEquipe = usarPermissaoAcesso('equipes:criar_equipe');
    const podeEditarEquipe = usarPermissaoAcesso('equipes:editar_equipe');

    const [idEquipeAtiva, setIdEquipeAtiva] = useState<string | null>(null);
    const [buscaEquipe, setBuscaEquipe] = useState('');
    const [modalOrg, setModalOrg] = useState<{ aberto: boolean; tipo: 'equipe' | 'grupo'; dados?: any } | null>(null);
    const [confirmacaoExclusao, setConfirmacaoExclusao] = useState<{ id: string; nome: string; tipo: 'equipe' | 'grupo' } | null>(null);
    const [modalAlocacao, setModalAlocacao] = useState<{ grupoId: string; equipeId: string } | null>(null);
    const [modalMover, setModalMover] = useState<{ membroId: string; grupoOrigemId: string; equipeId: string } | null>(null);
    const [modalLider, setModalLider] = useState<{ aberto: boolean; tipo: 'lider' | 'sub_lider' } | null>(null);
    const [desativando, setDesativando] = useState(false);

    const equipesAtivas = equipes;

    const equipesFiltradas = useMemo(() => 
        equipesAtivas.filter((e: any) => 
            e.nome.toLowerCase().includes(buscaEquipe.toLowerCase())
        ),
    [equipesAtivas, buscaEquipe]);

    // Otimização: Memoização de dados derivados
    const equipeAtiva = useMemo(() => 
        equipesAtivas.find((e: any) => e.id === idEquipeAtiva),
    [equipesAtivas, idEquipeAtiva]);

    const gruposDaEquipe = useMemo(() => 
        grupos.filter((g: any) => g.equipe_id === idEquipeAtiva),
    [grupos, idEquipeAtiva]);

    const handleSalvarOrg = useCallback(async (dados: any) => {
        if (!modalOrg) return;
        setDesativando(true);
        try {
            if (modalOrg.tipo === 'grupo') {
                await criarGrupo(dados);
            } else {
                await criarEquipe(dados);
            }
            setModalOrg(null);
        } catch (error) {
            console.error("Erro ao salvar:", error);
        } finally {
            setDesativando(false);
        }
    }, [modalOrg, criarGrupo, criarEquipe]);

    const handleConfirmarExclusao = useCallback(async () => {
        if (!confirmacaoExclusao) return;
        setDesativando(true);
        try {
            if (confirmacaoExclusao.tipo === 'grupo') {
                await desativarGrupo(confirmacaoExclusao.id);
            } else {
                await desativarEquipe(confirmacaoExclusao.id);
                // Se era a equipe ativa, limpa para forçar re-seleção ou tela vazia
                if (idEquipeAtiva === confirmacaoExclusao.id) {
                    setIdEquipeAtiva(null);
                }
            }
        } catch (error) {
            console.error("Erro ao desativar:", error);
        } finally {
            setDesativando(false);
            setConfirmacaoExclusao(null);
        }
    }, [confirmacaoExclusao, desativarGrupo, desativarEquipe, idEquipeAtiva]);

    const handleDefinirLider = useCallback(async (membroId: string) => {
        if (!modalLider || !idEquipeAtiva || !equipeAtiva) return;
        
        const isLider = modalLider.tipo === 'lider';
        const payload: any = {};

        if (isLider) {
            if (equipeAtiva.lider_id === membroId) {
                payload.lider_id = null;
            } else {
                payload.lider_id = membroId;
                if (equipeAtiva.sub_lider_id === membroId) {
                    payload.sub_lider_id = null;
                }
            }
        } else {
            if (equipeAtiva.lider_id === membroId) {
                return;
            }

            if (equipeAtiva.sub_lider_id === membroId) {
                payload.sub_lider_id = null;
            } else {
                payload.sub_lider_id = membroId;
            }
        }

        try {
            await editarEquipe(idEquipeAtiva, payload);
            setModalLider(null);
        } catch (err) {
            console.error('Erro ao definir liderança:', err);
        }
    }, [modalLider, idEquipeAtiva, equipeAtiva, editarEquipe]);

    // Callbacks Memoizados para DetalheEquipe
    const handleAdicionarGrupo = useCallback(() => setModalOrg({ aberto: true, tipo: 'grupo', dados: { equipe_id: idEquipeAtiva } }), [idEquipeAtiva]);
    const handleExcluirGrupo = useCallback((g: Grupo) => setConfirmacaoExclusao({ id: g.id, nome: g.nome, tipo: 'grupo' }), []);
    const handleAlocarAbrir = useCallback((gId: string, eId: string) => setModalAlocacao({ grupoId: gId, equipeId: eId }), []);
    const handleRemoverMembro = useCallback((mId: string) => { alocarMembro(mId, null, null); }, [alocarMembro]);
    const handleAlocarLote = useCallback(async (mId: string, eId: string | null, gId: string | null) => { await alocarMembro(mId, eId, gId); }, [alocarMembro]);
    const handleMoverMembroAbrir = useCallback((mId: string, gOrigemId: string) => setModalMover({ membroId: mId, grupoOrigemId: gOrigemId, equipeId: idEquipeAtiva! }), [idEquipeAtiva]);
    const handleSelecionarLiderAbrir = useCallback((tipo: 'lider' | 'sub_lider') => setModalLider({ aberto: true, tipo }), []);
    const handleSalvarNomeGrupo = useCallback(async (id: string, nome: string) => { await editarGrupo(id, { nome }); }, [editarGrupo]);
    const handleSalvarNomeEquipe = useCallback(async (id: string, nome: string) => { await editarEquipe(id, { nome }); }, [editarEquipe]);

    return (
        <div className="flex flex-col h-full space-y-6 animar-entrada">
            <CabecalhoFuncionalidade
                titulo="Estrutura Organizacional"
                subtitulo="Gestão de equipes, grupos de trabalho e alocação de lideranças."
                icone={LayoutGrid}
            >
                <div className="flex items-center gap-3">
                    {/* Botão Voltar para Mobile quando há equipe selecionada */}
                    <button
                        onClick={() => setIdEquipeAtiva(null)}
                        className={`lg:hidden h-11 px-4 bg-muted/20 text-foreground rounded-full flex items-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all ${!idEquipeAtiva ? 'opacity-0 pointer-events-none w-0 truncate' : 'opacity-100'}`}
                    >
                        <Trash2 size={16} className="rotate-45" />
                        <span>Voltar</span>
                    </button>

                    {podeCriarEquipe && (
                        <button
                            onClick={() => setModalOrg({ aberto: true, tipo: 'equipe' })}
                            className={`h-11 px-6 bg-primary text-primary-foreground rounded-full flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all ${idEquipeAtiva ? 'hidden lg:flex' : 'flex'}`}
                        >
                            <Plus size={18} strokeWidth={3} />
                            <span>Nova Equipe</span>
                        </button>
                    )}
                </div>
            </CabecalhoFuncionalidade>

            <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
                {carregando && equipesAtivas.length === 0 ? (
                    <div className="flex-1 flex flex-col lg:flex-row gap-8 animate-pulse">
                        <div className="w-full lg:w-72 h-[500px] bg-card/60 border border-border/40 rounded-3xl" />
                        <div className="flex-1 h-[500px] bg-card/60 border border-border/40 rounded-3xl" />
                    </div>
                ) : (
                    <>
                        {/* Sidebar de Equipes */}
                        <div className={`w-full lg:w-80 shrink-0 ${idEquipeAtiva ? 'hidden lg:flex' : 'flex'}`}>
                            <SidebarEquipes
                                equipes={equipesAtivas}
                                idEquipeAtiva={idEquipeAtiva}
                                aoSelecionar={setIdEquipeAtiva}
                                podeEditar={podeEditarEquipe}
                                aoExcluir={(e) => setConfirmacaoExclusao({ id: e.id, nome: e.nome, tipo: 'equipe' })}
                                podeCriar={podeCriarEquipe}
                                aoCriar={() => setModalOrg({ aberto: true, tipo: 'equipe' })}
                            />
                        </div>

                        {/* Detalhe da Equipe Selecionada */}
                        <main className={`flex-1 min-w-0 min-h-0 flex-col ${idEquipeAtiva ? 'flex' : 'hidden lg:flex'}`}>
                             {equipeAtiva ? (
                                 <DetalheEquipe
                                     key={equipeAtiva.id}
                                     equipe={equipeAtiva}
                                     grupos={gruposDaEquipe}
                                     membros={membros as any}
                                     aoAdicionarGrupo={handleAdicionarGrupo}
                                     aoExcluirGrupo={handleExcluirGrupo}
                                     aoAlocar={handleAlocarAbrir}
                                     aoRemoverMembro={handleRemoverMembro}
                                     aoMoverMembro={handleMoverMembroAbrir}
                                     aoSelecionarLider={handleSelecionarLiderAbrir}
                                     aoSalvarNomeGrupo={handleSalvarNomeGrupo}
                                     aoSalvarNomeEquipe={handleSalvarNomeEquipe}
                                 />
                             ) : (
                                 <div className="flex-1 flex flex-col items-center justify-center bg-card border border-border rounded-2xl border-dashed p-12">
                                     <EstadoVazio 
                                        titulo="Painel Organizacional"
                                        descricao="Selecione uma equipe na lista lateral para gerenciar seus membros e grupos de trabalho."
                                        iconeCustom={<LayoutGrid size={32} strokeWidth={1.5} className="text-primary/40" />}
                                     />
                                 </div>
                             )}
                        </main>
                    </>
                )}
            </div>

            {/* Modais */}
            {modalOrg && (
                <Modal
                    aberto={modalOrg.aberto}
                    aoFechar={() => setModalOrg(null)}
                    titulo={modalOrg.tipo === 'grupo' && equipeAtiva ? `Novo Grupo em ${equipeAtiva.nome}` : `Nova Equipe`}
                >
                    <FormGrupoEquipe
                        titulo={modalOrg.tipo === 'equipe' ? 'Equipe' : 'Grupo'}
                        tipo={modalOrg.tipo}
                        equipeAtivaId={modalOrg.dados?.equipe_id}
                        equipes={equipesAtivas.map((e: Equipe) => ({ id: e.id, nome: e.nome }))}
                        aoSalvar={handleSalvarOrg}
                        aoFechar={() => setModalOrg(null)}
                    />
                </Modal>
            )}

            <ConfirmacaoExclusao
                aberto={!!confirmacaoExclusao}
                aoFechar={() => setConfirmacaoExclusao(null)}
                aoConfirmar={handleConfirmarExclusao}
                titulo={`Excluir ${confirmacaoExclusao?.tipo === 'grupo' ? 'Grupo' : 'Equipe'}?`}
                descricao="Esta ação é definitiva. Todos os dados vinculados serão permanentemente removidos."
                carregando={desativando}
            />

            <ModalAlocacao
                aberto={!!modalAlocacao}
                aoFechar={() => setModalAlocacao(null)}
                grupos={grupos}
                equipes={equipesAtivas}
                membros={membros as any}
                aoAlocar={handleAlocarLote}
                grupoIdPadrao={modalAlocacao?.grupoId}
                equipeIdPadrao={modalAlocacao?.equipeId}
            />

            <ModalMovimentacao
                aberto={!!modalMover}
                aoFechar={() => setModalMover(null)}
                membro={(membros.find((m: any) => m.id === modalMover?.membroId) as any) || null}
                grupos={grupos.filter((g: any) => g.equipe_id === modalMover?.equipeId && g.id !== modalMover?.grupoOrigemId)}
                aoMover={async (mId: string, eId: string, gDestId: string) => {
                    if (modalMover) {
                        await moverMembro(mId, eId, gDestId, modalMover.grupoOrigemId);
                        setModalMover(null);
                    }
                }}
                equipeId={modalMover?.equipeId || ''}
            />

            <ModalSelecaoLider
                aberto={!!modalLider?.aberto}
                aoFechar={() => setModalLider(null)}
                membros={membros as any}
                aoConfirmar={handleDefinirLider}
                titulo={modalLider?.tipo === 'lider' ? 'Definir Líder' : 'Definir Sub-líder'}
                valorAtual={modalLider?.tipo === 'lider' ? equipeAtiva?.lider_id : equipeAtiva?.sub_lider_id}
                outroId={modalLider?.tipo === 'lider' ? equipeAtiva?.sub_lider_id : equipeAtiva?.lider_id}
                tipo={modalLider?.tipo}
            />
        </div>
    );
});

export default GerenciarEquipes;
