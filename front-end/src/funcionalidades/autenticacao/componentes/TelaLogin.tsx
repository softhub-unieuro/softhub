import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { useSearchParams, useNavigate } from 'react-router';
import { api } from '../../../compartilhado/servicos/api';
import { usarAutenticacao } from '../../../contexto/ContextoAutenticacao';
import { loginRequest } from '../../../configuracoes/msal';
import PainelQRCode from './PainelQRCode';
import { usarDispositivo } from '../../../compartilhado/hooks/usarDispositivo';
import { logger } from '../../../utilitarios/gerenciador-logs';
import { LadoEsquerdoInstitucional } from './LadoEsquerdoInstitucional';
import { SecaoLoginMicrosoft } from './SecaoLoginMicrosoft';

/**
 * Tela de login com estética Discord-Style (Minimalista e Funcional).
 */
// Trava global fora do componente para evitar execução dupla em remontagens do React 18+
let travaAuthGlobal = false;

export default function TelaLogin() {
    const { instance } = useMsal();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { entrar, estaAutenticado } = usarAutenticacao();
    const { isMobile } = usarDispositivo();

    const [carregando, setCarregando] = useState(false);
    const [erroLocal, setErroLocal] = useState<string | null>(null);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [configPublica, setConfigPublica] = useState<{ dominios_autorizados: string[], modo_manutencao: boolean } | null>(null);
    const configRef = useState<{ current: any }>({ current: null })[0]; // Ref manual para persistir config sem disparar hooks

    // Sincroniza ref com estado para uso no processador assíncrono
    useEffect(() => { configRef.current = configPublica; }, [configPublica]);

    // ─── Buscar Governança Pública (Domínios e Manutenção) ──────────────────────
    useEffect(() => {
        const carregarConfig = async () => {
            try {
                const res = await api.get('/api/configuracoes/publico');
                setConfigPublica(res.data);
            } catch (e) {
                logger.erro('Login', 'Falha ao carregar configurações públicas', e);
                // Fallback de segurança em caso de falha na API
                setConfigPublica({ dominios_autorizados: ['unieuro.com.br'], modo_manutencao: false });
            }
        };
        carregarConfig();
    }, []);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const erroRedirect = searchParams.get('erro');
    const mensagemErroRedirect: Record<string, string> = {
        'dominio': `Conta não autorizada. Use seu email de um dos domínios institucionais permitidos.`,
        'nao-autorizado': 'Acesso negado. Conta não cadastrada ou desativada.',
        'backend': 'Falha ao validar sua conta. Tente novamente.',
    };
    const erro = erroLocal ?? (erroRedirect ? mensagemErroRedirect[erroRedirect] : null);

    // ─── Lógica de Redirecionamento se já Autenticado ───────────────────────────
    useEffect(() => {
        if (estaAutenticado) {
            navigate('/app/dashboard', { replace: true });
        }
    }, [estaAutenticado, navigate]);

    // ─── Processador de Autenticação Backend ──────────────────────────────────
    const realizarAutenticacaoNoBackend = async (conta: any) => {
        if (travaAuthGlobal) return;
        
        let config = configRef.current;
        
        // Se a config ainda não carregou (race condition), aguardamos até 2 segundos
        if (!config) {
            let tentativas = 0;
            while (!config && tentativas < 20) {
                await new Promise(r => setTimeout(r, 100));
                config = configRef.current;
                tentativas++;
            }
        }

        // Se mesmo assim não houver config, usamos fallback de segurança para não travar o login
        const email = (conta.username || '').toLowerCase();
        const dominiosValidos = config?.dominios_autorizados || ['unieuro.com.br', 'unieuro.edu.br'];
        
        if (!dominiosValidos.some((d: string) => email.endsWith(`@${d.toLowerCase()}`))) {
            logger.aviso('Login', `Domínio não autorizado: ${email}`);
            setErroLocal(`Use o e-mail institucional (${dominiosValidos.map((d: string) => `@${d}`).join(' ou ')}).`);
            setCarregando(false);
            return;
        }

        travaAuthGlobal = true; // Só travamos AGORA que vamos realmente chamar o backend

        try {
            setCarregando(true);
            const tokenResponse = await instance.acquireTokenSilent({
                ...loginRequest,
                account: conta
            });

            const response = await api.post('/api/auth/msal', {
                accessToken: tokenResponse.accessToken,
                idToken: tokenResponse.idToken
            });

            entrar(response.data.usuario, response.data.token);
            navigate('/app/dashboard', { replace: true });
        } catch (error: any) {
            logger.erro('Login', 'Erro crítico na autenticação MSAL/Backend', error);
            const dataErro = error.response?.data;
            const msgUser = dataErro?.erro || 'Tente logar manualmente clicando no botão.';
            const detalhe = dataErro?.detalhe ? ` (${dataErro.detalhe})` : '';

            setErroLocal(`${msgUser}${detalhe}`);
            setCarregando(false);
            travaAuthGlobal = false;
        }
    };

    // ─── Gerenciamento de Eventos MSAL ──────────────────────────────────────────
    useEffect(() => {
        let montado = true;

        // 1. Captura o resultado do redirect (Fluxo Principal)
        instance.handleRedirectPromise().then((response) => {
            if (montado && response?.account) {
                realizarAutenticacaoNoBackend(response.account);
            }
        }).catch(err => {
            if (montado) console.error('[Login] MSAL Error:', err);
        });

        // 2. Escuta eventos adicionais (Fallback caso o promise perca o contexto)
        const callbackId = instance.addEventCallback((event: any) => {
            const isSuccess = event.eventType === 'msal:loginSuccess' || event.eventType === 'msal:handleRedirectEnd';
            if (montado && isSuccess && event.payload?.account && !travaAuthGlobal) {
                realizarAutenticacaoNoBackend(event.payload.account);
            }
        });

        return () => {
            montado = false;
            if (callbackId) instance.removeEventCallback(callbackId);
        };
    }, [instance]);

    const handleLogin = async () => {
        setCarregando(true);
        setErroLocal(null);
        // Resetamos a trava para permitir tentativa manual
        travaAuthGlobal = false; 

        try {
            await instance.loginRedirect(loginRequest);
        } catch (e) {
            setCarregando(false);
            setErroLocal('Falha ao iniciar autenticação.');
        }
    };

    return (
        <div className="light min-h-screen bg-slate-50 flex items-center justify-center p-0 sm:p-6 lg:p-8 selection:bg-red-500/20 transition-colors duration-500">
            <div className="w-full max-w-7xl bg-white sm:rounded-2xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col lg:flex-row min-h-screen sm:min-h-[750px] border-none sm:border border-border animar-entrada">

                <LadoEsquerdoInstitucional />

                {/* Área de Acesso (Login Microsoft + Prompt PWA) */}
                <div className="flex-1 flex flex-col lg:flex-row items-stretch bg-white -mt-8 lg:mt-0 rounded-t-[32px] lg:rounded-2xl relative z-20">

                    {/* Lado Central: Acesso Microsoft */}
                    <SecaoLoginMicrosoft
                        configPublica={configPublica}
                        erro={erro}
                        carregando={carregando}
                        handleLogin={handleLogin}
                        isMobile={isMobile}
                        deferredPrompt={deferredPrompt}
                        handleInstallClick={handleInstallClick}
                    />

                    {/* Divisor Vertical Ultra Sutil */}
                    <div className="hidden lg:block w-[1px] bg-border self-stretch my-24 opacity-50" />

                     {/* Lado Direito: Accesso Integrado (QR Code) */}
                     {!isMobile && (
                         <div className="flex-1 flex flex-col items-center justify-center bg-transparent p-12 relative animar-entrada atraso-3">
                            <div className="w-full flex flex-col items-center space-y-12">
                                <PainelQRCode />

                                <div className="text-center space-y-3 max-w-[280px]">
                                    <h4 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Entrar com QR Code</h4>
                                    <p className="text-[13px] text-slate-600 font-bold leading-relaxed">
                                        Abra o app ou site da plataforma no celular, escaneie o código e faça login em segundos.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
