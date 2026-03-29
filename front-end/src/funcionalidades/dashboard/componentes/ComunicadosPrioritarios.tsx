import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatarTempoAtras } from '@/utilitarios/formatadores';
import { AlertTriangle, Info, Bell, ChevronRight } from 'lucide-react';

import { Botao } from '@/compartilhado/componentes/ui/Botao';

interface ComunicadosProps {
    avisos: any[];
}

const CONFIG_PRIORIDADE: Record<string, { 
    icone: typeof AlertTriangle; 
    cor: string; 
    bgIcone: string;
    label: string;
}> = {
    urgente: { 
        icone: AlertTriangle, 
        cor: 'text-red-400', 
        bgIcone: 'bg-red-500/10 border-red-500/20',
        label: 'Urgente' 
    },
    importante: { 
        icone: Bell, 
        cor: 'text-amber-400', 
        bgIcone: 'bg-amber-500/10 border-amber-500/20',
        label: 'Importante' 
    },
    info: { 
        icone: Info, 
        cor: 'text-blue-400', 
        bgIcone: 'bg-blue-500/10 border-blue-500/20',
        label: 'Informativo' 
    },
};

export const ComunicadosPrioritarios = memo(({ avisos }: ComunicadosProps) => {
    const navegar = useNavigate();

    if (!avisos || avisos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-white/5">
                <span className="text-2xl mb-2">📭</span>
                <p className="text-xs text-muted-foreground/30 font-medium">Sem avisos no momento</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {avisos.map((aviso, index) => {
                const config = CONFIG_PRIORIDADE[aviso.prioridade] || CONFIG_PRIORIDADE.info;
                const Icone = config.icone;

                return (
                    <Botao 
                        key={aviso.id}
                        variante="fantasma"
                        onClick={() => navegar(`/app/avisos?destaque=${aviso.id}`)}
                        className="w-full text-left group bg-card/30 hover:bg-card/50 border border-white/[0.06] hover:border-white/10 rounded-2xl p-4 transition-all duration-300 active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-3.5">
                            {/* Ícone de prioridade */}
                            <div className={`shrink-0 w-8 h-8 rounded-xl ${config.bgIcone} border flex items-center justify-center`}>
                                <Icone className={`w-3.5 h-3.5 ${config.cor}`} />
                            </div>

                            {/* Conteúdo */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${config.cor}`}>
                                        {config.label}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/25 font-medium shrink-0">
                                        {formatarTempoAtras(aviso.criado_em)}
                                    </span>
                                </div>
                                <h4 className="text-sm font-semibold text-foreground/90 leading-snug group-hover:text-primary transition-colors truncate">
                                    {aviso.titulo}
                                </h4>
                            </div>

                            {/* Seta */}
                            <ChevronRight className="w-4 h-4 text-muted-foreground/15 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                    </Botao>
                );
            })}
        </div>
    );
});
