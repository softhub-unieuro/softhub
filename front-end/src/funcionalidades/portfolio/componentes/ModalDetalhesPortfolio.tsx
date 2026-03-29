import { useState, useEffect } from 'react';
import { Modal } from '@/compartilhado/componentes/Modal';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { api } from '@/compartilhado/servicos/api';
import { servicoGithub } from '@/compartilhado/servicos/github';
import { Github, Figma, BookText, Users, Code2, ExternalLink, Calendar, Info } from 'lucide-react';
import { Avatar } from '@/compartilhado/componentes/Avatar';

import { GITHUB_USUARIO } from '@/utilitarios/constantes';

interface MembroPortfolio {
    id: string;
    nome: string;
    email: string;
    foto_perfil: string | null;
    role: string;
}

interface ProjetoDetalhado {
    id: string;
    nome: string;
    descricao: string;
    github_repo: string | null;
    figma_url: string | null;
    documentacao_url: string | null;
    criado_em: string;
    membros: MembroPortfolio[];
}

interface ModalDetalhesPortfolioProps {
    projetoId: string | null;
    aberto: boolean;
    aoFechar: () => void;
}

export function ModalDetalhesPortfolio({ projetoId, aberto, aoFechar }: ModalDetalhesPortfolioProps) {
    const [projeto, setProjeto] = useState<ProjetoDetalhado | null>(null);
    const [readme, setReadme] = useState<string | null>(null);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        if (aberto && projetoId) {
            buscarDetalhes();
        } else {
            setProjeto(null);
            setReadme(null);
            setErro(null);
        }
    }, [aberto, projetoId]);

    const buscarDetalhes = async () => {
        setCarregando(true);
        setErro(null);
        try {
            const res = await api.get(`/api/projetos/publico/${projetoId}`);
            setProjeto(res.data);

            // Tenta buscar o README do GitHub se houver repositório
            if (res.data.github_repo) {
                try {
                    const texto = await servicoGithub.buscarReadmeRaw(GITHUB_USUARIO, res.data.github_repo);
                    if (texto) {
                        setReadme(texto);
                    }
                } catch (e) {
                    console.warn('Não foi possível carregar o README via GitHub Raw.');
                }
            }
        } catch (e: any) {
            setErro(e.response?.data?.erro || 'Erro ao carregar detalhes do projeto.');
        } finally {
            setCarregando(false);
        }
    };

    return (
        <Modal 
            aberto={aberto} 
            aoFechar={aoFechar} 
            titulo={projeto?.nome || 'Detalhes do Projeto'} 
            largura="lg"
        >
            {carregando ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <Carregando tamanho="lg" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Sincronizando Artefatos...</p>
                </div>
            ) : erro ? (
                <div className="py-20 text-center space-y-4">
                    <p className="text-destructive font-bold">{erro}</p>
                    <button onClick={buscarDetalhes} className="text-xs font-black uppercase tracking-widest text-primary underline">Tentar novamente</button>
                </div>
            ) : projeto && (
                <div className="flex flex-col gap-8 animar-entrada pb-6">
                    {/* Hero do Modal */}
                    <div className="bg-slate-950 rounded-[32px] p-8 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Code2 size={120} strokeWidth={1} />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/20 rounded-full text-[9px] font-black uppercase tracking-widest">Case de Sucesso</span>
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-white/40 uppercase tracking-widest">
                                    <Calendar size={12} />
                                    {new Date(projeto.criado_em).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                </div>
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tighter leading-none">{projeto.nome}</h2>
                            <p className="text-sm text-white/60 font-medium max-w-xl leading-relaxed">
                                {projeto.descricao || 'Este projeto representa o ápice da engenharia aplicada na Fábrica de Software Unieuro.'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Coluna Principal: README e Links */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* Links de Acesso */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {projeto.github_repo && (
                                    <a 
                                        href={`https://github.com/${GITHUB_USUARIO}/${projeto.github_repo}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="flex items-center gap-4 p-5 bg-white border border-border/10 rounded-3xl hover:border-primary/30 transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Github size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Repositório</h4>
                                            <p className="text-xs font-bold text-slate-900 truncate">{GITHUB_USUARIO}/{projeto.github_repo}</p>
                                        </div>
                                        <ExternalLink size={14} className="text-slate-300 group-hover:text-primary transition-colors" />
                                    </a>
                                )}

                                {projeto.figma_url && (
                                    <a 
                                        href={projeto.figma_url} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="flex items-center gap-4 p-5 bg-white border border-border/10 rounded-3xl hover:border-primary/30 transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-indigo-500 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Figma size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Design System</h4>
                                            <p className="text-xs font-bold text-slate-900 truncate">Protótipo via Figma</p>
                                        </div>
                                        <ExternalLink size={14} className="text-slate-300 group-hover:text-primary transition-colors" />
                                    </a>
                                )}
                            </div>

                            {/* Embed do Figma ou README */}
                            {projeto.figma_url && (
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-1">
                                        <Figma size={14} /> Design & Interface
                                    </h4>
                                    <div className="aspect-video w-full bg-slate-100 rounded-[32px] overflow-hidden border border-border/10">
                                        <iframe 
                                            className="w-full h-full border-0"
                                            src={`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(projeto.figma_url)}`}
                                            allowFullScreen
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Conteúdo Técnico (README) */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-1">
                                    <BookText size={14} /> Documentação Técnica (README.md)
                                </h4>
                                <div className="bg-slate-50 border border-border/10 rounded-[32px] p-8 max-h-[600px] overflow-y-auto custom-scrollbar">
                                    {readme ? (
                                        <div className="prose prose-slate max-w-none">
                                            <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans selection:bg-primary/20">
                                                {readme}
                                            </pre>
                                        </div>
                                    ) : (
                                        <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
                                            <Info size={32} className="text-slate-200" />
                                            <p className="text-xs text-slate-400 font-medium">A documentação completa pode ser acessada diretamente no repositório GitHub.</p>
                                            {projeto.github_repo && (
                                                <a 
                                                    href={`https://github.com/${GITHUB_USUARIO}/${projeto.github_repo}`} 
                                                    target="_blank" 
                                                    className="px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    Abrir GitHub
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Lateral: Equipe e Stats */}
                        <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-0">
                            <div className="bg-white border border-border/10 rounded-[32px] p-8 space-y-8 shadow-xl shadow-slate-200/20">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                        <Users size={14} /> Time de Desenvolvimento
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        {projeto.membros && projeto.membros.length > 0 ? (
                                            projeto.membros.map(membro => (
                                                <div key={membro.id} className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-white hover:border-primary/20 transition-all">
                                                    <Avatar 
                                                        nome={membro.nome} 
                                                        fotoPerfil={membro.foto_perfil} 
                                                        tamanho="sm"
                                                        className="ring-2 ring-white"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-black text-slate-900 truncate">{membro.nome}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{membro.role.replace('_', ' ')}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-[10px] text-slate-400 italic font-medium px-2">Histórico de membros não disponível.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100" />

                                <div className="space-y-4 text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                                        Este projeto foi desenvolvido como parte do currículo prático da Fábrica de Software Unieuro.
                                    </p>
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Produto Validado</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}
