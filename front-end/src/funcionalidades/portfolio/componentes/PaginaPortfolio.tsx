import { memo, useState, useCallback } from 'react';
import { Github, Code2, Globe, Boxes, ChevronRight, GraduationCap, Cpu, Layers, MousePointer2, Users } from 'lucide-react';
import { usarPortfolio, usarEquipe } from '../hooks/usarPortfolio';
import { Skeleton } from '@/compartilhado/componentes/Skeleton';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { Link } from 'react-router';
import { GITHUB_USUARIO } from '@/utilitarios/constantes';
import { ModalDetalhesPortfolio } from './ModalDetalhesPortfolio';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import logoUnieuro from '@/assets/logo-unieuro.png';
import { formatarNomeCurto } from '@/utilitarios/formatadores';

/**
 * Landing Page do Portfolio Público da Fábrica de Software.
 * Exibe projetos desenvolvidos para visitantes externos sem necessidade de login.
 * Design Refinado: Modo Claro Institucional.
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
        <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-600 scroll-smooth">
            
            {/* 🎯 NAVIGATION */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-3rem)] max-w-6xl">
                <header className="px-8 py-4 bg-white/70 backdrop-blur-2xl border border-slate-200/60 rounded-3xl flex items-center justify-between shadow-xl shadow-slate-200/40">
                    <div className="flex items-center gap-4">
                        <img src={logoUnieuro} alt="Unieuro" className="w-9 h-9 object-contain" />
                        <div className="w-[1px] h-6 bg-slate-200 mx-1 hidden sm:block" />
                        <div className="flex flex-col">
                            <span className="text-[13px] font-black tracking-tighter uppercase leading-none text-slate-900">Fábrica de Software</span>
                            <span className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.2em] leading-none mt-1.5">Unieuro</span>
                        </div>
                    </div>
                    
                    <nav className="hidden md:flex items-center gap-10">
                        <a href="#projetos" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors">Projetos</a>
                        <a href="#equipe" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors">Talentos</a>
                        <Link 
                            to={estaAutenticado ? "/app/dashboard" : "/login"} 
                            className="px-8 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-600/20 active:scale-[0.98] transition-all"
                        >
                            {estaAutenticado ? "Dashboard" : "Acesso Interno"}
                        </Link>
                    </nav>

                    <Link to="/login" className="md:hidden p-3 bg-slate-100 rounded-full text-slate-600">
                        <GraduationCap size={20} />
                    </Link>
                </header>
            </div>

            {/* 🚀 HERO SECTION */}
            <section className="relative pt-64 pb-32 overflow-hidden flex flex-col items-center">
                <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_#3b82f6_0%,transparent_70%)] opacity-[0.05] scale-150 blur-3xl" />
                    <div className="absolute inset-0 opacity-[0.4]" style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }} />
                </div>

                <div className="container mx-auto px-6 text-center space-y-12">
                    <div className="inline-flex items-center gap-3 px-5 py-2 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-[9px] font-black uppercase tracking-[0.3em] shadow-sm">
                        <Cpu size={12} className="animate-pulse" /> Formando o Futuro da Tecnologia
                    </div>
                    
                    <h1 className="text-6xl md:text-8xl lg:text-[100px] font-black tracking-tighter text-slate-900 leading-[0.85] max-w-5xl mx-auto">
                        Transformando teoria <br />
                        <span className="text-blue-600">em soluções reais.</span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-slate-500 max-w-3xl mx-auto font-medium leading-relaxed">
                        Transformamos o aprendizado acadêmico em produtos digitais reais. Alunos do Unieuro operando com o rigor e a agilidade de uma moderna Fábrica de Software.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-8">
                        <a href="#projetos" className="group px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/10 hover:bg-blue-600 hover:shadow-blue-600/30 hover:-translate-y-1 transition-all flex items-center gap-3">
                            Ver Projetos <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </a>
                        
                        <div className="flex items-center gap-6 px-7 py-4 bg-white border border-slate-200 rounded-3xl shadow-sm">
                            <div className="flex -space-x-3">
                                {carregandoEquipe ? (
                                    [1, 2, 3].map(i => <div key={i} className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />)
                                ) : (
                                    membros.slice(0, 4).map(m => (
                                        <Avatar key={m.id} nome={m.nome} fotoPerfil={m.foto_perfil} tamanho="md" className="border-4 border-white !rounded-xl" />
                                    ))
                                )}
                            </div>
                            <div className="h-8 w-[1px] bg-slate-200 mx-1" />
                            <div className="flex flex-col items-start leading-tight text-left">
                                <span className="text-sm font-black text-slate-950 tracking-tight uppercase">{totalEquipe} Talentos</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Ativos no semestre</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 🎓 PILARES SECTION */}
            <section id="pilares" className="py-32 border-y border-slate-100 bg-slate-50/50">
                <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all group">
                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-all duration-500">
                            <GraduationCap size={28} className="text-blue-600 group-hover:text-white" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">Rigor Acadêmico</h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            Fundamentação teórica aplicada. Nossos processos seguem as melhores práticas da engenharia de software mundial.
                        </p>
                    </div>
                    
                    <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all group">
                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-all duration-500">
                            <Layers size={28} className="text-blue-600 group-hover:text-white" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">Stack Moderna</h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            Operamos com stacks de elite: React, Cloudflare e AI, preparando o aluno para os desafios reais do mercado.
                        </p>
                    </div>

                    <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all group">
                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-all duration-500">
                            <MousePointer2 size={28} className="text-blue-600 group-hover:text-white" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">Foco em Produto</h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            Não apenas código, mas soluções. Sistemas que resolvem problemas da comunidade acadêmica e de parceiros.
                        </p>
                    </div>
                </div>
            </section>

            {/* 🖼️ PROJECTS GALLERY */}
            <section id="projetos" className="py-40">
                <div className="container mx-auto px-6 space-y-24">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-blue-600 uppercase font-black tracking-widest text-[10px]">
                                <div className="w-8 h-[2px] bg-blue-600 rounded-full" />
                                Vitrine de Soluções
                            </div>
                            <h2 className="text-5xl md:text-6xl font-[900] tracking-tighter text-slate-900 uppercase leading-none">Projetos em <span className="text-blue-600">Produção.</span></h2>
                            <p className="text-slate-500 max-w-md text-lg font-medium">Arquitetura robusta e interfaces centradas no usuário.</p>
                        </div>
                        <div className="flex items-center gap-3 px-6 py-3 bg-slate-100 rounded-2xl">
                            <Boxes size={18} className="text-slate-400" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">{projetos.length} Projetos Ativos</span>
                        </div>
                    </div>

                    {carregandoProjetos ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-slate-50 border border-slate-200 rounded-[3rem] p-10 space-y-6 animate-pulse">
                                    <Skeleton className="h-56 w-full rounded-3xl bg-slate-200/50" />
                                    <Skeleton className="h-6 w-3/4 bg-slate-200" />
                                    <Skeleton className="h-16 w-full bg-slate-200/50" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {projetos.map((p) => (
                                <div key={p.id} onClick={() => handleAbrirDetalhes(p.id)} className="group cursor-pointer bg-white border border-slate-200 hover:border-blue-600/30 rounded-[3rem] overflow-hidden transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:shadow-slate-200/50">
                                    <div className="aspect-[16/10] bg-slate-100 flex items-center justify-center relative overflow-hidden">
                                        <Code2 size={64} className="text-slate-300 group-hover:scale-125 group-hover:text-blue-600/20 transition-all duration-700" />
                                        <div className="absolute top-6 right-6 px-4 py-1.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">Ativo</div>
                                    </div>
                                    <div className="p-10 space-y-6 text-left">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight leading-none">{p.nome}</h3>
                                            {p.github_repo && <Github size={18} className="text-slate-300 group-hover:text-slate-900 transition-colors" />}
                                        </div>
                                        <p className="text-[13px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                                            {p.descricao || 'Protótipo de alta fidelidade desenvolvido com foco em performance e escalabilidade.'}
                                        </p>
                                        <div className="flex items-center gap-3 pt-2">
                                            <div className="w-6 h-[2px] bg-blue-600/20 group-hover:w-10 transition-all duration-500" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Padrão Unieuro Labs</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* 👥 REAL TEAM SECTION */}
            <section id="equipe" className="py-40 bg-slate-50">
                <div className="container mx-auto px-6 space-y-16">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="space-y-4 text-center md:text-left">
                            <div className="inline-flex items-center gap-3 text-blue-600 font-black tracking-[0.2em] text-[9px] uppercase bg-white border border-blue-100 px-4 py-2 rounded-full shadow-sm">
                                <Users size={12} /> Capital Humano Especializado
                            </div>
                            <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">Nossos <span className="text-blue-600">Talentos.</span></h2>
                            <p className="text-[16px] text-slate-500 font-medium max-w-xl">A força motriz por trás da Fábrica. Alunos dedicados à excelência em cada linha de código.</p>
                        </div>
                        <div className="flex flex-col items-center md:items-end">
                            <span className="text-8xl font-black text-slate-900 leading-none tracking-tighter">{totalEquipe}</span>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mt-3">Membros na Fábrica</span>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[3.5rem] p-12 lg:p-20 shadow-sm relative group overflow-hidden">
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-6 lg:gap-10">
                            {carregandoEquipe ? (
                                Array.from({ length: 15 }).map((_, i) => <div key={i} className="aspect-square bg-slate-50 rounded-2xl animate-pulse" />)
                            ) : (
                                membros.map(m => (
                                    <div key={m.id} className="flex flex-col items-center gap-4 group/membro">
                                        <Avatar nome={m.nome} fotoPerfil={m.foto_perfil} tamanho="lg" className="hover:scale-110 transition-all duration-500 shadow-md ring-2 ring-transparent hover:ring-blue-600/20" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center truncate w-full group-hover/membro:text-slate-900 transition-colors">
                                            {formatarNomeCurto(m.nome)}
                                        </span>
                                    </div>
                                ))
                             )}
                        </div>
                    </div>
                </div>
            </section>

            {/* 🏁 FOOTER */}
            <footer className="pt-32 pb-16 bg-white border-t border-slate-100">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 pb-20">
                        {/* Lado Esquerdo: Identidade */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-4">
                                <img src={logoUnieuro} alt="Unieuro" className="w-14 h-14 object-contain" />
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase leading-none">Fábrica de Software</span>
                                    <span className="text-[12px] font-bold text-blue-600 uppercase tracking-[0.4em] mt-2">Unieuro</span>
                                </div>
                            </div>
                            <p className="text-[15px] text-slate-500 max-w-md font-medium leading-relaxed">
                                A convergência entre o ensino superior de excelência e a prática profissional de alta performance. Desenvolvido no Centro Universitário Unieuro para transformar a educação através da tecnologia.
                            </p>
                        </div>

                        {/* Lado Direito: Governança & Conexão */}
                        <div className="flex flex-col md:items-end md:text-right space-y-8">
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Governança & Digital</h4>
                                <div className="flex gap-4 md:justify-end">
                                    <a href="https://www.unieuro.edu.br" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm group">
                                        <Globe size={20} className="group-hover:rotate-12 transition-transform" />
                                    </a>
                                    <a href="https://github.com/softhub-unieuro" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm group">
                                        <Github size={20} className="group-hover:rotate-[-12deg] transition-transform" />
                                    </a>
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Campus Águas Claras, DF</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SoftHub — Skill's Lab</p>
                            </div>
                        </div>
                    </div>

                    {/* Barra de Copyright */}
                    <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            © {new Date().getFullYear()} — Todos os direitos reservados
                        </p>
                        <div className="flex items-center gap-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sistemas em Produção</span>
                        </div>
                    </div>
                </div>
            </footer>

            <ModalDetalhesPortfolio 
                projetoId={projetoSelecionado}
                aberto={!!projetoSelecionado}
                aoFechar={handleFecharDetalhes}
            />
        </div>
    );
});

export default PaginaPortfolio;
