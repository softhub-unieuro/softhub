import { memo, useState, useCallback } from 'react';
import { Github, Code2, Globe, Boxes, ChevronRight, GraduationCap, Cpu, Layers, MousePointer2, Users } from 'lucide-react';
import { usarPortfolio, usarEquipe } from '../hooks/usarPortfolio';
import { Skeleton } from '@/compartilhado/componentes/Skeleton';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { Link } from 'react-router';
import { GITHUB_USUARIO } from '@/utilitarios/constantes';
import { ModalDetalhesPortfolio } from './ModalDetalhesPortfolio';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import logoUnieuro from '@/assets/logo-unieuro-branca.png';

/**
 * Landing Page do Portfolio Público da Fábrica de Software.
 * Exibe projetos desenvolvidos para visitantes externos sem necessidade de login.
 * Design Refinado: Equilíbrio entre Rigor Universitário e Agilidade Tech.
 */
export const PaginaPortfolio = memo(() => {
    const { projetos, carregando: carregandoProjetos } = usarPortfolio();
    const { total: totalEquipe, membros, carregando: carregandoEquipe } = usarEquipe();
    const { estaAutenticado } = usarAutenticacao();
    const [projetoSelecionado, setProjetoSelecionado] = useState<string | null>(null);

    const handleAbrirDetalhes = useCallback((id: string) => {
        setProjetoSelecionado(id);
    }, []);

    const handleFecharDetalhes = useCallback(() => {
        setProjetoSelecionado(null);
    }, []);

    return (
        <div className="min-h-screen bg-[#000a12] text-slate-100 selection:bg-red-500/20 selection:text-red-500 scroll-smooth">
            
            {/* 🎯 NAVIGATION */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-3rem)] max-w-6xl">
                <header className="px-8 py-5 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-black/60">
                    <div className="flex items-center gap-5">
                        <img src={logoUnieuro} alt="Unieuro" className="w-10 h-10 object-contain" />
                        <div className="w-[1px] h-8 bg-white/10 mx-1 hidden sm:block" />
                        <div className="flex flex-col">
                            <span className="text-sm font-black tracking-tight uppercase leading-none text-white italic">Fábrica de Software</span>
                            <span className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.3em] leading-none mt-1.5">Unieuro Labs</span>
                        </div>
                    </div>
                    
                    <nav className="hidden md:flex items-center gap-10">
                        <a href="#pilares" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Educação</a>
                        <a href="#projetos" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Portfólio</a>
                        <Link 
                            to={estaAutenticado ? "/app/dashboard" : "/login"} 
                            className="px-8 py-2.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-500 hover:scale-[1.05] active:scale-[0.98] transition-all"
                        >
                            {estaAutenticado ? "Acessar Dash" : "Acesso Interno"}
                        </Link>
                    </nav>

                    <Link to="/login" className="md:hidden p-3 bg-white/5 rounded-full text-white">
                        <GraduationCap size={20} />
                    </Link>
                </header>
            </div>

            {/* 🚀 HERO SECTION */}
            <section className="relative pt-56 pb-40 overflow-hidden flex flex-col items-center">
                <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_#2563eb_0%,transparent_70%)] opacity-[0.08] scale-150 blur-3xl" />
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`,
                        backgroundSize: '48px 48px'
                    }} />
                </div>

                <div className="container mx-auto px-6 text-center space-y-12">
                    <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-600/10 border border-blue-500/20 rounded-full text-blue-500 text-[10px] font-black uppercase tracking-[0.3em] shadow-lg shadow-blue-600/5">
                        <Cpu size={12} className="animate-pulse" /> Formando o Futuro da Tecnologia
                    </div>
                    
                    <h1 className="text-6xl md:text-8xl lg:text-[110px] font-black tracking-tighter text-white leading-[0.85] max-w-5xl mx-auto">
                        Conhecimento que vira <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-400 to-amber-500">soluções reais.</span>
                    </h1>
                    
                    <p className="text-lg md:text-2xl text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed">
                        Transformamos o aprendizado acadêmico em produtos digitais de alto desempenho. Aqui, alunos de Engenharia e Ciência da Computação operam com o rigor de uma fábrica moderna.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-8">
                        <a href="#projetos" className="group px-12 py-6 bg-white text-slate-950 rounded-full font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/10 hover:shadow-blue-600/30 hover:-translate-y-1 transition-all flex items-center gap-3">
                            Explorar Portfólio <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </a>
                        
                        <div className="flex items-center gap-6 px-8 py-5 bg-white/[0.02] border border-white/5 rounded-full backdrop-blur-xl">
                            <div className="flex -space-x-4">
                                {carregandoEquipe ? (
                                    [1, 2, 3].map(i => <div key={i} className="w-12 h-12 rounded-full bg-white/10 animate-pulse" />)
                                ) : (
                                    membros.slice(0, 4).map(m => (
                                        <Avatar key={m.id} nome={m.nome} fotoPerfil={m.foto_perfil} tamanho="lg" className="border-4 border-[#000a12]" />
                                    ))
                                )}
                            </div>
                            <div className="h-10 w-[1px] bg-white/10 mx-1" />
                            <div className="flex flex-col items-start leading-tight text-left">
                                <span className="text-base font-black text-white tracking-tighter uppercase">{totalEquipe} Alunos</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Capacitados</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 🎓 PILARES SECTION */}
            <section id="pilares" className="py-40 bg-white/[0.01] border-y border-white/5 relative">
                <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-16">
                    <div className="space-y-6 group">
                        <div className="w-16 h-16 bg-blue-600/10 rounded-3xl flex items-center justify-center border border-blue-600/20 group-hover:bg-blue-600 transition-all duration-700">
                            <GraduationCap size={32} className="text-blue-500 group-hover:text-white" />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Rigor Acadêmico</h3>
                        <p className="text-slate-500 font-medium leading-relaxed group-hover:text-slate-300 transition-colors">
                            Fundamentação teórica aplicada diretamente na prática. Nossos processos seguem as melhores normas de engenharia do mercado.
                        </p>
                    </div>
                    
                    <div className="space-y-6 group">
                        <div className="w-16 h-16 bg-blue-600/10 rounded-3xl flex items-center justify-center border border-blue-600/20 group-hover:bg-blue-600 transition-all duration-700">
                            <Layers size={32} className="text-blue-500 group-hover:text-white" />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Estágio de Elite</h3>
                        <p className="text-slate-500 font-medium leading-relaxed group-hover:text-slate-300 transition-colors">
                            Nossos membros operam como profissionais de mercado, dominando stacks modernas como React 19, Hono e Cloudflare.
                        </p>
                    </div>

                    <div className="space-y-6 group">
                        <div className="w-16 h-16 bg-blue-600/10 rounded-3xl flex items-center justify-center border border-blue-600/20 group-hover:bg-blue-600 transition-all duration-700">
                            <MousePointer2 size={32} className="text-blue-500 group-hover:text-white" />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Impacto Digital</h3>
                        <p className="text-slate-500 font-medium leading-relaxed group-hover:text-slate-300 transition-colors">
                            Sistemas publicados que resolvem problemas reais da comunidade acadêmica Unieuro e de parceiros locais.
                        </p>
                    </div>
                </div>
            </section>

            {/* 🖼️ PROJECTS GALLERY */}
            <section id="projetos" className="relative py-40">
                <div className="container mx-auto px-6 space-y-24">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                        <div className="space-y-5">
                            <div className="flex items-center gap-4 text-blue-500 uppercase font-black tracking-widest text-xs">
                                <div className="w-2 h-8 bg-blue-600 rounded-full" />
                                Vitrine de Soluções
                            </div>
                            <h2 className="text-5xl md:text-6xl font-[900] tracking-tighter text-white uppercase italic">Impacto em Produção</h2>
                            <p className="text-slate-500 max-w-lg text-lg font-medium">Arquitetura de microsserviços e interfaces de alto desempenho.</p>
                        </div>
                        <div className="flex items-center gap-4 px-8 py-4 bg-white/[0.03] border border-white/10 rounded-3xl backdrop-blur-sm">
                            <Boxes size={20} className="text-blue-500" />
                            <span className="text-[12px] font-black uppercase tracking-widest text-white">{projetos.length} Projetos Ativos</span>
                        </div>
                    </div>

                    {carregandoProjetos ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white/5 border border-white/10 rounded-[3rem] p-10 space-y-8 animate-pulse">
                                    <Skeleton className="h-64 w-full rounded-2xl bg-white/5" />
                                    <Skeleton className="h-8 w-3/4 bg-white/10" />
                                    <Skeleton className="h-20 w-full bg-white/5" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                            {projetos.map((p) => (
                                <div key={p.id} onClick={() => handleAbrirDetalhes(p.id)} className="group cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-blue-600/30 rounded-[3rem] overflow-hidden transition-all duration-700 hover:-translate-y-4 shadow-2xl shadow-black/80">
                                    <div className="aspect-[16/11] bg-slate-900/50 flex items-center justify-center relative">
                                        <Code2 size={72} className="text-white opacity-10 group-hover:scale-125 group-hover:text-blue-500 transition-all duration-1000" />
                                        <div className="absolute top-8 right-8 px-4 py-2 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Live Proj</div>
                                    </div>
                                    <div className="p-10 pb-12 space-y-6 text-left">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-3xl font-black text-white group-hover:text-blue-500 transition-colors uppercase italic tracking-tighter leading-none">{p.nome}</h3>
                                            {p.github_repo && <Github size={18} className="text-slate-600 hover:text-white transition-all" />}
                                        </div>
                                        <p className="text-[14px] text-slate-500 font-medium line-clamp-2 leading-relaxed h-[44px]">
                                            {p.descricao || 'Protótipo de alta fidelidade desenvolvido com foco em performance bruta.'}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-1 bg-blue-600/20 group-hover:w-16 transition-all duration-700" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-blue-400">Software Labs</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* 👥 REAL TEAM SECTION - MOSAIC OF AVATARS */}
            <section id="equipe" className="py-40 relative">
                <div className="absolute inset-0 bg-blue-600/[0.01] -z-10" />
                <div className="container mx-auto px-6 space-y-20">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="space-y-4 text-center md:text-left">
                            <div className="inline-flex items-center gap-3 text-blue-500 font-black tracking-[0.3em] text-[10px] uppercase bg-blue-600/10 px-4 py-2 rounded-full">
                                <Users size={12} /> Capital Humano Real
                            </div>
                            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">Nossos <span className="text-blue-600">Talentos.</span></h2>
                            <p className="text-lg text-slate-500 font-medium max-w-xl">Membros atuais que operam a produtividade da Fábrica de Software neste semestre.</p>
                        </div>
                        <div className="flex flex-col items-center md:items-end">
                            <span className="text-8xl font-black text-white leading-none tracking-tighter">{totalEquipe}</span>
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-[0.5em] mt-2">Membros Ativos</span>
                        </div>
                    </div>

                    <div className="bg-white/[0.01] border border-white/5 rounded-[4rem] p-12 lg:p-20 overflow-hidden relative group">
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-8 lg:gap-12 opacity-80 group-hover:opacity-100 transition-all duration-700">
                            {carregandoEquipe ? (
                                Array.from({ length: 20 }).map((_, i) => <div key={i} className="aspect-square bg-white/5 rounded-3xl animate-pulse" />)
                            ) : (
                                membros.map(m => (
                                    <div key={m.id} className="flex flex-col items-center gap-4 group/membro">
                                        <Avatar nome={m.nome} fotoPerfil={m.foto_perfil} tamanho="lg" className="hover:scale-110 transition-all duration-500 hover:rotate-6 shadow-2xl" />
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-center truncate w-full group-hover/membro:text-white transition-colors">
                                            {m.nome.split(' ')[0]}
                                        </span>
                                    </div>
                                ))
                             )}
                        </div>
                        
                        {/* Background Decoration */}
                        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
                    </div>
                </div>
            </section>

            {/* 🏁 FOOTER */}
            <footer className="relative py-40 border-t border-white/5 bg-[#000408]">
                <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20">
                    <div className="lg:col-span-2 space-y-10 text-left">
                        <div className="flex items-center gap-5">
                            <img src={logoUnieuro} alt="Unieuro" className="w-12 h-12 object-contain" />
                            <div className="flex flex-col">
                                <span className="text-2xl font-black tracking-tighter text-white uppercase italic leading-none">Fábrica de Software</span>
                                <span className="text-[12px] font-bold text-blue-600 uppercase tracking-[0.4em] mt-2">Unieuro Brasília</span>
                            </div>
                        </div>
                        <p className="text-[15px] text-slate-500 max-w-sm font-medium leading-relaxed">
                            A união entre o ensino de excelência e a prática profissional. Desenvolvido por talentos do Centro Universitário Unieuro.
                        </p>
                    </div>
                    <div className="space-y-8 text-left">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-white/40">Ecossistema</h4>
                        <ul className="space-y-5">
                            <li><a href="https://unieuro.edu.br" className="text-sm font-bold text-slate-400 hover:text-blue-500 transition-colors">Portal Unieuro</a></li>
                            <li><a href={`https://github.com/${GITHUB_USUARIO}`} className="text-sm font-bold text-slate-400 hover:text-blue-500 transition-colors">Github Lab</a></li>
                            <li><Link to="/login" className="text-sm font-bold text-slate-400 hover:text-blue-500 transition-colors">Área do Membro</Link></li>
                        </ul>
                    </div>
                    <div className="space-y-8 text-left">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-white/40">Contato</h4>
                        <div className="flex gap-5">
                            <a href="#" className="w-14 h-14 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600/20 text-slate-400 hover:text-white transition-all shadow-xl">
                                <Globe size={24} />
                            </a>
                            <a href="#" className="w-14 h-14 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600/20 text-slate-400 hover:text-white transition-all shadow-xl">
                                <Github size={24} />
                            </a>
                        </div>
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mt-4">
                            © {new Date().getFullYear()} — UNIEURO LABS <br />
                            BRASÍLIA, DF
                        </p>
                    </div>
                </div>
            </footer >

            <ModalDetalhesPortfolio 
                projetoId={projetoSelecionado}
                aberto={!!projetoSelecionado}
                aoFechar={handleFecharDetalhes}
            />
        </div>
    );
});

export default PaginaPortfolio;
