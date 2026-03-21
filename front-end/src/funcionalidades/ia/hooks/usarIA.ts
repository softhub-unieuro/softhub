import { useState, useCallback } from 'react';
import { api } from '@/compartilhado/servicos/api';
import { useQuery } from '@tanstack/react-query';

export function usarIA() {
    const [carregando, setCarregando] = useState(false);

    // Consulta cota atual (simulada ou via header/kv?)
    // O backend retorna erro 429 se cota atingida.
    // Mas podemos ter um endpoint de status se quisermos.
    
    const aprimorarTarefa = useCallback(async (titulo: string, descricao: string) => {
        setCarregando(true);
        try {
            const res = await api.post('/api/ia/aprimorar-descricao', { titulo, descricao });
            return res.data;
        } finally {
            setCarregando(false);
        }
    }, []);

    const refinarAviso = useCallback(async (rascunho: string) => {
        setCarregando(true);
        try {
            const res = await api.post('/api/ia/refinar-aviso', { rascunho });
            return res.data;
        } finally {
            setCarregando(false);
        }
    }, []);

    const sugerirPrioridade = useCallback(async (texto: string) => {
        setCarregando(true);
        try {
            const res = await api.post('/api/ia/prioridade', { texto });
            return res.data;
        } finally {
            setCarregando(false);
        }
    }, []);

    return {
        carregando,
        aprimorarTarefa,
        refinarAviso,
        sugerirPrioridade
    };
}
