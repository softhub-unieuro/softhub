import { memo } from 'react';
import { AlertTriangle, LogIn, LogOut } from 'lucide-react';
import { Carregando } from '@/compartilhado/componentes/Carregando';

interface PainelRelogioProps {
    agoraRelogio: Date;
    foraDaRede?: boolean;
    foraDoHorario?: boolean;
    podeRegistrar: boolean;
    tentativaBloqueada: boolean;
    salvando: boolean;
    carregando: boolean;
    proximoTipo: 'entrada' | 'saida';
    aoTentarRegistrar: () => void;
    aoBaterPonto: () => void;
}

export const PainelRelogio = memo(({
    agoraRelogio,
    foraDaRede,
    foraDoHorario,
    podeRegistrar,
    tentativaBloqueada,
    salvando,
    carregando,
    proximoTipo,
    aoTentarRegistrar,
    aoBaterPonto
}: PainelRelogioProps) => {
    return (
        <div className="flex flex-col h-full relative">
            {/* Ultra-Premium Animation Suite */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-6px); }
                    75% { transform: translateX(6px); }
                }
                .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
                @keyframes security-pulse {
                    0% { opacity: 0; transform: scale(0.9); }
                    50% { opacity: 0.15; transform: scale(1); }
                    100% { opacity: 0; transform: scale(1.1); }
                }
                .animate-security { animation: security-pulse 2s infinite; }
                @keyframes shine-sweep {
                    0% { left: -100%; opacity: 0; }
                    20% { opacity: 0.5; }
                    40% { left: 100%; opacity: 0; }
                    100% { left: 100%; opacity: 0; }
                }
                .animate-shine { position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); transform: skewX(-20deg); animation: shine-sweep 6s infinite; }
                @keyframes fade-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-up { animation: fade-up 0.8s cubic-bezier(.22,1,.36,1) forwards; }
                @keyframes progress-scan {
                    0% { left: -10%; }
                    100% { left: 110%; }
                }
                .animate-scan { animation: progress-scan 2s linear infinite; }
            `}} />

            <div
                className={`
                    card-glass flex flex-col items-center justify-center text-center relative overflow-hidden group 
                    h-[320px] sm:h-[400px] transition-all duration-700
                    animate-fade-up hover:bg-card/60 hover:border-primary/30 hover:shadow-primary/5
                    ${tentativaBloqueada ? 'animate-shake border-rose-500/40 shadow-rose-500/5' : ''}
                `}
            >
                {/* Visual Shine Effect */}
                <div className="animate-shine z-0" />

                {/* Visual Security Overlay - Active when locked */}
                {(foraDaRede || foraDoHorario) && (
                    <div className="absolute inset-0 bg-rose-500/5 animate-security pointer-events-none z-0" />
                )}

                {/* Aurora Accent */}
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/10 rounded-full blur-[120px] z-0 opacity-20 pointer-events-none group-hover:opacity-40 transition-all duration-1000 group-hover:scale-125" />

                <div className="relative z-10 space-y-8 sm:space-y-12 w-full px-6">
                    <div className="space-y-3 sm:space-y-5">
                        <div className="inline-flex items-center gap-3 px-5 py-2 bg-slate-950/[0.04] rounded-full border border-slate-900/5 mb-2 backdrop-blur-sm group-hover:bg-primary/5 group-hover:border-primary/10 transition-colors">
                            <div className={`w-2 h-2 rounded-full ${foraDaRede || foraDoHorario ? 'bg-rose-500' : 'bg-primary animate-pulse'}`} />
                            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 group-hover:text-primary transition-colors">
                                {foraDaRede || foraDoHorario ? 'Acesso Restrito' : 'Horário de Brasília'}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <h2 className="text-6xl sm:text-8xl font-black tracking-[-0.05em] text-foreground tabular-nums flex items-baseline justify-center drop-shadow-sm">
                                {agoraRelogio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                <span className="text-lg sm:text-2xl text-muted-foreground/40 font-bold ml-2 sm:ml-3 select-none tracking-widest">
                                    {agoraRelogio.toLocaleTimeString('pt-BR', { second: '2-digit' })}
                                </span>
                            </h2>
                            <div className="w-16 sm:w-20 h-1 bg-muted/30 rounded-full mt-3 sm:mt-4 overflow-hidden relative border border-border/20">
                                <div
                                    className="absolute inset-y-0 left-0 bg-primary transition-all duration-1000"
                                    style={{ width: `${(agoraRelogio.getSeconds() / 60) * 100}%` }}
                                />
                                <div className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-scan z-10" />
                            </div>
                        </div>
                    </div>

                    <div className="relative w-full max-w-sm mx-auto">
                        <button
                            onMouseDown={aoTentarRegistrar}
                            onClick={aoBaterPonto}
                            disabled={carregando || salvando || foraDaRede || foraDoHorario || !podeRegistrar}
                            className={`
                                w-full py-3.5 sm:py-4 rounded-2xl sm:rounded-3xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] 
                                transition-all active:scale-[0.97] border shadow-xl relative z-10
                                disabled:cursor-not-allowed
                                ${proximoTipo === 'entrada'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700'
                                    : 'bg-rose-600 text-white border-rose-600 shadow-rose-600/20 hover:bg-rose-700'
                                }
                                ${(foraDaRede || foraDoHorario) ? 'saturate-[0.2] opacity-80' : ''}
                            `}
                        >
                            {salvando ? (
                                <Carregando Centralizar={false} tamanho="sm" className="border-t-white border-white/30" />
                            ) : (
                                <div className="flex items-center justify-center gap-2 sm:gap-3">
                                    {foraDaRede || foraDoHorario ? (
                                        <AlertTriangle size={14} className="sm:w-4 sm:h-4" strokeWidth={3} />
                                    ) : proximoTipo === 'entrada' ? (
                                        <LogIn size={14} className="sm:w-4 sm:h-4" strokeWidth={3} />
                                    ) : (
                                        <LogOut size={14} className="sm:w-4 sm:h-4" strokeWidth={3} />
                                    )}
                                    <span>Registrar {proximoTipo}</span>
                                </div>
                            )}
                        </button>

                        {/* Locked State Tooltip-like hint */}
                        {(foraDaRede || foraDoHorario) && tentativaBloqueada && (
                            <div className="absolute -bottom-14 inset-x-0 animate-bounce">
                                <span className="bg-rose-600 text-white text-[9px] font-black py-1.5 px-4 rounded-full uppercase tracking-widest shadow-lg">
                                    Acesso Negado: Fora da Rede/Horário
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
