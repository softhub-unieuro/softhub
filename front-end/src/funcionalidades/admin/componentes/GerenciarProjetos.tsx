import { useState } from 'react';
import { LayoutPrincipal } from '@/compartilhado/componentes/LayoutPrincipal';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { Alerta } from '@/compartilhado/componentes/Alerta';
import { ConfirmacaoExclusao } from '@/compartilhado/componentes/ConfirmacaoExclusao';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { DocumentosProjetoModal } from '@/funcionalidades/projetos/componentes/DocumentosProjetoModal';
import { githubStorage } from '@/funcionalidades/projetos/servicos/github-storage';
import { FolderKanban, Plus } from 'lucide-react';
import { formatarDataHora } from '@/utilitarios/formatadores';
import { usarProjetos, Projeto } from '@/funcionalidades/projetos/hooks/usarProjetos';
import { usarEquipes } from '@/funcionalidades/admin/hooks/usarEquipes';
import { CardProjeto } from '@/funcionalidades/admin/componentes/projetos/CardProjeto';
import { ModalFormularioProjeto, FormProjeto } from '@/funcionalidades/admin/componentes/projetos/ModalFormularioProjeto';

import { SubmitHandler } from 'react-hook-form';

export default function GerenciarProjetos() {
    const { projetos, carregando, erro, criarProjeto, editarProjeto, excluirProjeto } = usarProjetos();
    const { equipes } = usarEquipes();
    const podeCriar = usarPermissaoAcesso('projetos:criar');
    const podeEditar = usarPermissaoAcesso('projetos:editar');
    const podeExcluir = usarPermissaoAcesso('projetos:excluir');
    const podeVerDocumentos = usarPermissaoAcesso('projetos:documentos');
    const [modalAberto, setModalAberto] = useState(false);
    const [projetoEditando, setProjetoEditando] = useState<string | null>(null);
    const [projetoExcluindo, setProjetoExcluindo] = useState<Projeto | null>(null);
    const [excluirRepoGithub, setExcluirRepoGithub] = useState(false);
    const [projetoDocs, setProjetoDocs] = useState<Projeto | null>(null);
    const [processando, setProcessando] = useState(false);

    const [projetoNoFormulario, setProjetoNoFormulario] = useState<FormProjeto>({
        nome: '',
        descricao: '',
        publico: false,
        github_repo: '',
        documentacao_url: '',
        figma_url: '',
        setup_url: '',
        equipes: []
    });

    const handleAbrirCriar = () => {
        setProjetoEditando(null);
        setProjetoNoFormulario({ 
            nome: '', 
            descricao: '', 
            publico: false, 
            github_repo: '', 
            documentacao_url: '',
            figma_url: '',
            setup_url: '',
            equipes: [] 
        });
        setModalAberto(true);
    };

    const handleAbrirEditar = (p: Projeto) => {
        setProjetoEditando(p.id);
        setProjetoNoFormulario({ 
            nome: p.nome, 
            descricao: p.descricao || '', 
            publico: Boolean(p.publico),
            github_repo: p.github_repo || '',
            documentacao_url: p.documentacao_url || '',
            figma_url: p.figma_url || '',
            setup_url: p.setup_url || '',
            equipes: p.equipes || []
        });
        setModalAberto(true);
    };

    const onSubmit: SubmitHandler<FormProjeto> = async (dados) => {
        setProcessando(true);
        try {
            if (dados.github_repo) {
                try {
                    await githubStorage.garantirRepositorio(
                        dados.github_repo, 
                        dados.descricao || 'Repositório criado via SoftHub'
                    );
                } catch (e) {
                    console.warn('[GitHub Storage] Não foi possível garantir o repositório.', e);
                }
            }

            if (projetoEditando) {
                await editarProjeto(projetoEditando, dados);
            } else {
                await criarProjeto(dados);
            }
            setModalAberto(false);
        } catch (e) {
            // Logger já trata o erro
        } finally {
            setProcessando(false);
        }
    };

    const confirmarExclusao = async () => {
        if (!projetoExcluindo) return;
        setProcessando(true);
        try {
            if (projetoExcluindo.github_repo && excluirRepoGithub) {
                try {
                    await githubStorage.deletarRepositorio(projetoExcluindo.github_repo);
                } catch (e) {
                    console.warn('[GitHub Storage] Erro ao deletar repositório', e);
                }
            }
            await excluirProjeto(projetoExcluindo.id);
            setProjetoExcluindo(null);
            setExcluirRepoGithub(false);
        } catch (e) {} finally {
            setProcessando(false);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-6">
                <CabecalhoFuncionalidade
                    titulo="Gestão de Projetos"
                    subtitulo="Crie novos espaços de trabalho para organizar demandas e squads."
                    icone={FolderKanban}
                >
                    {podeCriar && (
                        <button 
                            onClick={handleAbrirCriar}
                            className="h-11 px-6 bg-primary text-primary-foreground rounded-full flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all"
                        >
                            <Plus size={18} strokeWidth={3} />
                            <span>Novo Projeto</span>
                        </button>
                    )}
                </CabecalhoFuncionalidade>

                {erro && <Alerta tipo="erro" mensagem={erro} />}

                {carregando && projetos.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-[200px] bg-card/60 border border-border/40 rounded-3xl" />
                        ))}
                    </div>
                ) : projetos.length === 0 ? (
                    <div className="bg-card border border-border rounded-3xl p-12 text-center">
                        <FolderKanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
                        <h3 className="text-foreground font-black uppercase tracking-widest mb-2">Sem Projetos</h3>
                        <p className="text-muted-foreground text-sm mb-6">Comece criando o primeiro projeto da sua fábrica.</p>
                        {podeCriar && (
                            <button 
                                onClick={handleAbrirCriar}
                                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest"
                            >
                                Criar Primeiro Projeto
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projetos.map((p, index) => (
                            <CardProjeto 
                                key={p.id}
                                projeto={p}
                                index={index}
                                podeVerDocumentos={podeVerDocumentos}
                                podeEditar={podeEditar}
                                podeExcluir={podeExcluir}
                                onVerDocumentos={setProjetoDocs}
                                onEditar={handleAbrirEditar}
                                onExcluir={setProjetoExcluindo}
                            />
                        ))}
                    </div>
                )}
            </div>

            <ModalFormularioProjeto 
                aberto={modalAberto}
                aoFechar={() => setModalAberto(false)}
                projetoEditando={projetoEditando}
                projetoInicial={projetoNoFormulario}
                equipes={equipes}
                onSubmit={onSubmit}
                carregando={carregando}
                processando={processando}
            />

            <ConfirmacaoExclusao
                aberto={!!projetoExcluindo}
                aoFechar={() => { setProjetoExcluindo(null); setExcluirRepoGithub(false); }}
                aoConfirmar={confirmarExclusao}
                titulo="Excluir Projeto Permanentemente"
                descricao="Esta ação excluirá o projeto e TODAS as tarefas vinculadas a ele. Não há como desfazer."
                carregando={carregando || processando}
            >
                {projetoExcluindo?.github_repo && (
                    <div className="flex items-start gap-3 mt-2">
                        <input
                            type="checkbox"
                            disabled={carregando || processando}
                            id="check-excluir-repo"
                            checked={excluirRepoGithub}
                            onChange={(e) => setExcluirRepoGithub(e.target.checked)}
                            className="mt-1 flex-shrink-0 cursor-pointer w-4 h-4 rounded border-border"
                        />
                        <label htmlFor="check-excluir-repo" className="text-xs text-foreground cursor-pointer font-medium leading-relaxed">
                            Excluir permanentemente o repositório GitHub vinculado (<span className="font-bold text-primary">{projetoExcluindo.github_repo}</span>). <br/>
                            <span className="text-destructive font-bold">Aviso:</span> Esta ação apagará todo o código e não pode ser desfeita.
                        </label>
                    </div>
                )}
            </ConfirmacaoExclusao>

            <DocumentosProjetoModal
                projeto={projetoDocs}
                aberto={!!projetoDocs}
                aoFechar={() => setProjetoDocs(null)}
            />
        </>
    );
}
