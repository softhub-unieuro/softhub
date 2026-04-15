import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { startOfWeek } from 'date-fns';
import { usarPonto } from '@/funcionalidades/ponto/hooks/usarPonto';
import { usarJustificativas } from '@/funcionalidades/ponto/hooks/usarJustificativa';
import { api } from '@/compartilhado/servicos/api';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { usarConfiguracoes } from '@/funcionalidades/admin/hooks/usarConfiguracoes';
import type { JustificativaPonto } from '@/funcionalidades/ponto/hooks/usarJustificativa';
import type { RegistroPonto } from '@/funcionalidades/ponto/hooks/usarPonto';

/**
 * Hook para gerenciar a lógica da interface de Bater Ponto.
 */
export function usarInterfacePonto() {
    const { usuario } = usarAutenticacao();
    const { 
        registrosHoje, historico, escala, escalaTipo, 
        carregando, erro, estaNaRede, ipDetectado, baterPonto 
    } = usarPonto();
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
        // Prioridade 1: Escala configurada no GRUPO (vinda da API de ponto)
        // Prioridade 2: Escala configurada no PERFIL do usuário (legado/pessoal)
        // Prioridade 3: Escala GLOBAL da fábrica (configurações)
        const raw = (escala as string | null) || usuario?.escala_dias;
        
        if (!raw) return diasTrabalhoFabrica;

        const nomesDias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

        // Se for o formato avançado com PIPE ou PREFIXO
        if (raw.includes('|') || raw.includes(':')) {
            const partes = raw.split('|');
            const fixos = (partes.find((p: string) => p.startsWith('FIXO:'))?.split(':')[1]?.split(',') || []).map((d: string) => d.trim().toLowerCase());
            const altes = (partes.find((p: string) => p.startsWith('ALTE:'))?.split(':')[1]?.split(',') || []).map((d: string) => d.trim().toLowerCase());

            const diasFixo = fixos.map((n: string) => nomesDias.indexOf(n)).filter((i: number) => i !== -1);
            const diasAlte = altes.map((n: string) => nomesDias.indexOf(n)).filter((i: number) => i !== -1);

            return [...new Set([...diasFixo, ...diasAlte])];
        }

        // Se for formato string simples (ex: "seg,qua,sex")
        if (raw.includes(',') && isNaN(Number(raw.split(',')[0]))) {
            return raw.split(',').map((n: string) => nomesDias.indexOf(n.trim().toLowerCase())).filter((i: number) => i !== -1);
        }

        // Formato legatário (apenas números separados por vírgula)
        return raw.split(',').map(Number);
    }, [escala, usuario, diasTrabalhoFabrica]);



    const { configuracoes } = usarConfiguracoes();
    const TOLERANCIA_SISTEMA = configuracoes?.tolerancia_ponto_minutos ?? 15;

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

        // Se for SAÍDA e estiver logado, permitimos sempre (Regra de Ouro)
        if (proximoTipo === 'saida') return false;

        return agoraMinutos < (inicioMinutos - TOLERANCIA_SISTEMA) || agoraMinutos > (fimMinutos + TOLERANCIA_SISTEMA);
    }, [agoraRelogio, janelaTrabalho, proximoTipo, TOLERANCIA_SISTEMA]);

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
        usuario,
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
        estaNaRede,
        ipDetectado,

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
