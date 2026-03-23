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
                    {/* BOTÃO OFICIAL MICROSOFT — NÃO ALTERAR */}
                    <button
                        onClick={handleLogin}
                        disabled={carregando}
                        className="w-full flex items-center h-[41px] bg-[#2F2F2F] disabled:opacity-50 px-[12px] gap-[12px] border border-[#2F2F2F]"
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

                    <div className="flex items-center justify-center lg:justify-start gap-1.5 text-slate-500 text-[11px] lg:text-[11.5px] font-medium">
                        <Info size={11} className="shrink-0" />
                        <span>
                            Use seu e-mail institucional ({ (configPublica?.dominios_autorizados || ['unieuro.com.br']).map((d: string) => `@${d}`).join(' ou ') })
                        </span>
                    </div>

                    {isMobile && deferredPrompt && (
                        <div className="pt-8 border-t border-border/10">
                            <button
                                onClick={handleInstallClick}
                                className="w-full flex items-center justify-center h-14 bg-accent/5 hover:bg-accent/10 rounded-2xl transition-all active:scale-[0.98] group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-2xl text-primary opacity-60 group-hover:opacity-100 transition-opacity">
                                        <Download size={18} />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">Instalar Aplicativo</span>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
