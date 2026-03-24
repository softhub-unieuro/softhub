import {
    ListTodo,
    Plus,
    ChevronRight,
    User,
    FolderKanban,
    Layers,
    ClipboardList
} from 'lucide-react';
import { usarBacklog } from '../hooks/usarBacklog';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { usarProjetos } from '@/funcionalidades/projetos/hooks/usarProjetos';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { EstadoErro } from '@/compartilhado/componentes/EstadoErro';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { Emblema } from '@/compartilhado/componentes/Emblema';
import { LABELS_PRIORIDADE, LABELS_STATUS } from '@/utilitarios/constantes';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { useState, useCallback, memo } from 'react';
import { ModalCriarTarefa } from './ModalCriarTarefa';
import { BarraFiltros, FiltroPills } from '@/compartilhado/componentes/BarraFiltros';
import { LinhaTarefaBacklog } from './LinhaTarefaBacklog';
import { CardTarefaBacklogMobile } from './CardTarefaBacklogMobile';
import { BacklogVazioProjetos } from './BacklogVazioProjetos';

const PaginaBacklog = memo(() => {
    const { projetoAtivoId } = usarAutenticacao();
    const { projetos, carregando: carregandoProjetos } = usarProjetos();
    const podeGerenciarProjetos = usarPermissaoAcesso('projetos:visualizar');

    const [modalCriarAberto, setModalCriarAberto] = useState(false);
    const [busca, setBusca] = useState('');
    const [statusFiltro, setStatusFiltro] = useState<string[]>([]);
    const [prioridadeFiltro, setPrioridadeFiltro] = useState<string[]>([]);

    const {
        tarefas,
        carregando,
        erro,
        criarTarefa
    } = usarBacklog(projetoAtivoId, {
        busca,
        status: statusFiltro.length > 0 ? statusFiltro : undefined,
        prioridades: prioridadeFiltro.length > 0 ? prioridadeFiltro : undefined
    });

    const toggleStatus = useCallback((s: string) => {
        setStatusFiltro(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    }, []);

    const togglePrioridade = useCallback((p: string) => {
        setPrioridadeFiltro(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    }, []);

    const podeCriar = usarPermissaoAcesso('tarefas:criar');

    if (carregandoProjetos) {
        return (
            <div className="flex-1 py-40 flex items-center justify-center">
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
                <p className="text-muted-foreground text-sm">Selecione um projeto na barra lateral para ver o Backlog.</p>
            </div>
        );
    }

    if (!carregandoProjetos && projetos.length === 0) {
        return (
            <BacklogVazioProjetos podeGerenciarProjetos={podeGerenciarProjetos} />
        );
    }

    return (
        <div className="w-full space-y-6 animar-entrada pb-20">
            <CabecalhoFuncionalidade
                titulo="Backlog"
                subtitulo="Organize o que precisa ser feito e acompanhe o progresso."
                icone={ClipboardList}
            >
                <div className="flex items-center gap-4">
                    {podeCriar && (
                        <button
                            onClick={() => setModalCriarAberto(true)}
                            className="h-11 px-6 bg-primary text-primary-foreground rounded-full flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all"
                        >
                            <Plus size={18} strokeWidth={3} />
                            <span>Nova Tarefa</span>
                        </button>
                    )}
                </div>
            </CabecalhoFuncionalidade>

            <div className="animar-entrada atraso-1">
                <BarraFiltros
                    busca={busca}
                    aoMudarBusca={setBusca}
                    placeholderBusca="Buscar tarefa pelo nome ou descrição..."
                    temFiltrosAtivos={busca !== '' || statusFiltro.length > 0 || prioridadeFiltro.length > 0}
                    aoLimparFiltros={() => {
                        setBusca('');
                        setStatusFiltro([]);
                        setPrioridadeFiltro([]);
                    }}
                >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                        <FiltroPills 
                            label="Prioridade" 
                            opcoes={LABELS_PRIORIDADE} 
                            valoresAtivos={prioridadeFiltro} 
                            aoToggle={togglePrioridade} 
                            variante="primary"
                        />
                        
                        <div className="h-6 w-px bg-white/5 hidden lg:block" />

                        <FiltroPills 
                            label="Status" 
                            opcoes={LABELS_STATUS} 
                            valoresAtivos={statusFiltro} 
                            aoToggle={toggleStatus} 
                        />
                    </div>
                </BarraFiltros>
            </div>

            {/* Listagem */}
            {carregando ? (
                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden animate-pulse">
                    <div className="h-16 w-full bg-white/5 border-b border-white/5" />
                    <div className="p-8 space-y-6">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center gap-8">
                                <div className="h-6 w-1/3 bg-white/5 rounded-lg" />
                                <div className="h-6 w-20 bg-white/5 rounded-lg mx-auto" />
                                <div className="h-6 w-24 bg-white/5 rounded-lg mx-auto" />
                                <div className="h-6 w-10 bg-white/5 rounded-lg mx-auto" />
                                <div className="h-6 w-8 bg-white/5 rounded-lg ml-auto" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : erro ? (
                <div className="py-12 max-w-lg mx-auto w-full animate-in slide-in-from-bottom-4 duration-500">
                    <EstadoErro titulo="Erro no Backlog" mensagem={erro} />
                </div>
            ) : tarefas.length === 0 ? (
                <EstadoVazio
                    titulo="Backlog Vazio"
                    descricao="Nenhuma tarefa corresponde aos filtros. Tente mudar os filtros ou crie uma nova tarefa."
                />
            ) : (
                <div className="space-y-6">
                    {/* VISÃO MOBILE — Cards Táteis */}
                    <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-6 animar-entrada atraso-2">
                        {tarefas.map(tarefa => (
                            <CardTarefaBacklogMobile key={tarefa.id} tarefa={tarefa} />
                        ))}
                    </div>

                    {/* VISÃO DESKTOP — Tabela Operacional */}
                    <div className="hidden lg:block bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animar-entrada atraso-2">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-8 py-6 text-left text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">Nome da Tarefa</th>
                                        <th className="px-4 py-6 text-center text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">Prioridade</th>
                                        <th className="px-4 py-6 text-center text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">Status</th>
                                        <th className="px-4 py-6 text-center text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">Responsáveis</th>
                                        <th className="px-8 py-6 text-right text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {tarefas.map(tarefa => (
                                        <LinhaTarefaBacklog key={tarefa.id} tarefa={tarefa} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <ModalCriarTarefa 
                aberto={modalCriarAberto} 
                aoFechar={() => setModalCriarAberto(false)} 
                aoCriar={async (dados) => {
                    await criarTarefa(dados);
                }}
            />
        </div>
    );
});

export default PaginaBacklog;
