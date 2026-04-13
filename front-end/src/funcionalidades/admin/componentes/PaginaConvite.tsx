import { useState, useEffect, useMemo } from 'react';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { useParams, useNavigate } from 'react-router';
import { 
    UserPlus, CheckCircle2, AlertCircle, LogIn, 
    Terminal, Layout, Database, FileText, ShieldCheck, 
    Server, Smartphone, Palette, LayoutGrid, ChevronRight,
    Search
} from 'lucide-react';
import { api } from '@/compartilhado/servicos/api';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { usarToast } from '@/compartilhado/hooks/usarToast';
import { Carregando } from '@/compartilhado/componentes/Carregando';

/**
 * Mapeia nomes de áreas para ícones específicos do Lucide.
 */
const obterIconePorNome = (nome: string) => {
    const n = nome.toUpperCase();
    if (n.includes('BACK-END') || n.includes('SERVER') || n.includes('API')) return Terminal;
    if (n.includes('FRONT-END') || n.includes('UI') || n.includes('WEB')) return Layout;
    if (n.includes('BANCO') || n.includes('DATA') || n.includes('SQL')) return Database;
    if (n.includes('DOC') || n.includes('REQUISITO') || n.includes('WIKI')) return FileText;
    if (n.includes('TESTE') || n.includes('QA') || n.includes('QUALIDADE')) return ShieldCheck;
    if (n.includes('INFRA') || n.includes('DEVOPS') || n.includes('CLOUD')) return Server;
    if (n.includes('MOBILE') || n.includes('APP') || n.includes('ANDROID') || n.includes('IOS')) return Smartphone;
    if (n.includes('DESIGN') || n.includes('UX') || n.includes('ART')) return Palette;
    return LayoutGrid;
};

/**
 * Página de Convite para novos membros.
 * Refatorada para um design minimalista com seletores visuais.
 */
export default function PaginaConvite() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { estaAutenticado, usuario, carregando: carregandoAuth } = usarAutenticacao();
    const { exibirToast } = usarToast();

    // Estados da Página
    const [status, setStatus] = useState<'validando' | 'valido' | 'erro' | 'sucesso'>('validando');
    const [erro, setErro] = useState('');
    const [criador, setCriador] = useState('');
    
    // Dados de Alocação
    const [equipes, setEquipes] = useState<any[]>([]);
    const [grupos, setGrupos] = useState<any[]>([]);
    const [equipeSelecionada, setEquipeSelecionada] = useState('');
    const [grupoSelecionado, setGrupoSelecionado] = useState('');
    const [enviando, setEnviando] = useState(false);

    // 1. Validar Token ao Carregar
    useEffect(() => {
        async function validar() {
            try {
                const res = await api.get(`/api/convites/validar/${token}`);
                if (res.data.valido) {
                    setCriador(res.data.criador);
                    setStatus('valido');
                } else {
                    setErro(res.data.erro || 'Este convite não é mais válido.');
                    setStatus('erro');
                }
            } catch (e) {
                setErro('Falha ao conectar com o servidor.');
                setStatus('erro');
            }
        }
        validar();
    }, [token]);

    // 2. Carregar Equipes e Grupos
    useEffect(() => {
        if (status === 'valido' && estaAutenticado) {
            async function carregarOpcoes() {
                try {
                    const [resE, resG] = await Promise.all([
                        api.get('/api/equipes'),
                        api.get('/api/grupos')
                    ]);
                    setEquipes(resE.data.dados || []);
                    setGrupos(resG.data.grupos || []);
                } catch (e) {
                    exibirToast('Erro ao carregar opções de alocação.', 'erro');
                }
            }
            carregarOpcoes();
        }
    }, [status, estaAutenticado, exibirToast]);

    const gruposFiltrados = useMemo(() => 
        grupos.filter(g => g.equipe_id === equipeSelecionada),
    [grupos, equipeSelecionada]);

    const handleFinalizar = async () => {
        if (!equipeSelecionada || !grupoSelecionado) return;

        setEnviando(true);
        try {
            await api.post('/api/convites/aceitar', {
                token,
                equipe_id: equipeSelecionada,
                grupo_id: grupoSelecionado
            });
            setStatus('sucesso');
            exibirToast('Bem-vindo(a)! Você foi alocado com sucesso.');
            setTimeout(() => navigate('/app/dashboard'), 2000);
        } catch (e: any) {
            exibirToast(e.response?.data?.erro || 'Erro ao processar convite.', 'erro');
        } finally {
            setEnviando(false);
        }
    };

    if (status === 'validando' || (status === 'valido' && carregandoAuth)) {
        return <Carregando Centralizar={true} />;
    }

    return (
        <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-6 relative selection:bg-primary/20">
            {/* Linhas de Grade Sutis */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

            {/* Container */}
            <div className="w-full max-w-[400px] relative z-10 animar-entrada">
                <div className="space-y-12">
                    
                    {/* Brand / Logo */}
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-700
                            ${status === 'erro' ? 'border-red-900/30 bg-red-950/20 text-red-500' : 
                              status === 'sucesso' ? 'border-emerald-900/30 bg-emerald-950/20 text-emerald-500' : 
                              'border-slate-800 bg-slate-900/20 text-slate-400'}`}>
                            {status === 'erro' ? <AlertCircle size={28} /> : 
                             status === 'sucesso' ? <CheckCircle2 size={28} /> : 
                             <UserPlus size={28} />}
                        </div>
                        
                        <div className="space-y-1">
                            <h1 className="text-xl font-medium text-white tracking-tight">
                                {status === 'erro' ? 'Convite Expirado' : 
                                 status === 'sucesso' ? 'Acesso Concedido' : 
                                 'Fábrica de Software'}
                            </h1>
                            <p className="text-slate-500 text-sm">
                                {status === 'erro' ? erro : 
                                 status === 'sucesso' ? 'Preparando seu dashboard...' : 
                                 `Convidado por ${criador}`}
                            </p>
                        </div>
                    </div>

                    {/* Conteúdo Central */}
                    {status === 'valido' && (
                        <div className="space-y-10">
                            {!estaAutenticado ? (
                                <div className="space-y-6">
                                    <p className="text-slate-400 text-xs text-center px-8 leading-relaxed">
                                        Para validar sua identidade institucional, realize o login seguro.
                                    </p>
                                    <button 
                                        onClick={() => navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`)}
                                        className="w-full h-14 rounded-xl bg-white text-slate-950 text-xs font-bold uppercase tracking-[0.2em] hover:bg-slate-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                                    >
                                        <LogIn size={16} /> Entrar com Unieuro
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-10 animar-fundo">
                                    {/* Perfil */}
                                    <div className="flex items-center gap-4 p-4 bg-slate-900/40 border border-slate-800 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-700 delay-200">
                                        <Avatar 
                                            nome={usuario?.nome || 'Convidado'} 
                                            fotoPerfil={usuario?.foto_perfil} 
                                            tamanho="lg" 
                                            className="rounded-xl shadow-lg shadow-black/20"
                                        />
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-bold text-white truncate">{usuario?.nome}</span>
                                            <span className="text-[10px] text-slate-500 truncate uppercase tracking-widest font-medium">{usuario?.email}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-12">
                                        {/* Seleção de Equipe */}
                                        <div className="space-y-4">
                                            <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold px-1">Equipe</span>
                                            <div className="grid grid-cols-3 gap-2">
                                                {equipes.map(eq => {
                                                    const selecionado = equipeSelecionada === eq.id;
                                                    const Icone = obterIconePorNome(eq.nome);
                                                    return (
                                                        <button
                                                            key={eq.id}
                                                            onClick={() => { setEquipeSelecionada(eq.id); setGrupoSelecionado(''); }}
                                                            className={`flex flex-col items-center justify-center p-3 py-4 rounded-xl border transition-all duration-300 group gap-2
                                                                ${selecionado 
                                                                    ? 'bg-primary/5 border-primary/50 text-white shadow-xl shadow-primary/10' 
                                                                    : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900/60'}`}
                                                        >
                                                            <div className={`p-2 rounded-lg transition-all duration-500
                                                                ${selecionado ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/20' : 'bg-slate-800 text-slate-600 group-hover:text-slate-400 group-hover:scale-110'}`}>
                                                                <Icone size={18} />
                                                            </div>
                                                            <span className="text-[9px] font-black uppercase tracking-tighter text-center truncate w-full px-0.5">{eq.nome}</span>
                                                        </button>
                                                    );
                                                })}
                                                {equipes.length === 0 && (
                                                    <div className="col-span-3 p-8 text-center border-2 border-dashed border-slate-900 rounded-2xl">
                                                        <span className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Nenhuma equipe disponível</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Seleção de Squad / Grupo */}
                                        <div className={`space-y-4 transition-all duration-500 ${!equipeSelecionada ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold px-1">Grupo</span>
                                            <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                                {gruposFiltrados.map(g => {
                                                    const selecionado = grupoSelecionado === g.id;
                                                    const inicial = g.nome.charAt(0).toUpperCase();
                                                    return (
                                                        <button
                                                            key={g.id}
                                                            onClick={() => setGrupoSelecionado(g.id)}
                                                            className={`flex items-center gap-2 p-2 rounded-xl border transition-all duration-300 group
                                                                ${selecionado 
                                                                    ? 'bg-primary/10 border-primary/40 text-white' 
                                                                    : 'bg-slate-900/20 border-slate-800 text-slate-500 hover:border-slate-700 hover:bg-slate-900/40'}`}
                                                        >
                                                            <div className={`w-6 h-6 shrink-0 flex items-center justify-center font-black text-[9px] border rounded-lg transition-all
                                                                ${selecionado ? 'bg-primary border-primary text-white' : 'bg-slate-800/80 border-slate-700/50 text-slate-500 group-hover:text-slate-300'}`}>
                                                                {inicial}
                                                            </div>
                                                            <span className="text-[9px] font-black uppercase truncate flex-1 text-left">{g.nome}</span>
                                                        </button>
                                                    );
                                                })}
                                                {equipeSelecionada && gruposFiltrados.length === 0 && (
                                                    <div className="col-span-3 p-8 text-center border-2 border-dashed border-slate-900 rounded-2xl">
                                                        <span className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Aguardando grupos...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        disabled={!equipeSelecionada || !grupoSelecionado || enviando}
                                        onClick={handleFinalizar}
                                        className="w-full h-16 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-[0.3em] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale shadow-xl shadow-primary/10 flex items-center justify-center gap-3"
                                    >
                                        {enviando ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Confirmar Alocação'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="pt-10 text-center border-t border-slate-900">
                        <button 
                            onClick={() => navigate('/')}
                            className="text-[10px] text-slate-700 hover:text-slate-400 uppercase tracking-[0.2em] transition-colors"
                        >
                            Voltar ao portal
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .animar-entrada { animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1); }
                .animar-fundo { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { 
                    from { opacity: 0; transform: translateY(10px); } 
                    to { opacity: 1; transform: translateY(0); } 
                }
            `}</style>
        </div>
    );
}
