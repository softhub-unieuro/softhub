import { memo } from 'react';
import { AlertTriangle, LogIn, LogOut } from 'lucide-react';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { Botao } from '@/compartilhado/componentes/ui/Botao';

interface PainelRelogioProps {
    agoraRelogio: Date;
    foraDaRede?: boolean;
    foraDoHorario?: boolean;
    foraDoDia?: boolean;
    foraDaFabrica?: boolean;
    podeRegistrar: boolean;
    tentativaBloqueada: boolean;
    salvando: boolean;
    carregando: boolean;
    proximoTipo: 'entrada' | 'saida';
    ipDetectado?: string;
    estaNaRede?: boolean;
    aoTentarRegistrar: () => void;
    aoBaterPonto: () => void;
}

export const PainelRelogio = memo(({
    agoraRelogio,
    foraDaRede,
    foraDoHorario,
    foraDoDia,
    foraDaFabrica,
    podeRegistrar,
    tentativaBloqueada,
    salvando,
    carregando,
    proximoTipo,
    ipDetectado,
    estaNaRede,
    aoTentarRegistrar,
    aoBaterPonto
}: PainelRelogioProps) => {
    return (
        <div className="flex flex-col h-full relative">
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
                @keyframes clock-glow {
                    0% { text-shadow: 0 0 0px transparent; }
                    50% { text-shadow: 0 0 30px rgba(var(--primary-rgb), 0.2); }
                    100% { text-shadow: 0 0 0px transparent; }
                }
                .animate-clock { animation: clock-glow 4s ease-in-out infinite; }
            `}} />

            <div
                className={`
                    card-glass flex flex-col items-center justify-center text-center relative overflow-hidden group 
                    h-[350px] sm:h-[400px] transition-all duration-700
                    animate-fade-up hover:bg-card/60 hover:border-primary/30 hover:shadow-primary/5
                    ${tentativaBloqueada ? 'animate-shake border-rose-500/40 shadow-rose-500/5' : ''}
                `}
            >
                {/* Aurora Accent */}
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/10 rounded-full blur-[120px] z-0 opacity-20 pointer-events-none group-hover:opacity-40 transition-all duration-1000 group-hover:scale-125" />

                <div className="relative z-10 space-y-6 sm:space-y-10 w-full px-6">
                    <div className="flex flex-col items-center gap-4">
                        {/* Status Badges Group */}
                        <div className="flex flex-wrap items-center justify-center gap-3 scale-90 sm:scale-110">
                             {(foraDaRede || foraDoHorario || (foraDoDia && foraDaFabrica)) && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm animate-in zoom-in duration-500">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    Acesso Restrito
                                </div>
                            )}
                            {foraDoDia && foraDaFabrica && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-600 text-white border border-rose-700 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-500/20 animate-in slide-in-from-right-2 duration-700">
                                    <AlertTriangle size={11} strokeWidth={3} /> Fábrica Fechada
                                </div>
                            )}
                            {foraDoDia && !foraDaFabrica && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full text-[9px] font-black uppercase tracking-[0.2em] animate-in slide-in-from-right-3 duration-500">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Fora da Escala
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-center">
                            <h2 className={`
                                text-7xl sm:text-9xl font-black tracking-[-0.05em] text-foreground tabular-nums flex items-baseline justify-center select-none animate-clock
                                ${foraDaRede || (foraDoDia && foraDaFabrica) ? 'opacity-40' : ''}
                            `}>
                                {agoraRelogio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                <span className="text-xl sm:text-3xl text-muted-foreground/30 font-bold ml-2 sm:ml-4 tracking-widest">
                                    {agoraRelogio.toLocaleTimeString('pt-BR', { second: '2-digit' })}
                                </span>
                            </h2>
                            
                            {/* Segunda Linha de Contexto */}
                            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 mt-1">
                                {foraDaRede ? 'REDE NÃO RECONHECIDA' : (foraDoHorario ? 'CONEXÃO PROTEGIDA' : 'Sincronizado com Brasília')}
                            </p>

                            <div className="w-20 sm:w-24 h-1 bg-muted/30 rounded-full mt-6 sm:mt-8 overflow-hidden relative border border-border/20">
                                <div
                                    className="absolute inset-y-0 left-0 bg-primary transition-all duration-1000"
                                    style={{ width: `${(agoraRelogio.getSeconds() / 60) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="relative w-full max-w-sm mx-auto">
                        {podeRegistrar ? (
                            <Botao
                                onMouseDown={aoTentarRegistrar}
                                onClick={aoBaterPonto}
                                disabled={carregando || salvando || foraDaRede || !podeRegistrar || foraDoHorario || foraDoDia || foraDaFabrica}
                                carregando={salvando}
                                className={`
                                    w-full py-4 sm:py-5 rounded-[24px] sm:rounded-[32px] text-[11px] sm:text-[12px] font-black uppercase tracking-[0.3em] 
                                    transition-all active:scale-[0.95] border shadow-xl relative z-10
                                    ${proximoTipo === 'entrada'
                                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-emerald-600/40'
                                        : 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20 hover:bg-rose-700 hover:shadow-rose-600/40'
                                    }
                                    ${(foraDaRede || foraDoHorario || (foraDoDia && foraDaFabrica)) ? 'saturate-[0.1] opacity-60' : ''}
                                `}
                                icone={
                                    proximoTipo === 'entrada' ? (
                                        <LogIn size={18} strokeWidth={3} />
                                    ) : (
                                        <LogOut size={18} strokeWidth={3} />
                                    )
                                }
                                rotulo={`Registrar ${proximoTipo}`}
                            />
                        ) : (
                            <div className="p-4 bg-muted/20 border border-dashed border-border rounded-2xl text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 italic">Função de Ponto Administrativa</p>
                            </div>
                        )}

                        {/* Erro Flutuante Localizado */}
                        {(foraDaRede || foraDoHorario || (foraDoDia && foraDaFabrica)) && tentativaBloqueada && (
                            <div className="absolute -top-12 inset-x-0 animate-bounce z-50">
                                <span className="bg-rose-600 text-white text-[9px] font-black py-2 px-5 rounded-full uppercase tracking-widest shadow-2xl border border-rose-500 mx-auto table">
                                    {foraDaRede ? 'Conecte na Rede UNIEURO' : (foraDoHorario ? 'Fora da Janela de Ponto' : 'Fábrica Bloqueada')}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
