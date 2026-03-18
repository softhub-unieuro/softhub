import { memo, useState, useEffect } from 'react';
import { 
    Camera, 
    Save, 
    Mail, 
    Shield,
    Trophy,
    Pencil,
    X,
    ExternalLink,
    Sparkles,
    Github,
    Linkedin,
    Globe,
    Image as ImageIcon,
    Users,
    Layers
} from 'lucide-react';
import { usarPerfil } from '@/funcionalidades/perfil/hooks/usarPerfil';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { Modal } from '@/compartilhado/componentes/Modal';
import { Emblema } from '@/compartilhado/componentes/Emblema';
import { formatarDataHora } from '@/utilitarios/formatadores';

interface ModalEdicaoPerfilProps {
    aberto: boolean;
    aoFechar: () => void;
}

/**
 * Modal Cinematic de Perfil Profissional.
 * Imersivo, sem cabeçalho padrão, com banner customizável.
 * Exibe informações organizacionais (Equipe, Grupo, Cargo) e mural limpo.
 */
export const ModalEdicaoPerfil = memo(({ aberto, aoFechar }: ModalEdicaoPerfilProps) => {
    const { perfil, atualizarPerfil, salvando } = usarPerfil();
    const [editando, setEditando] = useState(false);
    
    // Estados para Edição
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

    const handleSalvar = async () => {
        try {
            await atualizarPerfil({ 
                bio, 
                foto_perfil: fotoPerfil,
                foto_banner: fotoBanner,
                github_url: githubUrl,
                linkedin_url: linkedinUrl,
                website_url: websiteUrl
            });
            setEditando(false);
        } catch (e) {
            // Toast já tratado
        }
    };

    // Lógica de Cor Idêntica ao Avatar para o Banner (Fallback)
    const getCorBanner = (nomeRef: string) => {
        const getHash = (str: string) => {
            let hash = 0;
            const textoParaHash = str.trim().toUpperCase();
            for (let i = 0; i < textoParaHash.length; i++) {
                hash = textoParaHash.charCodeAt(i) + ((hash << 5) - hash);
            }
            return Math.abs(hash);
        };

        const coresFallback = [
            'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-rose-600', 'bg-amber-600',
            'bg-indigo-600', 'bg-cyan-600', 'bg-fuchsia-600', 'bg-teal-600'
        ];
        
        const index = getHash(nomeRef) % coresFallback.length;
        return coresFallback[index];
    };

    if (!perfil) return null;

    const bannerCorClass = getCorBanner(perfil.nome);
    const exibirBannerCustom = editando ? fotoBanner : perfil.foto_banner;

    return (
        <Modal aberto={aberto} aoFechar={aoFechar} titulo="Perfil" largura="xl" semHeader={true}>
            <div className="relative -mt-6 -mx-8 overflow-hidden bg-white/50">
                
                {/* Banner de Topo com Cor Dinâmica ou Imagem Customizada */}
                <div className={`h-45 ${!exibirBannerCustom ? bannerCorClass : ''} relative overflow-hidden transition-all duration-500`}>
                    {exibirBannerCustom && (
                        <img 
                            src={exibirBannerCustom} 
                            className="w-full h-full object-cover animate-in fade-in duration-500" 
                            alt="Banner de perfil"
                        />
                    )}
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent)]" />
                    
                    {/* Ações Flutuantes */}
                    <div className="absolute top-4 right-6 z-20 flex items-center gap-2">
                        {!editando && (
                            <button 
                                onClick={() => setEditando(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-black/20 backdrop-blur-xl border border-white/20 text-white rounded-xl hover:bg-black/30 transition-all active:scale-95 group"
                            >
                                <Pencil size={12} className="group-hover:rotate-12 transition-transform" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Editar Mural</span>
                            </button>
                        )}
                        
                        <button 
                            onClick={aoFechar}
                            className="p-1.5 bg-black/20 backdrop-blur-xl border border-white/20 text-white rounded-xl hover:bg-black/30 transition-all active:scale-95 group"
                            aria-label="Fechar"
                        >
                            <X size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>

                {/* Layout de Conteúdo */}
                <div className="px-8 relative z-10">
                    <div className="flex flex-col lg:flex-row gap-8">
                        
                        {/* Sidebar: Identidade */}
                        <div className="lg:w-72 shrink-0">
                            <div className="relative -mt-16 group mb-5 flex md:block justify-center">
                                <div className="w-32 h-32 md:w-36 md:h-36 rounded-[40px] border-[6px] border-white shadow-xl overflow-hidden bg-white ring-1 ring-slate-100">
                                    <Avatar nome={perfil.nome} fotoPerfil={editando ? fotoPerfil : perfil.foto_perfil} tamanho="full" />
                                </div>
                                {editando && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[40px] border-[6px] border-transparent opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                                        <Camera className="text-white" size={24} />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-5">
                                <div className="text-center md:text-left">
                                    <h2 className="text-xl font-black tracking-tight text-slate-900 leading-tight truncate">{perfil.nome}</h2>
                                    <p className="text-[11px] font-bold text-slate-400 mt-1 truncate">{perfil.email}</p>
                                </div>

                                {/* Status Compacto: Organização */}
                                <div className="p-1 bg-slate-50/80 rounded-3xl border border-slate-100 space-y-1">
                                    <div className="flex items-center gap-3 p-2.5 hover:bg-white rounded-2xl transition-all group">
                                        <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                                            <Users size={12} />
                                        </div>
                                        <div>
                                            <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Equipe</p>
                                            <p className="text-[11px] font-bold text-slate-700 leading-none mt-0.5">{perfil.equipe_nome || '--'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-2.5 hover:bg-white rounded-2xl transition-all group">
                                        <div className="w-7 h-7 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center">
                                            <Layers size={12} />
                                        </div>
                                        <div>
                                            <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Grupo</p>
                                            <p className="text-[11px] font-bold text-slate-700 leading-none mt-0.5">{perfil.grupo_nome || '--'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-2.5 hover:bg-white rounded-2xl transition-all group">
                                        <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                                            <Shield size={12} />
                                        </div>
                                        <div>
                                            <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Acesso</p>
                                            <p className="text-[11px] font-bold text-slate-700 leading-none mt-0.5">{perfil.role}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Sociais */}
                                <div className="flex items-center justify-between px-3 text-slate-300">
                                    <a href={perfil.github_url || '#'} target="_blank" rel="noopener noreferrer" 
                                       className={`transition-colors ${perfil.github_url ? 'hover:text-slate-900' : 'opacity-20 cursor-not-allowed'}`}>
                                        <Github size={16} />
                                    </a>
                                    <a href={perfil.linkedin_url || '#'} target="_blank" rel="noopener noreferrer"
                                       className={`transition-colors ${perfil.linkedin_url ? 'hover:text-blue-600' : 'opacity-20 cursor-not-allowed'}`}>
                                        <Linkedin size={16} />
                                    </a>
                                    <a href={perfil.website_url || '#'} target="_blank" rel="noopener noreferrer"
                                       className={`transition-colors ${perfil.website_url ? 'hover:text-emerald-600' : 'opacity-20 cursor-not-allowed'}`}>
                                        <Globe size={16} />
                                    </a>
                                    <div className="w-px h-3 bg-slate-200" />
                                    <a href={`mailto:${perfil.email}`} className="hover:text-primary transition-colors cursor-pointer">
                                        <Mail size={16} />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Mural Principal */}
                        <div className="flex-1 lg:pt-8 space-y-8">
                            
                            {editando ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Coluna 1: Visual */}
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">Foto de Perfil (URL)</label>
                                                <div className="relative group/input">
                                                    <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within/input:text-primary" />
                                                    <input
                                                        type="url"
                                                        value={fotoPerfil}
                                                        onChange={e => setFotoPerfil(e.target.value) }
                                                        className="w-full h-11 bg-background border border-border rounded-2xl pl-11 pr-5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono placeholder:text-muted-foreground/30"
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">Banner de Perfil (URL)</label>
                                                <div className="relative group/input">
                                                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within/input:text-primary" />
                                                    <input
                                                        type="url"
                                                        value={fotoBanner}
                                                        onChange={e => setFotoBanner(e.target.value)}
                                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-5 text-sm font-medium outline-none focus:border-primary/40 transition-all font-mono"
                                                        placeholder="Capa do perfil (link)..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">Biografia Profissional</label>
                                                <textarea
                                                    value={bio}
                                                    onChange={e => setBio(e.target.value)}
                                                    className="w-full h-[108px] bg-background border border-border rounded-2xl p-5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none leading-relaxed placeholder:text-muted-foreground/30"
                                                    placeholder="Sua jornada..."
                                                />
                                            </div>
                                        </div>

                                        {/* Coluna 2: Redes Sociais */}
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">GitHub (URL)</label>
                                                <div className="relative group/input">
                                                    <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within/input:text-slate-900" />
                                                    <input
                                                        type="url"
                                                        value={githubUrl}
                                                        onChange={e => setGithubUrl(e.target.value)}
                                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-5 text-sm font-medium outline-none focus:border-primary/40 transition-all font-mono"
                                                        placeholder="github.com/usuario"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">LinkedIn (URL)</label>
                                                <div className="relative group/input">
                                                    <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within/input:text-blue-600" />
                                                    <input
                                                        type="url"
                                                        value={linkedinUrl}
                                                        onChange={e => setLinkedinUrl(e.target.value)}
                                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-5 text-sm font-medium outline-none focus:border-primary/40 transition-all font-mono"
                                                        placeholder="linkedin.com/in/usuario"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">Portfólio / Site</label>
                                                <div className="relative group/input">
                                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within/input:text-emerald-600" />
                                                    <input
                                                        type="url"
                                                        value={websiteUrl}
                                                        onChange={e => setWebsiteUrl(e.target.value)}
                                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-5 text-sm font-medium outline-none focus:border-primary/40 transition-all font-mono"
                                                        placeholder="meusite.com"
                                                    />
                                                </div>
                                            </div>
                                            
                                            {/* Informativo de Trava de Nome */}
                                            <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200">
                                                <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                                    <Shield size={10} /> Segurança Institucional
                                                </div>
                                                <p className="text-[9px] text-slate-500 leading-tight">O seu nome é seu registro institucional e não pode ser alterado por aqui para manter a integridade dos logs.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in fade-in duration-700">
                                    {/* Mural Content */}
                                    <div className="relative">
                                        <Sparkles size={16} className="absolute -top-1 -left-1 text-primary opacity-20" />
                                        <p className="text-lg font-medium text-slate-600 leading-relaxed italic pr-4">
                                            "{perfil.bio || 'Preparando minha jornada profissional na Fábrica...'}"
                                        </p>
                                    </div>

                                    {/* Link de Portfólio Externo */}
                                    {perfil.website_url && (
                                        <a href={perfil.website_url} target="_blank" rel="noopener noreferrer" 
                                           className="flex items-center justify-between p-5 bg-primary/5 border border-primary/10 text-primary rounded-[28px] group hover:bg-primary hover:text-white transition-all duration-500">
                                            <div className="flex items-center gap-3">
                                                <Globe size={18} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Ver Portfólio Externo</span>
                                            </div>
                                            <ExternalLink size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Minimalista */}
                {editando && (
                    <div className="flex items-center justify-end bg-white relative pr-8 pt-6">
                        <div className="flex gap-3">
                            <button
                                onClick={() => setEditando(false)}
                                className="h-12 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Descartar
                            </button>
                            <button
                                onClick={handleSalvar}
                                disabled={salvando}
                                className="h-12 px-8 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Save size={12} /> {salvando ? 'Salvando...' : 'Aplicar'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
});
