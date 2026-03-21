import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

interface CabecalhoFuncionalidadeProps {
    titulo: string;
    subtitulo: string;
    icone: LucideIcon;
    variante?: 'padrao' | 'destaque' | 'perigo';
    children?: React.ReactNode;
}

/**
 * Cabeçalho para funcionalidades do sistema.
 * Design coeso com os stat cards e componentes do sistema.
 */
export function CabecalhoFuncionalidade({
    titulo,
    subtitulo,
    icone: Icone,
    variante = 'padrao',
    children
}: CabecalhoFuncionalidadeProps) {

    const estilosIcone = {
        padrao: 'text-primary bg-primary/10 border-primary/20',
        destaque: 'text-blue-500 bg-blue-50 border-blue-200/40',
        perigo: 'text-destructive bg-destructive/10 border-destructive/20'
    };

    return (
        <div className="animar-entrada">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {/* Ícone — mesmo estilo dos stat cards do sistema */}
                    <div className={`
                        shrink-0 w-11 h-11 flex items-center justify-center
                        rounded-xl border backdrop-blur-sm
                        ${estilosIcone[variante]}
                    `}>
                        <Icone size={22} strokeWidth={1.8} />
                    </div>
                    
                    <div>
                        <h2 className="text-2xl font-bold text-foreground tracking-tight leading-tight">
                            {titulo}
                        </h2>
                        <p className="text-xs text-muted-foreground/50 mt-0.5">
                            {subtitulo}
                        </p>
                    </div>
                </div>

                {children && (
                    <div className="flex items-center gap-2.5">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}
