import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { CheckCircle, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../../../compartilhado/servicos/api';
import { usarAutenticacao } from '../../../contexto/ContextoAutenticacao';

/**
 * Página de confirmação de login via QR Code (Audit Checklist Part 2 - Scanner Redirect).
 * Utilizada pelo dispositivo móvel que escaneou o código para autorizar o acesso.
 */
export default function ConfirmacaoLoginQR() {
    const { token } = useParams<{ token: string }>();
    const navegar = useNavigate();
    const { estaAutenticado, usuario } = usarAutenticacao();
    const [estado, setEstado] = useState<'validando' | 'erro' | 'confirmacao' | 'autorizando' | 'sucesso'>('validando');
    const [mensagemErro, setMensagemErro] = useState('');

    useEffect(() => {
        if (!estaAutenticado) {
            // Se não está logado no Mobile, redireciona para login e volta depois
            navegar(`/login?redirect=/auth/qr/${token}`, { replace: true });
            return;
        }
        setEstado('confirmacao');
    }, [estaAutenticado, token, navegar]);

    /**
     * Envia a autorização para o backend liberar o acesso no computador.
     */
    const confirmarAcesso = useCallback(async () => {
        if (!token) return;
        setEstado('autorizando');
        try {
            // Identifica o dispositivo (Feedback visual no computador)
            await api.post('/api/auth/qr/identificar', { sessaoId: token });
            
            // Autoriza a entrada definitiva
            await api.post('/api/auth/qr/autorizar', { sessaoId: token });
            
            setEstado('sucesso');
            setTimeout(() => navegar('/app/dashboard'), 2000);
        } catch (erro: any) {
            const detalheErro = erro.resposta?.dados?.erro || 'Link expirado ou inválido.';
            setMensagemErro(detalheErro);
            setEstado('erro');
        }
    }, [token, navegar]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] border border-slate-100 space-y-8 animate-in zoom-in duration-500">
                
                {estado === 'validando' || estado === 'autorizando' ? (
                    <div className="flex flex-col items-center gap-6 py-10">
                        <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando...</span>
                    </div>
                ) : estado === 'sucesso' ? (
                    <div className="flex flex-col items-center gap-6 py-10 animate-bounce-short">
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                            <CheckCircle className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900">Acesso Autorizado!</h2>
                        <p className="text-[13px] text-slate-500 font-medium">Seu computador já está entrando.</p>
                    </div>
                ) : estado === 'erro' ? (
                    <div className="flex flex-col items-center gap-6 py-10">
                        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-10 h-10" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900">Algo deu errado</h2>
                        <p className="text-[13px] text-slate-500 font-medium">{mensagemErro}</p>
                        <button 
                            onClick={() => navegar('/app/dashboard')}
                            className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                        >
                            Voltar ao App
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            <div className="inline-flex py-1 px-3 bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-200">
                                Segurança Institucional
                            </div>
                            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                                Autorizar Login?
                            </h2>
                            <p className="text-slate-500 font-bold text-xs lg:text-sm leading-relaxed">
                                Você está tentando entrar no computador como <span className="text-slate-900">{usuario?.nome}</span>?
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 pt-4">
                            <button
                                onClick={confirmarAcesso}
                                className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
                            >
                                <ShieldCheck size={18} /> Sim, autorizar agora
                            </button>
                            <button
                                onClick={() => navegar('/app/dashboard')}
                                className="w-full py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200/50"
                            >
                                Não, cancelar
                            </button>
                        </div>
                    </>
                )}

            </div>
            
            <p className="mt-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                SoftHub Protection &bull; UniEuro
            </p>
        </div>
    );
}

