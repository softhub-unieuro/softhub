import { memo } from 'react';
import { Clock, History, ScrollText, Plus } from 'lucide-react';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { Tooltip } from '@/compartilhado/componentes/Tooltip';

interface CabecalhoPontoProps {
    abaAtiva: 'registro' | 'justificativas';
    onAlternarAba: () => void;
    onNovaJustificativa: () => void;
    podeJustificar: boolean;
}

export const CabecalhoPonto = memo(({
    abaAtiva,
    onAlternarAba,
    onNovaJustificativa,
    podeJustificar
}: CabecalhoPontoProps) => {
    return (
        <CabecalhoFuncionalidade
            titulo="Registro de Presença"
            subtitulo="Registre seu horário e acompanhe suas atividades."
            icone={Clock}
        >
            {podeJustificar && (
                <Tooltip texto={abaAtiva === 'registro' ? "Ver Justificativas" : "Ver Registros"} posicao="bottom">
                    <button
                        onClick={onAlternarAba}
                        className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all ${abaAtiva === 'justificativas'
                                ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20'
                                : 'bg-background border-border text-muted-foreground hover:border-primary/20 hover:text-primary hover:bg-primary/5'
                            }`}
                    >
                        {abaAtiva === 'justificativas' ? (
                            <ScrollText size={16} strokeWidth={2.5} />
                        ) : (
                            <History size={16} strokeWidth={2.5} />
                        )}
                    </button>
                </Tooltip>
            )}

            {podeJustificar && (
                <button
                    onClick={onNovaJustificativa}
                    className="h-10 px-5 bg-primary text-primary-foreground rounded-xl flex items-center gap-2 text-xs font-bold shadow-md shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
                >
                    <Plus size={16} strokeWidth={2.5} />
                    <span>Justificar</span>
                </button>
            )}
        </CabecalhoFuncionalidade>
    );
});
