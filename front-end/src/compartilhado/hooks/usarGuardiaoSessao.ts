import { useState, useEffect, useCallback, useRef } from 'react';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';

/**
 * Hook do Guardião da Fábrica
 * Protege computadores públicos monitorando inatividade.
 * Diferencia o rigor baseado no horário de funcionamento.
 */
export function usarGuardiaoSessao() {
    const { sair, configuracoes, estaAutenticado } = usarAutenticacao();
    const [sessaoExpirando, setSessaoExpirando] = useState(false);
    const timerInatividade = useRef<ReturnType<typeof setTimeout> | null>(null);
    const timerAvisoFinal = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Converte "HH:mm" para minutos totais no dia
    const paraMinutos = (horaStr: string) => {
        if (!horaStr) return 0;
        const [h, m] = horaStr.replace(/"/g, '').split(':').map(Number);
        return h * 60 + m;
    };

    const verificarHorarioFuncionamento = useCallback(() => {
        const agora = new Date();
        const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();
        
        // Atualmente pegamos das configs de ponto (conforme sugerido)
        const inicio = paraMinutos((configuracoes as any)?.hora_inicio_ponto || "13:00");
        const fim = paraMinutos((configuracoes as any)?.hora_fim_ponto || "17:00");

        return minutosAtuais >= inicio && minutosAtuais <= fim;
    }, [configuracoes]);

    const iniciarMonitoramento = useCallback(() => {
        if (!estaAutenticado) return;

        // Limpa timers anteriores
        if (timerInatividade.current) clearTimeout(timerInatividade.current);
        if (timerAvisoFinal.current) clearTimeout(timerAvisoFinal.current);
        if (sessaoExpirando) setSessaoExpirando(false);

        const estaNoExpediente = verificarHorarioFuncionamento();
        
        // REGRAS DE TEMPO:
        // No expediente: 60 min (3600s)
        // Fora do expediente: 15 min (900s)
        const tempoLimite = estaNoExpediente ? 60 * 60 * 1000 : 15 * 60 * 1000;

        timerInatividade.current = setTimeout(() => {
            setSessaoExpirando(true);
            
            // Dá mais 60 segundos antes de deslogar de vez
            timerAvisoFinal.current = setTimeout(() => {
                sair();
            }, 60 * 1000);

        }, tempoLimite);
    }, [estaAutenticado, sair, verificarHorarioFuncionamento, sessaoExpirando]);

    // Resetar o timer em qualquer atividade do usuário
    useEffect(() => {
        if (!estaAutenticado) return;

        const eventos = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        const resetar = () => {
            if (!sessaoExpirando) iniciarMonitoramento();
        };

        eventos.forEach(e => window.addEventListener(e, resetar));
        iniciarMonitoramento();

        return () => {
            eventos.forEach(e => window.removeEventListener(e, resetar));
            if (timerInatividade.current) clearTimeout(timerInatividade.current);
            if (timerAvisoFinal.current) clearTimeout(timerAvisoFinal.current);
        };
    }, [estaAutenticado, iniciarMonitoramento, sessaoExpirando]);

    return { 
        sessaoExpirando, 
        continuarLogado: () => {
            setSessaoExpirando(false);
            iniciarMonitoramento();
        },
        sairAgora: sair
    };
}
