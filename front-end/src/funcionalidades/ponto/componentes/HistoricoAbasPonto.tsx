import { memo, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Botao } from '@/compartilhado/componentes/ui/Botao';
import { isSameDay, startOfWeek, isToday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarraBusca } from '@/compartilhado/componentes/BarraBusca';
import { DayCard } from './DayCard';
import { ListaJustificativas } from './ListaJustificativas';
import type { JustificativaPonto } from '@/funcionalidades/ponto/hooks/usarJustificativa';
import type { RegistroPonto } from '@/funcionalidades/ponto/hooks/usarPonto';

interface HistoricoAbasPontoProps {
    abaAtiva: 'registro' | 'justificativas';
    busca: string;
    onMudarBusca: (v: string) => void;
    semanaSelecionada: number;
    semanasDisponiveis: number[];
    onSemanaAnterior: () => void;
    onSemanaProxima: () => void;
    registrosAgrupados: { dia: Date, registros: any[] }[];
    justificativas: JustificativaPonto[];
    onEditarJustificativa: (j: JustificativaPonto) => void;
    onExcluirJustificativa: (id: string) => void;
}

export const HistoricoAbasPonto = memo(({
    abaAtiva,
    busca,
    onMudarBusca,
    semanaSelecionada,
    semanasDisponiveis,
    onSemanaAnterior,
    onSemanaProxima,
    registrosAgrupados,
    justificativas,
    onEditarJustificativa,
    onExcluirJustificativa
}: HistoricoAbasPontoProps) => {
    const indiceSemanaAtual = semanasDisponiveis.indexOf(semanaSelecionada);

    const justificativasFiltradas = useMemo(() => {
        return justificativas.filter(j => 
            j.motivo.toLowerCase().includes(busca.toLowerCase()) || 
            j.tipo.toLowerCase().includes(busca.toLowerCase())
        );
    }, [justificativas, busca]);

    return (
        <div className="card-glass p-4 sm:p-8 flex flex-col card-glass-hover max-h-[850px] sm:max-h-[800px]">

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4 sm:gap-6 shrink-0">
                <div className="space-y-0.5 sm:space-y-1">
                    <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Linha do Tempo</h3>
                    <p className="text-lg sm:text-[24px] font-black text-slate-900 tracking-tight">
                        {abaAtiva === 'registro' ? 'Atividade da Semana' : 'Justificativas Enviadas'}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    {abaAtiva === 'registro' && semanasDisponiveis.length > 1 && (
                        <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-950/[0.03] p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-slate-950/5 backdrop-blur-sm w-full sm:w-auto">
                            <Botao 
                                variante="fantasma"
                                tamanho="icone"
                                onClick={onSemanaAnterior}
                                disabled={indiceSemanaAtual <= 0}
                                className="h-8 w-8 hover:bg-white hover:shadow-sm rounded-lg sm:rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed text-slate-600"
                                icone={<ChevronLeft className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />}
                            />
                            <div className="px-2 sm:px-3 flex-1 sm:flex-none sm:min-w-[120px] text-center">
                                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                                    {isSameDay(new Date(semanaSelecionada), startOfWeek(new Date(), { weekStartsOn: 1 })) 
                                        ? 'Esta Semana' 
                                        : format(new Date(semanaSelecionada), "'Semana' dd/MM", { locale: ptBR })}
                                </span>
                            </div>
                            <Botao 
                                variante="fantasma"
                                tamanho="icone"
                                onClick={onSemanaProxima}
                                disabled={indiceSemanaAtual >= semanasDisponiveis.length - 1}
                                className="h-8 w-8 hover:bg-white hover:shadow-sm rounded-lg sm:rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed text-slate-600"
                                icone={<ChevronRight className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />}
                            />
                        </div>
                    )}

                    <div className="relative w-full sm:w-56">
                        <BarraBusca
                            valor={busca}
                            aoMudar={onMudarBusca}
                            placeholder="Buscar..."
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto sm:overflow-y-auto scrollbar-none pb-2 sm:pb-0 sm:pr-1">
                {abaAtiva === 'registro' ? (
                    <div 
                        className="flex sm:grid gap-3 w-max sm:w-full min-w-full"
                        style={{ gridTemplateColumns: `repeat(${registrosAgrupados.length}, minmax(0, 1fr))` }}
                    >
                        {registrosAgrupados.map(({ dia, registros }) => (
                            <div key={dia.toISOString()} className="w-[140px] sm:w-full shrink-0 h-full">
                                <DayCard
                                    dia={dia}
                                    registros={registros}
                                    hoje={isToday(dia)}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <ListaJustificativas
                        justificativas={justificativasFiltradas}
                        aoEditar={onEditarJustificativa}
                        aoExcluir={onExcluirJustificativa}
                    />
                )}
            </div>
        </div>
    );
});
