import { memo } from 'react';
import { Bell, LogOut, QrCode } from 'lucide-react';
import { Avatar } from '@/compartilhado/componentes/Avatar';


interface SidebarFooterProps {
    usuario: any;
    sair: () => void;
    setModalNotificacoes: (b: boolean) => void;
    aoAbrirScanner?: () => void;
    totalNaoLidas: number;
}

export const SidebarFooter = memo(({
    usuario,
    sair,
    setModalNotificacoes,
    aoAbrirScanner,
    totalNaoLidas
}: SidebarFooterProps) => {
    return (
        <div className="shrink-0 px-4 pb-3 pt-2 mt-auto relative z-10 space-y-2 border-t border-sidebar-border/20">
            <button

                onClick={() => setModalNotificacoes(true)}
                className="w-full flex items-center justify-between px-2 group/notif"
            >
                <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
                    Notificações
                </span>
                <div className="relative p-1.5 text-muted-foreground/30 group-hover/notif:text-primary transition-colors">
                    <Bell size={16} />
                    {totalNaoLidas > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-[8px] font-bold text-white rounded-sm flex items-center justify-center">
                            {totalNaoLidas}
                        </span>
                    )}
                </div>
            </button>

            {aoAbrirScanner && (
                <button
                    onClick={aoAbrirScanner}
                    className="lg:hidden w-full flex items-center justify-between px-2 group/qr"
                >
                    <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
                        Scannear QR
                    </span>
                    <div className="relative p-1.5 text-muted-foreground/30 group-hover/qr:text-primary transition-colors">
                        <QrCode size={16} />
                    </div>
                </button>
            )}

            <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-sidebar-border/30 hover:bg-white/60 dark:hover:bg-white/[0.08] transition-all duration-300 shadow-sm group/footer">
                <Avatar nome={usuario?.nome || 'User'} fotoPerfil={usuario?.foto_perfil} tamanho="sm" className="ring-2 ring-white/10 dark:ring-black/10 shrink-0" />
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[10px] font-black text-sidebar-foreground truncate leading-tight uppercase tracking-tight">
                        {usuario?.nome}
                    </span>
                    <span className="text-[9px] text-muted-foreground/60 truncate leading-none mt-1">
                        {usuario?.email}
                    </span>
                </div>
                <button
                    onClick={sair}
                    className="p-1.5 text-muted-foreground/40 group-hover/footer:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all active:scale-90 shrink-0"
                    title="Sair"
                >
                    <LogOut size={14} />
                </button>
            </div>
        </div>
    );
});
