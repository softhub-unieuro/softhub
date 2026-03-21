import { useState, useEffect } from 'react';
import { Modal } from '@/compartilhado/componentes/Modal';
import { Alerta } from '@/compartilhado/componentes/Alerta';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { githubStorage, ArquivoGithub } from '../servicos/github-storage';
import { logger } from '@/utilitarios/gerenciador-logs';
import { Projeto } from '../hooks/usarProjetos';
import { FolderKanban, FileText, Download, Trash2, UploadCloud, Github, AlertCircle } from 'lucide-react';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { ConfirmacaoExclusao } from '@/compartilhado/componentes/ConfirmacaoExclusao';

interface DocumentosProjetoModalProps {
    projeto: Projeto | null;
    aberto: boolean;
    aoFechar: () => void;
}

export function DocumentosProjetoModal({ projeto, aberto, aoFechar }: DocumentosProjetoModalProps) {
    const [arquivos, setArquivos] = useState<ArquivoGithub[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [fazendoUpload, setFazendoUpload] = useState(false);
    const [arquivoExcluindo, setArquivoExcluindo] = useState<ArquivoGithub | null>(null);

    const podeEditarProjeto = usarPermissaoAcesso('projetos:editar');
    const githubEnabled = !!projeto?.github_repo;

    useEffect(() => {
        if (aberto && projeto?.github_repo) {
            carregarDocumentos();
        } else {
            setArquivos([]);
            setErro(null);
        }
    }, [aberto, projeto]);

    const carregarDocumentos = async () => {
        if (!projeto?.github_repo) return;
        setCarregando(true);
        setErro(null);
        try {
            const docs = await githubStorage.listarDocumentos(projeto.id);
            setArquivos(docs);
        } catch (e: any) {
            setErro(e.message || 'Falha ao carregar documentos do GitHub.');
        } finally {
            setCarregando(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !projeto?.github_repo) return;

        // Limita a 10MB (API do Octokit sem split tem limites, 10-20MB costuma ser o max prático por API síncrona real)
        if (file.size > 10 * 1024 * 1024) {
             setErro('O arquivo é muito grande (Limite de 10MB para upload via Token).');
             return;
        }

        setFazendoUpload(true);
        setErro(null);
        try {
            await githubStorage.fazerUploadDocumento(projeto.id, file);
            logger.sucesso('Documentos', `Arquivo ${file.name} enviado para o GitHub com sucesso.`);
            await carregarDocumentos();
        } catch (err: any) {
            setErro(err.message || 'Falha no upload.');
        } finally {
            setFazendoUpload(false);
            e.target.value = ''; // Reset input
        }
    };

    const confirmarExclusao = async () => {
        if (!arquivoExcluindo || !projeto?.github_repo) return;
        setCarregando(true);
        try {
            await githubStorage.deletarDocumento(projeto.id, arquivoExcluindo.path, arquivoExcluindo.sha);
            logger.sucesso('Documentos', `Documento ${arquivoExcluindo.name} removido do repositório.`);
            await carregarDocumentos();
        } catch (e: any) {
             setErro(e.message || 'Não foi possível remover o documento.');
        } finally {
            setArquivoExcluindo(null);
            setCarregando(false);
        }
    };

    if (!projeto) return null;

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <>
            <Modal aberto={aberto} aoFechar={aoFechar} titulo={`Documentos: ${projeto.nome}`} largura="lg">
                <div className="flex flex-col gap-6 pt-4">
                    
                    {/* Removido alerta de token pois o gerenciamento é via Backend */}

                    {!projeto.github_repo && githubEnabled && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 text-center">
                            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
                            <h3 className="text-foreground font-black uppercase tracking-widest text-[11px] mb-1">Repositório não vinculado</h3>
                            <p className="text-muted-foreground text-xs">Vincule um repositório GitHub nas configurações deste projeto para gerenciar arquivos.</p>
                        </div>
                    )}

                    {projeto.github_repo && githubEnabled && (
                        <>
                            {/* Área de Upload e Infos */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-border rounded-2xl bg-muted/20">
                                <div>
                                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                                        <Github size={16} className="text-muted-foreground" />
                                        {projeto.github_repo}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                        Armazenado em /docs/softhub/
                                    </span>
                                </div>
                                {podeEditarProjeto && (
                                    <div className="shrink-0 relative">
                                        <input 
                                            type="file" 
                                            id="file-upload" 
                                            className="hidden" 
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.png,.zip" 
                                            onChange={handleUpload}
                                            disabled={fazendoUpload || carregando}
                                        />
                                        <label 
                                            htmlFor="file-upload" 
                                            className="h-10 px-4 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {fazendoUpload ? <Carregando tamanho="sm" Centralizar={false} /> : <><UploadCloud size={14} /> Fazer Upload</>}
                                        </label>
                                    </div>
                                )}
                            </div>

                            {erro && <Alerta tipo="erro" mensagem={erro} />}

                            {/* Lista de Arquivos */}
                            <div className="border border-border rounded-2xl bg-card overflow-hidden">
                                {carregando && !fazendoUpload ? (
                                    <div className="p-12 flex justify-center"><Carregando /></div>
                                ) : arquivos.length === 0 ? (
                                    <div className="p-12 flex flex-col items-center justify-center text-center opacity-60">
                                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                            <FileText size={24} className="text-muted-foreground" />
                                        </div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Repositório Vazio</p>
                                        <p className="text-[11px] text-muted-foreground mt-1">Nenhum documento encontrado na pasta docs.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border max-h-[40vh] overflow-y-auto custom-scrollbar">
                                        {arquivos.map((arq) => (
                                            <div key={arq.sha} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors group">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                        <FileText size={16} />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs font-bold text-foreground truncate">{arq.name}</span>
                                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.1em]">
                                                            {formatBytes(arq.size)}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <a 
                                                        href={arq.download_url} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                                        title="Baixar Arquivo via Raw"
                                                    >
                                                        <Download size={14} />
                                                    </a>
                                                    {podeEditarProjeto && (
                                                        <button 
                                                            onClick={() => setArquivoExcluindo(arq)}
                                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                                                            title="Excluir Permanentemente"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {arquivoExcluindo && (
                <ConfirmacaoExclusao
                    aberto={!!arquivoExcluindo}
                    aoFechar={() => setArquivoExcluindo(null)}
                    aoConfirmar={confirmarExclusao}
                    titulo="Excluir Documento"
                    descricao={`Tem certeza que deseja remover permanentemente o arquivo "${arquivoExcluindo?.name}" do repositório no GitHub? O Commit será feito imediatamente.`}
                    carregando={carregando}
                />
            )}
        </>
    );
}
