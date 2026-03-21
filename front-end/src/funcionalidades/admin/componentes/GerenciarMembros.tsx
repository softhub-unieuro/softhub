import { useState, useMemo, useCallback, memo } from 'react';
import { UserCog, Plus, LayersPlus, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/compartilhado/servicos/api';
import type { Membro } from '@/funcionalidades/admin/hooks/usarMembros';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { Tooltip } from '@/compartilhado/componentes/Tooltip';
import { usarConfiguracoes } from '@/funcionalidades/admin/hooks/usarConfiguracoes';
import { usarDebounce } from '@/compartilhado/hooks/usarDebounce';
import { usarToast } from '@/compartilhado/hooks/usarToast';
import { usarEquipes } from '@/funcionalidades/admin/hooks/usarEquipes';
import { pluralizar } from '@/utilitarios/formatadores';

// Novos Hooks e Sub-componentes
import { usarGerenciarMembros } from '@/funcionalidades/admin/hooks/usarGerenciarMembros';
import { StatsMembros } from '@/funcionalidades/admin/componentes/membros/StatsMembros';
import { TabelaMembros } from '@/funcionalidades/admin/componentes/membros/TabelaMembros';
import { BarraAcoesLote } from '@/funcionalidades/admin/componentes/membros/BarraAcoesLote';
import { ModaisMembros } from '@/funcionalidades/admin/componentes/membros/ModaisMembros';

/**
 * Página de Administração de Membros.
 * Refatorada em sessões para melhor manutenção e legibilidade.
 */
export const GerenciarMembros = memo(() => {
    const {
        membros, carregando, erro, recarregar, salvandoIds,
        alterarRole, cadastrarMembro, cadastrarMembroLote, removerMembro
    } = usarGerenciarMembros();
    
    const { configuracoes } = usarConfiguracoes();
    const { exibirToast } = usarToast();
    const { equipes, grupos, alocarMembro } = usarEquipes();
    const podeAlocar = usarPermissaoAcesso('equipes:editar_equipe');

    // Estados de Filtro e UI
    const [busca, setBusca] = useState('');
    const buscaDebounced = usarDebounce(busca, 300);
    const [pagina, setPagina] = useState(1);
    const [itensPorPagina, setItensPorPagina] = useState(15);
    const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
    
    // Estados dos Modais
    const [modalAberto, setModalAberto] = useState(false);
    const [modoModal, setModoModal] = useState<'individual' | 'lote'>('individual');
    const [membroParaExcluir, setMembroParaExcluir] = useState<Membro | null>(null);
    const [modalOnlineAberto, setModalOnlineAberto] = useState(false);
    const [modalSemEquipeAberto, setModalSemEquipeAberto] = useState(false);
    const [membroAlocacao, setMembroAlocacao] = useState<Membro | null>(null);
    const [idPerfilParaVer, setIdPerfilParaVer] = useState<string | null>(null);
    const [membroParaPromover, setMembroParaPromover] = useState<Membro | null>(null);

    // Queries de Apoio (Online / Justificativas)
    const { data: membrosOnline = [] } = useQuery({
        queryKey: ['membros-online'],
        queryFn: async () => {
            const res = await api.get('/api/ponto/online');
            return res.data.online || [];
        },
        refetchInterval: 30000
    });

    const { data: justificativas = [] } = useQuery({
        queryKey: ['admin-justificativas-contagem'],
        queryFn: async () => {
            const res = await api.get('/api/ponto/admin/justificativas');
            return res.data || [];
        },
        refetchInterval: 60000
    });

    const pendenciasPonto = useMemo(() => 
        justificativas.filter((j: any) => j.status === 'pendente').length, 
    [justificativas]);

    const membrosSemEquipe = useMemo(() => 
        membros.filter(m => !m.equipe_nome), 
    [membros]);

    const rolesDisponiveis = useMemo(() => {
        const base = configuracoes?.permissoes_roles ? Object.keys(configuracoes.permissoes_roles) : ['MEMBRO', 'LIDER', 'ADMIN'];
        return base.filter(r => r !== 'ADMIN' && r !== 'TODOS');
    }, [configuracoes]);

    // Lógica de Filtragem e Paginação
    const listaFiltrada = useMemo(() => {
        if (!buscaDebounced.trim()) return membros;
        const low = buscaDebounced.toLowerCase();
        return membros.filter(m => 
            (m.nome?.toLowerCase() || '').includes(low) || 
            m.email.toLowerCase().includes(low)
        );
    }, [membros, buscaDebounced]);

    const paginada = useMemo(() => 
        listaFiltrada.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina), 
    [listaFiltrada, pagina, itensPorPagina]);

    // Handlers
    const toggleSelect = useCallback((id: string) => {
        setSelecionados(prev => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id); else n.add(id);
            return n;
        });
    }, []);

    const handleRemoverLote = useCallback(async () => {
        const ids = Array.from(selecionados);
        setSelecionados(new Set());
        try {
            await Promise.all(ids.map(id => api.delete(`/api/usuarios/${id}`)));
            await recarregar();
            exibirToast(`${ids.length} ${pluralizar(ids.length, 'membro removido', 'membros removidos')}.`);
        } catch (e: any) {
            exibirToast(e.response?.data?.erro ?? 'Erro ao remover em lote.', 'erro');
        }
    }, [selecionados, recarregar, exibirToast]);

    const handleRemoverConfirmado = useCallback(async () => {
        if (!membroParaExcluir) return;
        const m = membroParaExcluir;
        setMembroParaExcluir(null);
        await removerMembro(m);
    }, [membroParaExcluir, removerMembro]);

    const handleConfirmarPromocao = useCallback(async (membro: Membro, novaRole: string) => {
        try {
            await alterarRole(membro, novaRole);
            setMembroParaPromover(null);
        } catch (e: any) {
            exibirToast(e.response?.data?.erro || 'Erro ao promover membro.', 'erro');
        }
    }, [alterarRole, exibirToast]);

    return (
        <div className="flex flex-col h-full w-full min-w-0 overflow-hidden space-y-6 animar-entrada">
            <CabecalhoFuncionalidade
                titulo="Gestão de Pessoas"
                subtitulo="Configure quem participa e o que cada um pode fazer no sistema."
                icone={UserCog}
            >
                <div className="flex items-center gap-3">
                    <div className="relative group/search max-w-xs">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" size={14} />
                        <input
                            placeholder="Buscar pessoa..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            className="h-11 w-full bg-background border border-border rounded-2xl pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/30 font-medium"
                        />
                    </div>

                    {usarPermissaoAcesso('membros:gerenciar') && (
                        <>
                            <button
                                onClick={() => { setModoModal('individual'); setModalAberto(true); }}
                                className="h-11 px-6 bg-primary text-white rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                <Plus size={18} strokeWidth={3} />
                                <span>Adicionar Pessoa</span>
                            </button>

                            <Tooltip texto="Adicionar Vários">
                                <button
                                    onClick={() => { setModoModal('lote'); setModalAberto(true); }}
                                    className="h-11 w-11 bg-muted/30 text-muted-foreground rounded-2xl flex items-center justify-center hover:bg-muted/50 active:scale-95 transition-all border border-border/40"
                                >
                                    <LayersPlus size={18} strokeWidth={3} />
                                </button>
                            </Tooltip>
                        </>
                    )}
                </div>
            </CabecalhoFuncionalidade>

            <StatsMembros 
                membrosOnline={membrosOnline}
                membrosTotal={membros.length}
                pendenciasPonto={pendenciasPonto}
                membrosSemEquipe={membrosSemEquipe.length}
                aoAbrirOnline={() => setModalOnlineAberto(true)}
                aoAbrirSemEquipe={() => setModalSemEquipeAberto(true)}
            />

            <TabelaMembros 
                paginada={paginada}
                listaFiltrada={listaFiltrada}
                membros={membros}
                carregando={carregando}
                pagina={pagina}
                itensPorPagina={itensPorPagina}
                salvandoIds={salvandoIds}
                selecionados={selecionados}
                rolesDisponiveis={rolesDisponiveis}
                toggleSelect={toggleSelect}
                aoPromover={setMembroParaPromover}
                handleSetMembroExcluir={setMembroParaExcluir}
                handleVerPerfil={setIdPerfilParaVer}
                setMembroAlocacao={setMembroAlocacao}
                handleMudarPagina={setPagina}
                handleMudarItensPorPagina={(n) => { setItensPorPagina(n); setPagina(1); }}
            />

            <BarraAcoesLote 
                selecionados={selecionados}
                handleLimparSelecao={() => setSelecionados(new Set())}
                handleRemoverLote={handleRemoverLote}
            />

            <ModaisMembros 
                modalAberto={modalAberto}
                modoModal={modoModal}
                handleFecharModal={() => setModalAberto(false)}
                cadastrarMembro={cadastrarMembro}
                cadastrarMembroLote={cadastrarMembroLote}
                rolesDisponiveis={rolesDisponiveis}
                configuracoes={configuracoes}
                membroParaExcluir={membroParaExcluir}
                setMembroParaExcluir={setMembroParaExcluir}
                handleRemoverConfirmado={handleRemoverConfirmado}
                modalOnlineAberto={modalOnlineAberto}
                setModalOnlineAberto={setModalOnlineAberto}
                membrosOnline={membrosOnline}
                modalSemEquipeAberto={modalSemEquipeAberto}
                setModalSemEquipeAberto={setModalSemEquipeAberto}
                membrosSemEquipe={membrosSemEquipe}
                podeAlocar={podeAlocar}
                setMembroAlocacao={setMembroAlocacao}
                handleVerPerfil={setIdPerfilParaVer}
                idPerfilParaVer={idPerfilParaVer}
                handleFecharPerfil={() => setIdPerfilParaVer(null)}
                membroAlocacao={membroAlocacao}
                grupos={grupos}
                equipes={equipes}
                alocarMembro={alocarMembro}
                exibirToast={exibirToast}
                recarregar={recarregar}
                membroParaPromover={membroParaPromover}
                setMembroParaPromover={setMembroParaPromover}
                handleConfirmarPromocao={handleConfirmarPromocao}
            />
        </div>
    );
});

export default GerenciarMembros;
