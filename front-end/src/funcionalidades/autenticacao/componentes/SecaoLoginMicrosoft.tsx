import { memo } from 'react';
import { Info, Download } from 'lucide-react';
import { Alerta } from '@/compartilhado/componentes/Alerta';

interface SecaoLoginMicrosoftProps {
    configPublica: any;
    erro: string | null;
    carregando: boolean;
    handleLogin: () => void;
    isMobile: boolean;
    deferredPrompt?: any;
    handleInstallClick?: () => void;
}

export const SecaoLoginMicrosoft = memo(({
    configPublica,
    erro,
    carregando,
    handleLogin,
    isMobile,
    deferredPrompt,
    handleInstallClick
}: SecaoLoginMicrosoftProps) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center animar-entrada atraso-2">
            <div className="space-y-8 lg:space-y-12 w-full max-w-sm">
                <div className="space-y-4 text-center lg:text-left">
                    <div className="inline-flex py-1 px-3 bg-red-500/5 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-full leading-none border border-red-500/10">
                        Bem-vindo de volta
                    </div>
                    <h3 className="text-[28px] lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">Inicie agora.</h3>
                    <p className="text-slate-600 font-bold text-xs lg:text-sm leading-relaxed max-w-[280px] lg:max-w-none mx-auto lg:mx-0 pr-0 lg:pr-8">
                        Acesse a plataforma da Fábrica de Software com seu login institucional.
                    </p>
                </div>

                {configPublica?.modo_manutencao && (
                    <Alerta tipo="info" mensagem="O sistema está em manutenção. Apenas administradores podem entrar." flutuante />
                )}

                {erro && (
                    <Alerta tipo="erro" mensagem={erro} flutuante />
                )}

                <div className="space-y-6 lg:space-y-8">
                <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap justify-center lg:justify-start">
                    {/* BOTÃO OFICIAL MICROSOFT — NÃO ALTERAR */}
                    <button
                        onClick={handleLogin}
                        disabled={carregando}
                        className="w-fit flex items-center h-[41px] bg-[#2F2F2F] disabled:opacity-50 px-[12px] gap-[12px] border border-[#2F2F2F] transition-all hover:brightness-110 active:scale-[0.98] shrink-0"
                        style={{ 
                            fontFamily: "'Segoe UI', 'Segoe UI Web (West European)', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif",
                            borderRadius: '2px',
                        }}
                    >
                        <div className="flex shrink-0">
                            <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="0" y="0" width="10" height="10" fill="#F25022" />
                                <rect x="11" y="0" width="10" height="10" fill="#7FBA00" />
                                <rect x="0" y="11" width="10" height="10" fill="#00A4EF" />
                                <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
                            </svg>
                        </div>
                        <span className="text-[15px] text-white leading-none whitespace-nowrap" style={{ fontWeight: 600 }}>Entrar com Microsoft</span>
                    </button>

                    {carregando && (
                        <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
                            {/* Spinner Orbital Premium (Checklist UX Part 5) */}
                            <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                                {/* Órbita Externa (Lenta) */}
                                <div className="absolute inset-0 border-[1.5px] border-slate-100 rounded-full" />
                                <div className="absolute inset-0 border-t-[1.5px] border-l-[1.5px] border-red-500 rounded-full animate-[spin_1.2s_linear_infinite]" />
                                
                                {/* Órbita Interna (Rápida - Sentido Inverso) */}
                                <div className="w-[18px] h-[18px] border-b-[2px] border-amber-500/60 rounded-full animate-[spin_0.8s_linear_infinite_reverse]" />
                                
                                {/* Núcleo Pulsante */}
                                <div className="absolute w-[6px] h-[6px] bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
                            </div>
                        </div>
                    )}
                </div>


                    <div className="flex items-center justify-center lg:justify-start gap-1.5 text-slate-500 text-[11px] lg:text-[11.5px] font-medium">
                        <Info size={11} className="shrink-0" />
                        <span>
                            Use seu e-mail institucional ({ (configPublica?.dominios_autorizados || ['unieuro.com.br']).map((d: string) => `@${d}`).join(' ou ') })
                        </span>
                    </div>

                    {isMobile && (
                        <div className="pt-10 border-t border-slate-100/50">
                            <div className="mb-4">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Experiência Mobile</span>
                            </div>
                            <button
                                onClick={handleInstallClick}
                                className={`w-full flex items-center justify-center h-16 rounded-2xl transition-all active:scale-[0.95] group relative overflow-hidden ${
                                    deferredPrompt 
                                    ? 'bg-blue-600 shadow-lg shadow-blue-200 text-white' 
                                    : 'bg-slate-50 border border-slate-100 text-slate-400 cursor-default'
                                }`}
                            >
                                <div className="flex items-center gap-3 z-10">
                                    <div className={`p-2.5 rounded-xl transition-all ${
                                        deferredPrompt ? 'bg-white/20' : 'bg-slate-200/50'
                                    }`}>
                                        <Download size={18} className={deferredPrompt ? 'animate-bounce' : ''} />
                                    </div>
                                    <div className="text-left flex flex-col">
                                        <span className={`text-[11px] font-black uppercase tracking-widest leading-none ${
                                            deferredPrompt ? 'text-white' : 'text-slate-500'
                                        }`}>
                                            {deferredPrompt ? 'Instalar App' : 'App Disponível'}
                                        </span>
                                        <span className={`text-[9px] mt-1 font-bold ${
                                            deferredPrompt ? 'text-white/70' : 'text-slate-400'
                                        }`}>
                                            {deferredPrompt ? 'Pronto para uso offline' : 'PWA Otimizado para SoftHub'}
                                        </span>
                                    </div>
                                </div>
                                {deferredPrompt && (
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 animate-pulse" />
                                )}
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
});
