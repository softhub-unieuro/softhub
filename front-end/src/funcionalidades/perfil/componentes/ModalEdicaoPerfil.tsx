import { memo, useState, useEffect } from 'react';
import {
    Camera, Save, Mail, Shield, Pencil, X, ExternalLink,
    Github, Linkedin, Globe, Image as ImageIcon, Users, Layers,
    Target, Trophy, CheckCircle2, ListTodo, Sparkles, Zap, Coffee
} from 'lucide-react';
import { usarPerfil } from '@/funcionalidades/perfil/hooks/usarPerfil';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { Modal } from '@/compartilhado/componentes/Modal';

interface ModalEdicaoPerfilProps {
    aberto: boolean;
    aoFechar: () => void;
}

export const ModalEdicaoPerfil = memo(({ aberto, aoFechar }: ModalEdicaoPerfilProps) => {
    const { perfil, stats, atualizarPerfil, salvando } = usarPerfil();
    const [editando, setEditando] = useState(false);

    const [bio, setBio] = useState('');
    const [fotoPerfil, setFotoPerfil] = useState('');
    const [fotoBanner, setFotoBanner] = useState('');
    const [githubUrl, setGithubUrl] = useState('');
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');

    useEffect(() => {
        if (perfil && aberto) {
            setBio(perfil.bio || '');
            setFotoPerfil(perfil.foto_perfil || '');
            setFotoBanner(perfil.foto_banner || '');
            setGithubUrl(perfil.github_url || '');
            setLinkedinUrl(perfil.linkedin_url || '');
            setWebsiteUrl(perfil.website_url || '');
            setEditando(false);
        }
    }, [perfil, aberto]);

    if (!perfil) return null;

    const handleSalvar = async () => {
        try {
            await atualizarPerfil({
                bio, foto_perfil: fotoPerfil, foto_banner: fotoBanner,
                github_url: githubUrl, linkedin_url: linkedinUrl, website_url: websiteUrl
            });
            setEditando(false);
        } catch (e) { /* Silencioso: erro já tratado pelo hook/toast */ }
    };

    const aproveitamento = stats?.tarefas?.aproveitamento || 0;

    return (
        <Modal aberto={aberto} aoFechar={aoFechar} titulo="Perfil" largura="xl" semHeader={true}>
            <div className="relative bg-[#FDFDFE] -my-6 -mx-8 min-h-[660px] flex flex-col rounded-2xl overflow-hidden font-sans">
                
                {/* 1. BACKGROUND DINÂMICO (SUTIL) */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-50/50 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-blue-50/30 rounded-full blur-[100px]" />
                </div>

                {/* BOTÃO DE FECHAR ISOLADO NO TOPO */}
                <div className="absolute top-6 right-8 z-50">
                    <button 
                        onClick={aoFechar} 
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50/50 rounded-xl transition-all group"
                    >
                        <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                <div className="relative z-10 flex-1 flex flex-col md:flex-row p-6 md:p-10 gap-10">
                    
                    {!editando ? (
                        <>
                            {/* COLUNA ESQUERDA: IDENTIDADE MINIMALISTA */}
                            <div className="md:w-72 flex flex-col shrink-0 animate-in fade-in slide-in-from-left-4 duration-700">
                                <div className="flex flex-col items-center">
                                    <div className="relative mb-8 group">
                                        <div className="w-40 h-40 rounded-[2.5rem] p-1 bg-gradient-to-tr from-indigo-100 via-white to-blue-100 shadow-sm transition-transform duration-500 group-hover:scale-[1.02]">
                                            <div className="w-full h-full rounded-[2.2rem] overflow-hidden border-[6px] border-white shadow-xl">
                                                <Avatar nome={perfil.nome} fotoPerfil={perfil.foto_perfil} tamanho="full" />
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white border border-slate-100 shadow-lg rounded-2xl flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                                            <Zap size={18} fill="currentColor" strokeWidth={0} />
                                        </div>
                                    </div>

                                    <div className="text-center space-y-1 px-4">
                                        <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight line-clamp-2">{perfil.nome}</h1>
                                        <p className="text-[10px] font-black text-indigo-500/80 uppercase tracking-[0.2em]">{perfil.email}</p>
                                    </div>

                                    <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent my-8" />

                                    <div className="w-full space-y-3">
                                        <div className="flex items-center gap-3 p-3 bg-white/60 backdrop-blur-sm border border-slate-100 rounded-[1.2rem] group hover:border-indigo-100 transition-colors">
                                            <Users size={14} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{perfil.equipe_nome || 'S / Equipe'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-white/60 backdrop-blur-sm border border-slate-100 rounded-[1.2rem] group hover:border-blue-100 transition-colors">
                                            <Layers size={14} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{perfil.grupo_nome || 'S / Grupo'}</span>
                                        </div>
                                    </div>

                                    {/* BOTÃO EDITAR PERFIL MOVIDO PARA CÁ */}
                                    <button 
                                        onClick={() => setEditando(true)} 
                                        className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-white hover:border-indigo-100 hover:shadow-sm transition-all group font-bold text-[10px] uppercase tracking-[0.2em]"
                                    >
                                        <Pencil size={12} className="group-hover:rotate-12 transition-transform" />
                                        Editar Perfil
                                    </button>

                                    {/* CONTATOS DISCRETOS EMBAIXO */}
                                    <div className="mt-8 flex items-center gap-2">
                                        {[
                                            { icon: Github, href: perfil.github_url },
                                            { icon: Linkedin, href: perfil.linkedin_url },
                                            { icon: Globe, href: perfil.website_url },
                                            { icon: Mail, href: `mailto:${perfil.email}` }
                                        ].map((social, idx) => (
                                            social.href && (
                                                <a key={idx} href={social.href} target="_blank" className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all hover:-translate-y-1">
                                                    <social.icon size={16} />
                                                </a>
                                            )
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* COLUNA DIREITA: CONTEÚDO PREMIUM */}
                            <div className="flex-1 flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-700 delay-100">
                                
                                {/* BIO GLASSMORPHISM */}
                                <div className="bg-white/40 backdrop-blur-md border border-white rounded-[2rem] p-8 shadow-sm relative group hover:bg-white transition-all duration-500">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Coffee size={14} className="text-amber-500/60" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Minha Essência</span>
                                    </div>
                                    <p className="text-base font-medium text-slate-600 leading-relaxed italic pr-10">
                                        "{perfil.bio || 'Preparando minha jornada profissional com foco e inovação...'}"
                                    </p>
                                    <Sparkles size={24} className="absolute right-8 top-8 text-amber-100 group-hover:text-amber-300 transition-colors duration-700" />
                                </div>

                                {/* DASHBOARD DE PERFORMANCE REQUINTADO */}
                                <div className="grid grid-cols-2 gap-5 flex-1">
                                    
                                    <div className="bg-slate-900 rounded-[2rem] p-7 shadow-xl shadow-slate-200 flex flex-col justify-between group hover:scale-[1.02] transition-transform overflow-hidden relative">
                                        <div className="absolute top-0 right-0 p-8 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                                            <Trophy size={100} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] relative z-10">Desafios Atuais</span>
                                        <div className="relative z-10">
                                            <div className="text-5xl font-bold text-white tracking-tighter mb-1">{stats?.tarefas?.total || 0}</div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Ativas no momento
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-100 rounded-[2rem] p-7 shadow-sm group hover:border-indigo-100 transition-all flex flex-col justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Entregas Totais</span>
                                        <div>
                                            <div className="text-5xl font-bold text-slate-900 tracking-tighter mb-1 group-hover:text-indigo-600 transition-colors">{stats?.tarefas?.concluidas || 0}</div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <CheckCircle2 size={12} className="text-emerald-500" /> Missões Concluídas
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-2 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-[2rem] p-8 text-white flex items-center justify-between shadow-lg shadow-indigo-100 group cursor-default">
                                        <div className="flex items-center gap-6">
                                            <div className="relative w-16 h-16 shrink-0">
                                                <svg className="w-16 h-16 transform -rotate-90">
                                                    <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                                                    <circle cx="32" cy="32" r="28" fill="none" stroke="white" strokeWidth="6" strokeDasharray={175.9} strokeDashoffset={175.9 - (aproveitamento / 100) * 175.9} strokeLinecap="round" className="transition-all duration-1000 ease-out shadow-lg" />
                                                </svg>
                                                <Target size={18} className="absolute inset-0 m-auto text-white group-hover:scale-110 transition-transform" />
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-1">Aproveitamento Global</h4>
                                                <p className="text-white/80 text-xs font-medium leading-tight max-w-[180px]">Produtividade calculada com base em todas as sprints</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-5xl font-black text-white tracking-tight">{aproveitamento}<span className="text-xl opacity-40 ml-1">%</span></div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-100/60">Taxa de Sucesso</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </>
                    ) : (
                        /* MODO EDIÇÃO REFINADO */
                        <div className="flex-1 bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-50 animate-in zoom-in-95 duration-500 flex flex-col">
                            <div className="flex items-center gap-5 mb-10 pb-10 border-b border-slate-50">
                                <div className="w-16 h-16 rounded-[1.3rem] bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Personalização Premium</h2>
                                    <p className="text-slate-400 text-sm">Refine sua presença visual na Fábrica de Software.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Identidade Visual (URL)</label>
                                        <input type="url" value={fotoPerfil} onChange={e => setFotoPerfil(e.target.value)} className="w-full h-12 bg-slate-50/50 border border-slate-100 rounded-xl px-4 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 transition-all outline-none" placeholder="Link da foto..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Sua Própria Bio</label>
                                        <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full h-32 bg-slate-50/50 border border-slate-100 rounded-xl p-4 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 transition-all outline-none resize-none leading-relaxed" placeholder="Como você quer ser lembrado?..." />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Links Externos</label>
                                        <div className="space-y-3">
                                            <div className="relative group">
                                                <Github size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                                                <input type="url" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} className="w-full h-11 bg-slate-50/50 border border-slate-100 rounded-xl pl-11 pr-4 text-xs font-medium focus:bg-white transition-all outline-none" placeholder="GitHub URL" />
                                            </div>
                                            <div className="relative group">
                                                <Linkedin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                                                <input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} className="w-full h-11 bg-slate-50/50 border border-slate-100 rounded-xl pl-11 pr-4 text-xs font-medium focus:bg-white transition-all outline-none" placeholder="LinkedIn URL" />
                                            </div>
                                            <div className="relative group">
                                                <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                                                <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} className="w-full h-11 bg-slate-50/50 border border-slate-100 rounded-xl pl-11 pr-4 text-xs font-medium focus:bg-white transition-all outline-none" placeholder="Portfolio URL" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto pt-10 flex items-center justify-end gap-3">
                                <button onClick={() => setEditando(false)} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-all">Cancelar</button>
                                <button onClick={handleSalvar} disabled={salvando} className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all flex items-center gap-2">
                                    <Save size={16} /> {salvando ? 'Sincronizando...' : 'Confirmar Alterações'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
});
