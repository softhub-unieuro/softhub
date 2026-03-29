import { memo } from 'react';
import { Clock, History, ScrollText, Plus } from 'lucide-react';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { Tooltip } from '@/compartilhado/componentes/Tooltip';
import { Botao } from '@/compartilhado/componentes/ui/Botao';

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
                    <Botao
                        variante={abaAtiva === 'justificativas' ? 'primario' : 'contorno'}
                        tamanho="icone"
                        onClick={onAlternarAba}
                        className={`w-10 h-10 rounded-xl transition-all ${
                            abaAtiva === 'justificativas'
                                ? 'shadow-lg shadow-primary/20'
                                : 'text-muted-foreground hover:border-primary/20 hover:text-primary hover:bg-primary/5'
                        }`}
                        icone={abaAtiva === 'justificativas' ? (
                            <ScrollText size={16} strokeWidth={2.5} />
                        ) : (
                            <History size={16} strokeWidth={2.5} />
                        )}
                    />
                </Tooltip>
            )}

            {podeJustificar && (
                <Botao
                    variante="primario"
                    onClick={onNovaJustificativa}
                    className="h-10 px-5 rounded-xl flex items-center gap-2 text-xs font-bold shadow-md shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
                    icone={<Plus size={16} strokeWidth={2.5} />}
                    rotulo="Justificar"
                />
            )}
        </CabecalhoFuncionalidade>
    );
});
