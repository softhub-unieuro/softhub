import { memo, useMemo, useCallback } from 'react';
import { Layers } from 'lucide-react';
import { isSameDay, addDays, isToday } from 'date-fns';
import { usarInterfacePonto } from '@/funcionalidades/ponto/hooks/usarInterfacePonto';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { usarConfiguracoes } from '@/funcionalidades/admin/hooks/usarConfiguracoes';
import { Alerta } from '@/compartilhado/componentes/Alerta';

import { CabecalhoPonto } from './CabecalhoPonto';
import { PainelRelogio } from './PainelRelogio';
import { PainelStatusJornada } from './PainelStatusJornada';
import { HistoricoAbasPonto } from './HistoricoAbasPonto';
import { ModaisPonto } from './ModaisPonto';

import { formatarHoras } from '@/utilitarios/formatadores';

/**
 * Interface de registro e visualização diária do ponto.
 * Refatorado para separar lógica e componentes menores.
 */
export const BaterPonto = memo(() => {
    const {
        usuario, registrosHoje, historico, justificativas, carregando, erro,
        salvando, erroPonto, proximoTipo, agoraRelogio, foraDoHorario,
        semanasDisponiveis, semanaSelecionada, setSemanaSelecionada,
        abaAtiva, setAbaAtiva, busca, setBusca, tentativaBloqueada, setTentativaBloqueada,
        foraDoDia, foraDaFabrica, diasTrabalho, estaNaRede, ipDetectado,
        modalJustificativaAberto, setModalJustificativaAberto,
        justificativaEditando, setJustificativaEditando,
        idExcluindo, setIdExcluindo,
        handleBaterPonto, handleSalvarJustificativa, handleConfirmarExclusao, setErroPonto
    } = usarInterfacePonto();

    const podeRegistrar = usarPermissaoAcesso('ponto:registrar');
    const podeJustificar = usarPermissaoAcesso('ponto:justificar');

    // UX Rule: Se a API diz que não estamos na rede, ou se falou por causa da rede antes
    // Administradores são SEMPRE considerados "na rede" na interface para não desabilitar o botão.
    const ehAdmin = usuario?.role === 'ADMIN';
    const erroConhecidoRede = (e: string | null) => e ? (e.includes('restrição de rede') || e.includes('UNIEURO')) : false;
    const foraDaRede = !ehAdmin && (!estaNaRede || erroConhecidoRede(erro) || erroConhecidoRede(erroPonto));

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

    const { registrosAgrupados, totalAcumuladoSemana } = useMemo(() => {
        const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(new Date(semanaSelecionada), i))
            .filter(dia =>
                diasTrabalho.includes(dia.getDay()) ||
                [...historico, ...registrosHoje].some(reg => isSameDay(new Date(reg.registrado_em), dia))
            );

        const agrupados = diasSemana.map(dia => ({
            dia,
            registros: historico.filter(reg => isSameDay(new Date(reg.registrado_em), dia))
        }));

        // Cálculo dinâmico do total da semana (em minutos)
        let minutosTotais = 0;
        const historicoSemana = [...historico]
            .filter(r => {
                const d = new Date(r.registrado_em);
                const s = new Date(semanaSelecionada);
                return d >= s && d < addDays(s, 7);
            })
            .sort((a, b) => new Date(a.registrado_em).getTime() - new Date(b.registrado_em).getTime());

        for (let i = 0; i < historicoSemana.length; i++) {
            const registro = historicoSemana[i];
            const proximo = historicoSemana[i + 1];

            if (registro.tipo === 'entrada') {
                if (proximo?.tipo === 'saida') {
                    // Sessão fechada
                    const entrada = new Date(registro.registrado_em);
                    const saida = new Date(proximo.registrado_em);
                    minutosTotais += Math.floor((saida.getTime() - entrada.getTime()) / (1000 * 60));
                    i++;
                } else {
                    // Sessão aberta (ponto ativo agora)
                    const entrada = new Date(registro.registrado_em);
                    const diffms = Math.max(0, agoraRelogio.getTime() - entrada.getTime());
                    minutosTotais += Math.floor(diffms / (1000 * 60));
                }
            }
        }

        return {
            registrosAgrupados: agrupados,
            totalAcumuladoSemana: minutosTotais
        };
    }, [historico, semanaSelecionada, diasTrabalho, agoraRelogio]);

    const { configuracoes } = usarConfiguracoes();
    const metaConfig = configuracoes?.meta_semanal_horas || 20;

    // Dados da Meta (Dinâmico via Configurações)
    const META_SEMANAL_MINUTOS = metaConfig * 60;
    const porcentagemMeta = Math.min(100, (totalAcumuladoSemana / META_SEMANAL_MINUTOS) * 100);

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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                    {/* Painel de Controle (Relógio) */}
                    <div className="lg:col-span-5 h-full">
                        <PainelRelogio
                            agoraRelogio={agoraRelogio}
                            foraDaRede={foraDaRede}
                            foraDoHorario={foraDoHorario}
                            foraDoDia={foraDoDia}
                            foraDaFabrica={foraDaFabrica}
                            podeRegistrar={podeRegistrar}
                            tentativaBloqueada={tentativaBloqueada}
                            salvando={salvando}
                            carregando={carregando}
                            proximoTipo={proximoTipo as 'entrada' | 'saida'}
                            ipDetectado={ipDetectado}
                            aoTentarRegistrar={() => {
                                const bloqueado = (foraDoHorario || foraDoDia || foraDaFabrica);
                                if (bloqueado || foraDaRede || !podeRegistrar) {
                                    setTentativaBloqueada(true);
                                    setTimeout(() => setTentativaBloqueada(false), 500);
                                }
                            }}
                            aoBaterPonto={() => {
                                if (foraDoHorario || foraDoDia || foraDaFabrica) return;
                                handleBaterPonto();
                            }}
                        />
                    </div>

                    {/* Status Rápidos (Cards Horizontais) */}
                    <div className="lg:col-span-7 flex flex-col h-full">
                        <PainelStatusJornada
                            ultimoRegistro={registrosHoje.length > 0 ? registrosHoje[0] : null}
                            cronometroJornada={cronometroJornada}
                        />
                        {/* Info Card: Meta e Escala */}
                        <div className="mt-6 flex-1 bg-card border border-border/60 rounded-[32px] p-8 shadow-sm relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                                    <Layers size={14} /> Meta Semanal
                                </h3>
                                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded tracking-widest">OBJETIVO: {META_SEMANAL_MINUTOS / 60}H</span>
                            </div>

                            <div className="space-y-4 relative z-10">
                                <div className="flex items-end justify-between">
                                    <span className="text-3xl font-black text-foreground tracking-tighter">
                                        {formatarHoras(totalAcumuladoSemana)}
                                        <span className="text-sm text-muted-foreground/40 font-bold ml-1 uppercase">Acumulado</span>
                                    </span>
                                    <span className="text-[10px] font-black text-muted-foreground tracking-widest italic">{Math.round(porcentagemMeta)}% concluído</span>
                                </div>
                                <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden border border-border/20">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)] transition-all duration-1000 origin-left"
                                        style={{ width: `${porcentagemMeta}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground/60 font-medium leading-relaxed italic">
                                    {porcentagemMeta >= 100
                                        ? "Meta batida! Você completou suas horas da semana. Excelente trabalho!"
                                        : configuracoes?.mensagem_meta_semanal || "A semana está só começando. Mantenha o foco e a consistência!"}
                                </p>
                            </div>

                            {/* Pattern Decoration */}
                            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        </div>
                    </div>
                </div>

                {/* HISTÓRICO FULL WIDTH - O GRANDE DESTAQUE */}
                <div className="mt-6 pt-2">
                    <HistoricoAbasPonto
                        abaAtiva={abaAtiva}
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
