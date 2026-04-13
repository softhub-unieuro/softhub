import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { api } from '../../../compartilhado/servicos/api';
import { usarMsalAuth } from '../hooks/usarMsalAuth';
import PainelQRCode from './PainelQRCode';
import { usarDispositivo } from '../../../compartilhado/hooks/usarDispositivo';
import { LadoEsquerdoInstitucional } from './LadoEsquerdoInstitucional';
import { SecaoLoginMicrosoft } from './SecaoLoginMicrosoft';
import { usarToast } from '@/compartilhado/hooks/usarToast';
import { Loader2 } from 'lucide-react';

/**
 * Tela de login consolidada - MSAL Only (Auditoria Part 1).
 * Gerencia o fluxo de entrada via Microsoft e QR Code.
 */
export default function TelaLogin() {
    const { contas, emAndamento, loginComMicrosoft, processarLoginNoBackend, estaAutenticado } = usarMsalAuth();
    const { isMobile } = usarDispositivo();
    const { exibirToast } = usarToast();
    const navegar = useNavigate();
    const [parametrosBusca] = useSearchParams();

    const [configuracaoPublica, setConfiguracaoPublica] = useState<any>(null);
    const [instanteInstalacao, setInstanteInstalacao] = useState<any>(null);
    const [processando, setProcessando] = useState(false);
    const [erroAutenticacao, setErroAutenticacao] = useState<string | null>(null);

    // Ouvir evento de instalação PWA (Auditoria Checklist Part 3)
    useEffect(() => {
        const tratarEventoInstalacao = (e: Event) => {
            e.preventDefault();
            setInstanteInstalacao(e);
        };
        window.addEventListener('beforeinstallprompt', tratarEventoInstalacao);
        return () => window.removeEventListener('beforeinstallprompt', tratarEventoInstalacao);
    }, []);

    const tratarCliqueInstalacao = async () => {
        if (!instanteInstalacao) {
            exibirToast('O navegador está otimizando o App para instalação. Tente novamente em alguns segundos.', 'sucesso');
            return;
        }
        instanteInstalacao.prompt();
        const { outcome } = await instanteInstalacao.userChoice;
        if (outcome === 'accepted') setInstanteInstalacao(null);
    };

    // Carregar configurações de governança e domínios autorizados
    useEffect(() => {
        const carregarConfiguracoes = async () => {
            try {
                const res = await api.get('/api/configuracoes/publico');
                setConfiguracaoPublica(res.data);
            } catch (e) {
                setConfiguracaoPublica({ 
                    dominios_autorizados: ['unieuro.com.br', 'unieuro.edu.br'], 
                    modo_manutencao: false 
                });
            }
        };
        carregarConfiguracoes();
    }, []);

    useEffect(() => {
        if (estaAutenticado) {
            const destino = parametrosBusca.get('returnTo') || '/app/dashboard';
            navegar(destino, { replace: true });
        }
    }, [estaAutenticado, navegar, parametrosBusca]);

    // Processa retorno do MSAL automaticamente após o redirect (Checklist Part 2)
    const sincronizarComBackend = useCallback(async (conta: any) => {
        setProcessando(true);
        setErroAutenticacao(null);
        try {
            const resultado = await processarLoginNoBackend(conta);
            if (!resultado.sucesso) {
                setErroAutenticacao(resultado.erro || 'Não foi possível validar sua identidade institucional.');
            }
        } finally {
            setProcessando(false);
        }
    }, [processarLoginNoBackend]);

    useEffect(() => {
        const podeProcessar = contas.length > 0 && !estaAutenticado && emAndamento === 'none' && !processando;
        if (podeProcessar) {
            sincronizarComBackend(contas[0]);
        }
    }, [contas, emAndamento, estaAutenticado, sincronizarComBackend, processando]);

    const erroUrl = parametrosBusca.get('erro');
    const erroExibicao = erroAutenticacao || (erroUrl ? 'Erro na autenticação externa da Microsoft.' : null);

    return (
        <div className="light min-h-screen bg-slate-50 flex items-center justify-center p-0 sm:p-6 lg:p-8 transition-colors duration-500 relative">
            
            {/* Overlay de Processamento Premium */}
            {processando && (
                <div className="absolute inset-0 z-[100] backdrop-blur-md bg-white/60 flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <div className="relative">
                        <Loader2 size={48} className="text-blue-600 animate-spin" />
                        <div className="absolute inset-0 border-4 border-blue-100 rounded-full opacity-20" />
                    </div>
                    <h2 className="mt-6 text-xl font-black text-slate-800 tracking-tight uppercase italic">Validando Credenciais</h2>
                    <p className="mt-2 text-slate-500 text-sm font-bold uppercase tracking-widest">Aguarde a sincronização institucional...</p>
                </div>
            )}

            <div className="w-full max-w-7xl bg-white sm:rounded-2xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col lg:flex-row min-h-screen sm:min-h-[750px] border-none sm:border border-border animar-entrada">
                
                <LadoEsquerdoInstitucional />

                <div className="flex-1 flex flex-col lg:flex-row items-stretch bg-white -mt-8 lg:mt-0 rounded-t-[32px] lg:rounded-2xl relative z-20">
                    
                    {/* Área Principal de Login */}
                    <div className="flex-1 p-8 lg:p-12 flex flex-col items-center justify-center">
                        <div className="w-full max-w-sm space-y-8">
                            
                            <SecaoLoginMicrosoft 
                                configPublica={configuracaoPublica}
                                erro={erroExibicao}
                                carregando={emAndamento !== 'none' || processando}
                                handleLogin={loginComMicrosoft}
                                isMobile={isMobile}
                                deferredPrompt={instanteInstalacao}
                                handleInstallClick={tratarCliqueInstalacao}
                            />

                        </div>
                    </div>

                    {!isMobile && (
                        <>
                            {/* Divisor Elegante com Gradiente */}
                            <div className="hidden lg:block w-[1px] bg-gradient-to-b from-transparent via-slate-200 to-transparent self-stretch my-20" />
                            
                            {/* Painel QR de Elite */}
                            <div className="flex-1 flex flex-col items-center justify-center p-12 relative animate-in slide-in-from-right duration-700">
                                <PainelQRCode />
                                <div className="mt-10 text-center space-y-4 max-w-[280px]">
                                    <h4 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase italic">Acesso Rápido</h4>
                                    <p className="text-[12px] text-slate-500 font-bold leading-relaxed uppercase tracking-tight">
                                        Escaneie com a câmera do seu celular já autenticado para entrar instantaneamente no computador.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}


