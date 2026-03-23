import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { api } from '../../../compartilhado/servicos/api';
import { usarAutenticacao } from '../../../contexto/ContextoAutenticacao';
import { usarMsalAuth } from '../hooks/usarMsalAuth';
import PainelQRCode from './PainelQRCode';
import { usarDispositivo } from '../../../compartilhado/hooks/usarDispositivo';
import { LadoEsquerdoInstitucional } from './LadoEsquerdoInstitucional';
import { SecaoLoginMicrosoft } from './SecaoLoginMicrosoft';

/**
 * Tela de login consolidada - MSAL Only (Auditoria Part 1).
 */
let travaAuthGlobal = false;

export default function TelaLogin() {
    const { accounts, inProgress, loginComMicrosoft, processarLoginNoBackend, estaAutenticado } = usarMsalAuth();
    const { isMobile } = usarDispositivo();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [configPublica, setConfigPublica] = useState<any>(null);

    // Carregar configurações de governança
    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get('/api/configuracoes/publico');
                setConfigPublica(res.data);
            } catch (e) {
                setConfigPublica({ dominios_autorizados: ['unieuro.com.br', 'unieuro.edu.br'], modo_manutencao: false });
            }
        };
        load();
    }, []);

    // Redireciona se já estiver logado
    useEffect(() => {
        if (estaAutenticado) navigate('/app/dashboard', { replace: true });
    }, [estaAutenticado, navigate]);

    // Processa retorno do MSAL automaticamente (Checklist Part 2)
    useEffect(() => {
        if (accounts.length > 0 && !estaAutenticado && inProgress === 'none' && !travaAuthGlobal) {
            travaAuthGlobal = true;
            processarLoginNoBackend(accounts[0]).finally(() => {
                travaAuthGlobal = false;
            });
        }
    }, [accounts, inProgress, estaAutenticado, processarLoginNoBackend]);

    const erroRedirect = searchParams.get('erro');
    const erroFinal = erroRedirect ? 'Erro na autenticação externa.' : null;

    return (
        <div className="light min-h-screen bg-slate-50 flex items-center justify-center p-0 sm:p-6 lg:p-8 transition-colors duration-500">
            <div className="w-full max-w-7xl bg-white sm:rounded-2xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col lg:flex-row min-h-screen sm:min-h-[750px] border-none sm:border border-border animar-entrada">
                
                <LadoEsquerdoInstitucional />

                <div className="flex-1 flex flex-col lg:flex-row items-stretch bg-white -mt-8 lg:mt-0 rounded-t-[32px] lg:rounded-2xl relative z-20">
                    
                    {/* Área Principal de Login */}
                    <div className="flex-1 p-8 lg:p-12 flex flex-col items-center justify-center">
                        <div className="w-full max-w-sm space-y-8">
                            
                            <SecaoLoginMicrosoft 
                                configPublica={configPublica}
                                erro={erroFinal}
                                carregando={inProgress !== 'none'}
                                handleLogin={loginComMicrosoft}
                                isMobile={isMobile}
                            />

                        </div>
                    </div>

                    {!isMobile && (
                        <>
                            <div className="hidden lg:block w-[1px] bg-border self-stretch my-24 opacity-50" />
                            <div className="flex-1 flex flex-col items-center justify-center p-12 relative animate-in slide-in-from-right duration-1000">
                                <PainelQRCode />
                                <div className="mt-8 text-center space-y-3 max-w-[280px]">
                                    <h4 className="text-xl font-black text-slate-900 tracking-tight leading-none">Acesso Rápido</h4>
                                    <p className="text-[12px] text-slate-500 font-bold leading-relaxed">
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

