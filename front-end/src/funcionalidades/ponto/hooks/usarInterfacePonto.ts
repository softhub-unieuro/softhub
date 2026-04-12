import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { startOfWeek } from 'date-fns';
import { usarPonto } from '@/funcionalidades/ponto/hooks/usarPonto';
import { usarJustificativas } from '@/funcionalidades/ponto/hooks/usarJustificativa';
import { api } from '@/compartilhado/servicos/api';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import type { JustificativaPonto } from '@/funcionalidades/ponto/hooks/usarJustificativa';
import type { RegistroPonto } from '@/funcionalidades/ponto/hooks/usarPonto';

/**
 * Hook para gerenciar a lógica da interface de Bater Ponto.
 */
export function usarInterfacePonto() {
    const { usuario } = usarAutenticacao();
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
    const [diasTrabalhoFabrica, setDiasTrabalhoFabrica] = useState<number[]>([1, 2, 3, 4, 5]);
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
                if (Array.isArray(res.data.dias_trabalho)) {
                    setDiasTrabalhoFabrica(res.data.dias_trabalho);
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

    const diasTrabalho = useMemo(() => {
        if (!usuario?.escala_dias) return diasTrabalhoFabrica;

        const raw = usuario.escala_dias;
        const nomesDias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

        // Se for o formato novo com PIPE
        if (raw.includes('|') || raw.includes(':')) {
            const partes = raw.split('|');
            const fixos = (partes.find(p => p.startsWith('FIXO:'))?.split(':')[1]?.split(',') || []).map(d => d.trim().toLowerCase());
            const altes = (partes.find(p => p.startsWith('ALTE:'))?.split(':')[1]?.split(',') || []).map(d => d.trim().toLowerCase());

            // Mapeia nomes para números
            const diasFixo = fixos.map(n => nomesDias.indexOf(n)).filter(i => i !== -1);
            const diasAlte = altes.map(n => nomesDias.indexOf(n)).filter(i => i !== -1);

            return [...new Set([...diasFixo, ...diasAlte])];
        }

        // Formato legatário (apenas números separados por vírgula)
        return raw.split(',').map(Number);
    }, [usuario, diasTrabalhoFabrica]);



    const foraDoHorario = useMemo(() => {
        const horaBrasiliaStr = agoraRelogio.toLocaleTimeString('pt-BR', { 
            timeZone: 'America/Sao_Paulo', 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        });
        
        const converterParaMinutos = (h: string) => {
            const [horas, minutos] = h.split(':').map(Number);
            return (horas || 0) * 60 + (minutos || 0);
        };

        const agoraMinutos = converterParaMinutos(horaBrasiliaStr);
        const inicioMinutos = converterParaMinutos(janelaTrabalho.inicio);
        const fimMinutos = converterParaMinutos(janelaTrabalho.fim);

        // Tolerância de 15 minutos para entrada/saída
        const TOLERANCIA = 15;

        // Se for SAÍDA e estiver logado, permitimos sempre (Regra de Ouro)
        if (proximoTipo === 'saida') return false;

        return agoraMinutos < (inicioMinutos - TOLERANCIA) || agoraMinutos > (fimMinutos + TOLERANCIA);
    }, [agoraRelogio, janelaTrabalho, proximoTipo]);

    const foraDoDia = useMemo(() => {
        const diaHoje = agoraRelogio.getDay();
        // Se for SAÍDA, permitimos mesmo que o dia tenha virado (ex: passou de meia noite)
        if (proximoTipo === 'saida') return false;
        
        return !diasTrabalho.includes(diaHoje);
    }, [agoraRelogio, diasTrabalho, proximoTipo]);

    const foraDaFabrica = useMemo(() => {
        const diaHoje = agoraRelogio.getDay();
        // Se for SAÍDA, permitimos registrar a saída mesmo se a fábrica fechar (ex: fim do expediente)
        if (proximoTipo === 'saida') return false;

        return !diasTrabalhoFabrica.includes(diaHoje);
    }, [agoraRelogio, diasTrabalhoFabrica, proximoTipo]);


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
        foraDoDia,
        foraDaFabrica,

        diasTrabalho,
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
