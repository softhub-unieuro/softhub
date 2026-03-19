import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { startOfWeek } from 'date-fns';
import { usarPonto } from '@/funcionalidades/ponto/hooks/usarPonto';
import { usarJustificativas } from '@/funcionalidades/ponto/hooks/usarJustificativa';
import { api } from '@/compartilhado/servicos/api';
import type { JustificativaPonto } from '@/funcionalidades/ponto/hooks/usarJustificativa';
import type { RegistroPonto } from '@/funcionalidades/ponto/hooks/usarPonto';

/**
 * Hook para gerenciar a lógica da interface de Bater Ponto.
 */
export function usarInterfacePonto() {
    const { registrosHoje, historico, carregando, erro, baterPonto } = usarPonto();
    const { justificativas, enviarJustificativa, editarJustificativa, excluirJustificativa } = usarJustificativas();

    const [salvando, setSalvando] = useState(false);
    const [erroPonto, setErroPonto] = useState<string | null>(null);
    const [modalJustificativaAberto, setModalJustificativaAberto] = useState(false);
    const [justificativaEditando, setJustificativaEditando] = useState<JustificativaPonto | null>(null);
    const [idExcluindo, setIdExcluindo] = useState<string | null>(null);
    const [abaAtiva, setAbaAtiva] = useState<'registro' | 'justificativas'>('registro');
    const [busca, setBusca] = useState('');
    const [semanaSelecionada, setSemanaSelecionada] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }).getTime());
    const [tentativaBloqueada, setTentativaBloqueada] = useState(false);
    const [janelaTrabalho, setJanelaTrabalho] = useState({ inicio: '13:00', fim: '17:00' });
    const [agoraRelogio, setAgoraRelogio] = useState(new Date());

    const [searchParams] = useSearchParams();
    const abaUrl = searchParams.get('aba');

    // Sincronizar aba pela URL
    useEffect(() => {
        if (abaUrl === 'justificativas') {
            setAbaAtiva('justificativas');
        }
    }, [abaUrl]);

    // Carregar governança (horários permitidos)
    useEffect(() => {
        const carregarGovernanca = async () => {
            try {
                const res = await api.get('/api/configuracoes/publico');
                if (res.data.hora_inicio_ponto && res.data.hora_fim_ponto) {
                    setJanelaTrabalho({
                        inicio: res.data.hora_inicio_ponto,
                        fim: res.data.hora_fim_ponto
                    });
                }
            } catch (e) {
                console.error('Falha ao sincronizar governança de horário');
            }
        };
        carregarGovernanca();
    }, []);

    // Atualizar relógio
    useEffect(() => {
        const interval = setInterval(() => {
            setAgoraRelogio(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const proximoTipo = useMemo(() => {
        const ultimo = registrosHoje.length > 0 ? registrosHoje[0] : null;
        return ultimo?.tipo === 'entrada' ? 'saida' : 'entrada';
    }, [registrosHoje]);

    const foraDoHorario = useMemo(() => {
        const horaBrasiliaStr = agoraRelogio.toLocaleTimeString('pt-BR', { 
            timeZone: 'America/Sao_Paulo', 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        });
        
        const converterParaMinutos = (h: string) => {
            const [horas, minutos] = h.split(':').map(Number);
            return horas * 60 + minutos;
        };

        const agoraMinutos = converterParaMinutos(horaBrasiliaStr);
        const inicioMinutos = converterParaMinutos(janelaTrabalho.inicio);
        const fimMinutos = converterParaMinutos(janelaTrabalho.fim);

        // Se o próximo tipo for 'saida' e houver uma entrada hoje, não bloqueamos visualmente.
        const ultimo = registrosHoje.length > 0 ? registrosHoje[0] : null;
        if (proximoTipo === 'saida' && ultimo?.tipo === 'entrada') {
            return false;
        }

        return agoraMinutos < inicioMinutos || agoraMinutos > fimMinutos;
    }, [agoraRelogio, janelaTrabalho, proximoTipo, registrosHoje]);

    const semanasDisponiveis = useMemo(() => {
        const mapa = new Set<number>();
        historico.forEach(reg => {
            mapa.add(startOfWeek(new Date(reg.registrado_em), { weekStartsOn: 1 }).getTime());
        });
        mapa.add(startOfWeek(new Date(), { weekStartsOn: 1 }).getTime());
        return Array.from(mapa).sort((a, b) => a - b);
    }, [historico]);

    const handleBaterPonto = useCallback(async () => {
        if (salvando) return; // Trava preventiva contra duplo clique
        
        setErroPonto(null);
        setSalvando(true);
        try {
            await baterPonto(proximoTipo);
        } catch (e: any) {
            setErroPonto(e.message);
        } finally {
            setSalvando(false);
        }
    }, [baterPonto, proximoTipo, salvando]);

    const handleSalvarJustificativa = useCallback(async (dados: any) => {
        if (justificativaEditando) {
            await editarJustificativa(justificativaEditando.id, dados);
        } else {
            await enviarJustificativa(dados);
        }
        setModalJustificativaAberto(false);
    }, [justificativaEditando, editarJustificativa, enviarJustificativa]);

    const handleConfirmarExclusao = useCallback(async () => {
        if (idExcluindo) {
            await excluirJustificativa(idExcluindo);
            setIdExcluindo(null);
        }
    }, [idExcluindo, excluirJustificativa]);

    return {
        // Dados
        registrosHoje,
        historico,
        justificativas,
        carregando,
        erro,
        salvando,
        erroPonto,
        proximoTipo,
        agoraRelogio,
        foraDoHorario,
        semanasDisponiveis,
        semanaSelecionada,
        setSemanaSelecionada,
        abaAtiva,
        setAbaAtiva,
        busca,
        setBusca,
        tentativaBloqueada,
        setTentativaBloqueada,
        modalJustificativaAberto,
        setModalJustificativaAberto,
        justificativaEditando,
        setJustificativaEditando,
        idExcluindo,
        setIdExcluindo,

        // Ações
        handleBaterPonto,
        handleSalvarJustificativa,
        handleConfirmarExclusao,
        setErroPonto
    };
}
