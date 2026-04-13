import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { UserPlus, CheckCircle2, AlertCircle, Building2, Users2, ArrowRight, LogIn } from 'lucide-react';
import { api } from '@/compartilhado/servicos/api';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { usarToast } from '@/compartilhado/hooks/usarToast';
import { Botao } from '@/compartilhado/componentes/ui/Botao';
import { Carregando } from '@/compartilhado/componentes/Carregando';

/**
 * Página de Convite para novos membros.
 * Permite que o membro logue (via MSAL) e escolha sua alocação.
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

    // 2. Carregar Equipes e Grupos (Só se o token for válido e o usuário estiver logado)
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

    const gruposFiltrados = grupos.filter(g => g.equipe_id === equipeSelecionada);

    const handleFinalizar = async () => {
        if (!equipeSelecionada || !grupoSelecionado) {
            return exibirToast('Selecione uma equipe e um grupo para continuar.');
        }

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
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
            {/* Background Decorativo */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />

            <div className="w-full max-w-md bg-card/40 backdrop-blur-xl border border-border/50 rounded-[32px] p-8 shadow-2xl relative z-10 animar-entrada">
                {/* Cabeçalho do Convite */}
                <div className="flex flex-col items-center text-center mb-10">
                    <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center mb-6 shadow-xl shadow-primary/20">
                        {status === 'erro' ? <AlertCircle size={32} className="text-white" /> : 
                         status === 'sucesso' ? <CheckCircle2 size={32} className="text-white" /> : 
                         <UserPlus size={32} className="text-white" />}
                    </div>
                    
                    {status === 'erro' ? (
                        <>
                            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Convite Inválido</h1>
                            <p className="text-muted-foreground text-sm mt-3 leading-relaxed">{erro}</p>
                        </>
                    ) : status === 'sucesso' ? (
                        <>
                            <h1 className="text-2xl font-black text-white uppercase tracking-tight text-emerald-400">Tudo Pronto!</h1>
                            <p className="text-muted-foreground text-sm mt-3 leading-relaxed">Sua alocação foi concluída com sucesso. Redirecionando...</p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Convite SoftHub</h1>
                            <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
                                <strong>{criador}</strong> te convidou para fazer parte de um projeto. 
                                Logue com sua conta Unieuro e escolha sua equipe abaixo.
                            </p>
                        </>
                    )}
                </div>

                {/* Corpo do Fluxo */}
                {status === 'valido' && (
                    <div className="space-y-6">
                        {!estaAutenticado ? (
                            <div className="flex flex-col gap-4">
                                <p className="text-[10px] font-black uppercase text-muted-foreground/40 text-center tracking-widest">Acesso Necessário</p>
                                <Botao 
                                    variante="primario"
                                    rotulo="Entrar com conta Unieuro"
                                    onClick={() => navigate('/login')}
                                    className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-bold"
                                    icone={<LogIn size={18} />}
                                />
                            </div>
                        ) : (
                            <div className="space-y-6 animar-entrada">
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="w-10 h-10 rounded-xl bg-muted shrink-0 overflow-hidden">
                                        <img src={usuario?.foto_perfil || ''} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold text-white truncate">{usuario?.nome}</span>
                                        <span className="text-[10px] text-muted-foreground truncate">{usuario?.email}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Seleção de Equipe */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground/40 flex items-center gap-2">
                                            <Building2 size={12} /> Equipe de Trabalho
                                        </label>
                                        <select 
                                            value={equipeSelecionada}
                                            onChange={(e) => { setEquipeSelecionada(e.target.value); setGrupoSelecionado(''); }}
                                            className="w-full h-12 bg-muted/30 border border-border/50 rounded-2xl px-4 text-xs font-medium text-white appearance-none outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        >
                                            <option value="">Selecione sua equipe...</option>
                                            {equipes.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                                        </select>
                                    </div>

                                    {/* Seleção de Grupo */}
                                    <div className={`flex flex-col gap-2 transition-all duration-300 ${!equipeSelecionada ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                                        <label className="text-[10px] font-black uppercase text-muted-foreground/40 flex items-center gap-2">
                                            <Users2 size={12} /> Grupo Específico
                                        </label>
                                        <select 
                                            value={grupoSelecionado}
                                            onChange={(e) => setGrupoSelecionado(e.target.value)}
                                            className="w-full h-12 bg-muted/30 border border-border/50 rounded-2xl px-4 text-xs font-medium text-white appearance-none outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        >
                                            <option value="">Selecione o grupo...</option>
                                            {gruposFiltrados.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                                            {gruposFiltrados.length === 0 && <option value="" disabled>Nenhum grupo disponível</option>}
                                        </select>
                                    </div>
                                </div>

                                <Botao 
                                    variante="primario"
                                    rotulo="Aceitar Convite"
                                    onClick={handleFinalizar}
                                    carregando={enviando}
                                    disabled={!equipeSelecionada || !grupoSelecionado}
                                    className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest shadow-xl shadow-primary/10"
                                    icone={<ArrowRight size={18} />}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Rodapé Dinâmico */}
                <div className="mt-8 border-t border-border/10 pt-6 flex justify-center">
                    <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">SoftHub {new Date().getFullYear()}</span>
                </div>
            </div>
            
            {(status === 'erro' || status === 'sucesso') && (
                <button 
                    onClick={() => navigate('/')}
                    className="mt-8 text-[10px] font-black text-muted-foreground hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                    Voltar para o início
                </button>
            )}
        </div>
    );
}
