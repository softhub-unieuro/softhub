import { memo, useMemo, useCallback } from 'react';
import { isSameDay, addDays } from 'date-fns';
import { usarInterfacePonto } from '@/funcionalidades/ponto/hooks/usarInterfacePonto';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { Alerta } from '@/compartilhado/componentes/Alerta';

import { CabecalhoPonto } from './CabecalhoPonto';
import { PainelRelogio } from './PainelRelogio';
import { PainelStatusJornada } from './PainelStatusJornada';
import { HistoricoAbasPonto } from './HistoricoAbasPonto';
import { ModaisPonto } from './ModaisPonto';

/**
 * Interface de registro e visualização diária do ponto.
 * Refatorado para separar lógica e componentes menores.
 */
export const BaterPonto = memo(() => {
    const {
        registrosHoje, historico, justificativas, carregando, erro,
        salvando, erroPonto, proximoTipo, agoraRelogio, foraDoHorario,
        semanasDisponiveis, semanaSelecionada, setSemanaSelecionada,
        abaAtiva, setAbaAtiva, busca, setBusca, tentativaBloqueada, setTentativaBloqueada,
        foraDoDia, diasTrabalho,
        modalJustificativaAberto, setModalJustificativaAberto,
        justificativaEditando, setJustificativaEditando,
        idExcluindo, setIdExcluindo,
        handleBaterPonto, handleSalvarJustificativa, handleConfirmarExclusao, setErroPonto
    } = usarInterfacePonto();

    const podeRegistrar = usarPermissaoAcesso('ponto:registrar');
    const podeJustificar = usarPermissaoAcesso('ponto:justificar');

    // UX Rule: Se a API falhou por causa da rede, tranca o botão proativamente
    const foraDaRede = erro?.includes('rede da UNIEURO') || erroPonto?.includes('rede da UNIEURO');

    // Cronômetro de Jornada Progressivo
    const cronometroJornada = useMemo(() => {
        const ultimoRegistro = registrosHoje.length > 0 ? registrosHoje[0] : null;
        if (!ultimoRegistro || ultimoRegistro.tipo === 'saida') return null;

        const entrada = new Date(ultimoRegistro.registrado_em);
        const diffms = Math.max(0, agoraRelogio.getTime() - entrada.getTime());
        const totalSegundos = Math.floor(diffms / 1000);

        const h = Math.floor(totalSegundos / 3600);
        const m = Math.floor((totalSegundos % 3600) / 60);
        const s = totalSegundos % 60;

        return {
            texto: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
            finalizadoAuto: false // Simplificado na refatoração
        };
    }, [registrosHoje, agoraRelogio]);

    const registrosAgrupados = useMemo(() => {
        // Pega 7 dias a partir do inicio da semana (segunda-feira) e filtra apenas os marcados
        const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(new Date(semanaSelecionada), i))
            .filter(dia => diasTrabalho.includes(dia.getDay()));
            
        return diasSemana.map(dia => ({
            dia,
            registros: historico.filter(reg => isSameDay(new Date(reg.registrado_em), dia))
        }));
    }, [historico, semanaSelecionada, diasTrabalho]);

    const handleAlternarAba = useCallback(() => {
        setAbaAtiva(prev => prev === 'registro' ? 'justificativas' : 'registro');
    }, [setAbaAtiva]);

    const handleNovaJustificativa = useCallback(() => {
        setJustificativaEditando(null);
        setModalJustificativaAberto(true);
    }, [setJustificativaEditando, setModalJustificativaAberto]);

    const handleSemanaAnterior = useCallback(() => {
        const idx = semanasDisponiveis.indexOf(semanaSelecionada);
        if (idx > 0) setSemanaSelecionada(semanasDisponiveis[idx - 1]);
    }, [semanasDisponiveis, semanaSelecionada, setSemanaSelecionada]);

    const handleSemanaProxima = useCallback(() => {
        const idx = semanasDisponiveis.indexOf(semanaSelecionada);
        if (idx < semanasDisponiveis.length - 1) setSemanaSelecionada(semanasDisponiveis[idx + 1]);
    }, [semanasDisponiveis, semanaSelecionada, setSemanaSelecionada]);

    const handleEditarJustificativa = useCallback((just: any) => {
        if (just.status !== 'pendente') return;
        setJustificativaEditando(just);
        setModalJustificativaAberto(true);
    }, [setJustificativaEditando, setModalJustificativaAberto]);

    const handleExcluirJustificativa = useCallback((id: string) => {
        const just = justificativas.find(j => j.id === id);
        if (just?.status === 'pendente') setIdExcluindo(id);
    }, [justificativas, setIdExcluindo]);

    if (carregando && historico.length === 0) return (
        <div className="w-full space-y-6 animate-in fade-in duration-500">
            <div className="h-20 w-full bg-card/60 border border-border/40 rounded-3xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-[400px] bg-card/60 border border-border/40 rounded-3xl animate-pulse" />
                <div className="space-y-6">
                    <div className="h-32 bg-card/60 border border-border/40 rounded-3xl animate-pulse" />
                    <div className="h-[250px] bg-card/60 border border-border/40 rounded-3xl animate-pulse" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full font-sans text-slate-900 animar-entrada">
            <div className="w-full space-y-4">
                <CabecalhoPonto
                    abaAtiva={abaAtiva}
                    onAlternarAba={handleAlternarAba}
                    onNovaJustificativa={handleNovaJustificativa}
                    podeJustificar={podeJustificar}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PainelRelogio
                        agoraRelogio={agoraRelogio}
                        foraDaRede={foraDaRede}
                        foraDoHorario={foraDoHorario}
                        foraDoDia={foraDoDia}
                        podeRegistrar={podeRegistrar}
                        tentativaBloqueada={tentativaBloqueada}
                        salvando={salvando}
                        carregando={carregando}
                        proximoTipo={proximoTipo as 'entrada' | 'saida'}
                        aoTentarRegistrar={() => {
                            if (foraDaRede || foraDoHorario || foraDoDia || !podeRegistrar) {
                                setTentativaBloqueada(true);
                                setTimeout(() => setTentativaBloqueada(false), 500);
                            }
                        }}
                        aoBaterPonto={handleBaterPonto}
                    />

                    <div className="flex flex-col gap-4 w-full">
                        <PainelStatusJornada
                            ultimoRegistro={registrosHoje.length > 0 ? registrosHoje[0] : null}
                            cronometroJornada={cronometroJornada}
                        />

                        <HistoricoAbasPonto
                            abaAtiva={abaAtiva}
                            busca={busca}
                            onMudarBusca={setBusca}
                            semanaSelecionada={semanaSelecionada}
                            semanasDisponiveis={semanasDisponiveis}
                            onSemanaAnterior={handleSemanaAnterior}
                            onSemanaProxima={handleSemanaProxima}
                            registrosAgrupados={registrosAgrupados}
                            justificativas={justificativas}
                            onEditarJustificativa={handleEditarJustificativa}
                            onExcluirJustificativa={handleExcluirJustificativa}
                        />
                    </div>
                </div>

                {(erroPonto || erro) && (
                    <Alerta tipo="erro" mensagem={erroPonto || erro || "Erro desconhecido"} flutuante />
                )}

                <ModaisPonto
                    modalJustificativaAberto={modalJustificativaAberto}
                    onFecharModalJustificativa={setModalJustificativaAberto}
                    justificativaEditando={justificativaEditando}
                    onSalvarJustificativa={handleSalvarJustificativa}
                    idExcluindo={idExcluindo}
                    onFecharConfirmacaoExclusao={setIdExcluindo}
                    onConfirmarExclusao={handleConfirmarExclusao}
                />
            </div>
        </div>
    );
});

export default BaterPonto;
