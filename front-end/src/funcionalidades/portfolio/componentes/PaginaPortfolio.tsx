import { memo, useState, useCallback } from 'react';
import { ExternalLink, Github, Code2, Rocket, Globe, Boxes, ChevronRight, Figma, BookText, Sparkles } from 'lucide-react';
import { usarPortfolio } from '../hooks/usarPortfolio';
import { Skeleton } from '@/compartilhado/componentes/Skeleton';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { Link } from 'react-router';
import { pluralizar } from '@/utilitarios/formatadores';
import { GITHUB_USUARIO } from '@/utilitarios/constantes';
import { ModalDetalhesPortfolio } from './ModalDetalhesPortfolio';

/**
 * Landing Page do Portfolio Público da Fábrica de Software.
 * Exibe projetos desenvolvidos para visitantes externos sem necessidade de login.
 */
export const PaginaPortfolio = memo(() => {
    const { projetos, carregando, erro } = usarPortfolio();
    const { estaAutenticado } = usarAutenticacao();
    const [projetoSelecionado, setProjetoSelecionado] = useState<string | null>(null);

    const handleAbrirDetalhes = useCallback((id: string) => {
        setProjetoSelecionado(id);
    }, []);

    const handleFecharDetalhes = useCallback(() => {
        setProjetoSelecionado(null);
    }, []);

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-primary/20 selection:text-primary scroll-smooth">
            
            {/* ═══════════════════════════════════════════════════ */}
            {/* 🎯 NAVIGATION - FLOATING BLUR                      */}
            {/* ═══════════════════════════════════════════════════ */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-3rem)] max-w-5xl">
                <header className="px-6 py-4 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-black/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <Rocket className="text-white" size={20} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black tracking-tight uppercase leading-none text-white">SoftHub</span>
                            <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] leading-none mt-1">Portfolio</span>
                        </div>
                    </div>
                    
                    <nav className="hidden md:flex items-center gap-8">
                        <a href="#projetos" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Galeria</a>
                        <a href="https://unieuro.edu.br" target="_blank" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Unieuro</a>
                        <div className="w-[1px] h-4 bg-white/10" />
                        <Link 
                            to={estaAutenticado ? "/app/dashboard" : "/login"} 
                            className="px-6 py-2 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.05] active:scale-[0.98] transition-all"
                        >
                            {estaAutenticado ? "Dashboard" : "Acesso Restrito"}
                        </Link>
                    </nav>

                    <Link to="/login" className="md:hidden p-2.5 bg-white/5 rounded-full text-white">
                        <Globe size={18} />
                    </Link>
                </header>
            </div>

            {/* ═══════════════════════════════════════════════════ */}
            {/* 🚀 HERO SECTION - TECH GRID BACKGROUND            */}
            {/* ═══════════════════════════════════════════════════ */}
            <section className="relative pt-48 pb-32 overflow-hidden flex flex-col items-center">
                {/* Geometria de Fundo */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,transparent_70%)] opacity-[0.07] scale-150 blur-3xl" />
                    <div className="absolute inset-0 opacity-[0.04]" style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }} />
                </div>

                <div className="container mx-auto px-6 text-center space-y-10">
                    <div className="inline-flex items-center gap-2.5 px-5 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Sparkles size={12} className="animate-pulse" /> Engenharia de Software Unieuro
                    </div>
                    
                    <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white leading-[0.85] max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        Onde código vira <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-indigo-500">experiência.</span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed opacity-0 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-forwards" style={{ animationDelay: '300ms' }}>
                        Uma vitrine da inovação acadêmica. Desenvolvemos soluções completas, escaláveis e focadas em resolver problemas do ecossistema real da Fábrica de Software.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6 opacity-0 animate-in fade-in slide-in-from-bottom-10 duration-1000 fill-mode-forwards" style={{ animationDelay: '500ms' }}>
                        <a href="#projetos" className="group px-10 py-5 bg-white text-slate-950 rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-white/10 hover:shadow-white/20 hover:-translate-y-1 transition-all flex items-center gap-2">
                            Explorar Projetos <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </a>
                        
                        <div className="flex items-center gap-4 px-6 py-4 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-lg">
                            <div className="flex -space-x-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-[#020617] overflow-hidden grayscale hover:grayscale-0 transition-all cursor-pointer">
                                        <img src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=dev${i}`} alt="Dev" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                            <div className="h-8 w-[1px] bg-white/10 mx-1" />
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-sm font-black text-white">+30 MEMBROS</span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">EM ATIVIDADE</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* 🖼️ PROJECTS GALLERY - BENTO-ISH GRID               */}
            {/* ═══════════════════════════════════════════════════ */}
            <section id="projetos" className="relative py-32">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                
                <div className="container mx-auto px-6 space-y-20">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-primary rounded-full" />
                                <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">Showcase Tecnológico</h2>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white">Produtos em Produção</h2>
                            <p className="text-slate-500 max-w-md font-medium">Arquitetura de microsserviços e interfaces táteis de alta performance.</p>
                        </div>
                        <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl">
                            <Boxes size={16} className="text-primary" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-white">{projetos.length} {pluralizar(projetos.length, 'Projeto Ativo', 'Projetos Ativos')}</span>
                        </div>
                    </div>

                    {carregando ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                                    <Skeleton className="h-48 w-full rounded-2xl bg-white/5" />
                                    <div className="space-y-4">
                                        <Skeleton className="h-6 w-3/4 bg-white/5" />
                                        <Skeleton className="h-20 w-full bg-white/5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : erro ? (
                        <div className="py-24 text-center space-y-6 bg-white/5 rounded-[3rem] border border-white/10">
                            <p className="text-rose-400 font-bold uppercase tracking-widest text-sm">{erro}</p>
                            <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white/10 rounded-full text-xs font-black uppercase tracking-[0.2em] text-white hover:bg-white/20 transition-all">Tentar novamente</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {projetos.map((p, idx) => (
                                <div 
                                    key={p.id} 
                                    onClick={() => handleAbrirDetalhes(p.id)}
                                    className="group relative cursor-pointer bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-primary/40 rounded-[2.5rem] overflow-hidden transition-all duration-700 hover:-translate-y-2 opacity-0 animate-in fade-in zoom-in-95 duration-1000 fill-mode-forwards shadow-2xl shadow-black/40"
                                    style={{ animationDelay: `${idx * 150}ms` }}
                                >
                                    {/* Thumbnail / Icon Area */}
                                    <div className="aspect-[16/10] bg-[#0f172a] flex items-center justify-center relative group-hover:bg-primary/5 transition-colors overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] to-transparent opacity-60" />
                                        <Code2 size={64} strokeWidth={1} className="text-white opacity-20 group-hover:scale-110 group-hover:text-primary transition-all duration-1000" />
                                        
                                        {/* Badges Flutuantes */}
                                        <div className="absolute top-6 right-6 flex flex-col gap-2 scale-90 group-hover:scale-100 transition-transform">
                                            <div className="px-3 py-1.5 bg-primary/90 backdrop-blur-md text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                Live
                                            </div>
                                            <div className="px-3 py-1.5 bg-background/80 backdrop-blur-md text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5">
                                                {idx % 2 === 0 ? 'Vite' : 'Cloudflare'}
                                            </div>
                                        </div>

                                        {/* Overlay Hover */}
                                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex items-center justify-center">
                                            <div className="p-4 bg-white text-[#020617] rounded-full scale-0 group-hover:scale-100 transition-all duration-500 delay-100 shadow-2xl">
                                                <ExternalLink size={24} strokeWidth={3} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detalhes do Card */}
                                    <div className="p-8 pb-10 space-y-5">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-2xl font-black text-white group-hover:text-primary transition-colors tracking-tight">{p.nome}</h3>
                                            <div className="flex items-center gap-2">
                                                {p.github_repo && <Github size={14} className="text-slate-500 hover:text-white transition-colors" />}
                                            </div>
                                        </div>
                                        
                                        <p className="text-[13px] text-slate-400 font-medium line-clamp-2 leading-relaxed h-[42px] group-hover:text-slate-200 transition-colors">
                                            {p.descricao || 'Arquitetura de microsserviços com foco em escalabilidade global e experiência do usuário tátil.'}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-2 pt-2">
                                            <span className="text-[8px] font-black uppercase tracking-widest border border-white/10 px-3 py-1.5 rounded-full text-slate-500 group-hover:text-slate-300 transition-colors">Software Architecture</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest border border-white/10 px-3 py-1.5 rounded-full text-slate-500 group-hover:text-slate-300 transition-colors">Hono API</span>
                                        </div>
                                    </div>

                                    {/* Border de Brilho no Hover */}
                                    <div className="absolute inset-x-0 bottom-0 h-[3px] bg-primary scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-700" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* 🏁 FOOTER - MINIMAL DARK TECH                      */}
            {/* ═══════════════════════════════════════════════════ */}
            <footer className="relative py-32 border-t border-white/5 bg-[#010410]">
                <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                                <Rocket size={24} className="text-primary" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-black tracking-tight text-white uppercase">SoftHub v3.0</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unieuro Fábrica de Software</span>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 max-w-sm font-medium leading-relaxed">
                            Desenvolvendo o futuro da tecnologia acadêmica. Sistemas construídos com paixão, rigor técnico e excelência em design.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Navegação</h4>
                        <ul className="space-y-4">
                            <li><a href="#projetos" className="text-sm font-medium text-slate-400 hover:text-primary transition-colors">Galeria</a></li>
                            <li><a href="https://unieuro.edu.br" className="text-sm font-medium text-slate-400 hover:text-primary transition-colors">Unieuro Institucional</a></li>
                            <li><Link to="/login" className="text-sm font-medium text-slate-400 hover:text-primary transition-colors">Acesso Administrativo</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Ecossistema</h4>
                        <div className="flex gap-4">
                            <a href={`https://github.com/${GITHUB_USUARIO}`} target="_blank" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/40 text-slate-400 hover:text-white transition-all shadow-xl">
                                <Github size={20} />
                            </a>
                            <a href="https://unieuro.edu.br" target="_blank" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/40 text-slate-400 hover:text-white transition-all shadow-xl">
                                <Globe size={20} />
                            </a>
                        </div>
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest max-w-[200px]">
                            BRASÍLIA, DF — BRASIL © {new Date().getFullYear()} SOFTHUB LABS
                        </p>
                    </div>
                </div>
            </footer >

            {/* Modal de Detalhes Dinâmico */}
            <ModalDetalhesPortfolio 
                projetoId={projetoSelecionado}
                aberto={!!projetoSelecionado}
                aoFechar={handleFecharDetalhes}
            />
        </div>
    );
});

export default PaginaPortfolio;
