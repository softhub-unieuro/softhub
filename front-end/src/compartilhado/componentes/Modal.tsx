import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
    aberto: boolean;
    aoFechar: () => void;
    titulo: string;
    children: ReactNode;
    largura?: 'sm' | 'md' | 'lg' | 'xl' | 'auto';
    semHeader?: boolean;
    semBorda?: boolean;
}

/**
 * Modal genérico usado em toda a aplicação.
 * Renderizado no Root (document.body) via Portal para evitar problemas de z-index
 */
export function Modal({ 
    aberto, 
    aoFechar, 
    titulo, 
    children, 
    largura = 'md', 
    semHeader = false,
    semBorda = false 
}: ModalProps) {
    const [montado, setMontado] = useState(false);

    useEffect(() => {
        setMontado(true);

        if (aberto) {
            // Prevenir o layout shift salvando a largura da scrollbar
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = 'hidden';
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }
        } else {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }

        return () => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        };
    }, [aberto]);

    if (!montado || !aberto) return null;

    const larguras = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        auto: 'w-auto max-w-[95vw]'
    };

    const modalElement = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            {/* Overlay Premium: Glassmorphism + Fade In */}
            <div
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-500 pointer-events-auto animate-in fade-in"
                onClick={aoFechar}
                aria-hidden="true"
            />

            {/* Container do Modal: Light Modern Premium */}
            <div
                className={`
                    relative ${largura === 'auto' ? 'w-auto' : 'w-full ' + larguras[largura]} pointer-events-auto
                    bg-white ${semBorda ? 'border-none' : 'border border-slate-200'} rounded-2xl 
                    shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]
                    flex flex-col max-h-[90vh] overflow-hidden transform transition-all
                    animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-400 ease-out
                `}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-titulo"
            >
                {/* Brilho Superior Sutil (Premium Touch) */}
                {!semBorda && (
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                )}

                {/* Header: Clean & Modern */}
                {!semHeader && (
                    <div className="flex items-center justify-between px-8 py-5 shrink-0 border-b border-slate-100 relative bg-gradient-to-b from-slate-50/80 to-white">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
                            <h2 id="modal-titulo" className="text-[13px] font-black text-slate-900 tracking-[0.15em] leading-none uppercase">
                                {titulo}
                            </h2>
                        </div>
                        <button
                            onClick={aoFechar}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all duration-300 focus:outline-none group border border-transparent hover:border-slate-200"
                            aria-label="Fechar modal"
                        >
                            <X className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                    </div>
                )}

                {/* Conteúdo com scroll refinado */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-8 py-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent flex flex-col">
                    {children}
                </div>
            </div>
        </div>
    );


    return createPortal(modalElement, document.body);
}
