import { useState, useEffect } from 'react';
import { api } from '@/compartilhado/servicos/api';
import type { JustificativaPonto } from '@/funcionalidades/ponto/hooks/usarJustificativa';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';

export interface JustificativaAdmin extends JustificativaPonto {
    usuario_nome: string;
    usuario_email: string;
    usuario_foto: string | null;
}

/**
 * Hook de Leitura/Aprovação para LIDER_EQUIPE ou ADMIN (Painel de Justificativas).
 */
export function usarJustificativasAdmin() {
    const [justificativas, setJustificativas] = useState<JustificativaAdmin[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    const podeAprovar = usarPermissaoAcesso('ponto:aprovar_justificativa');
    
    const carregar = async (signal?: AbortSignal) => {
        if (!podeAprovar) {
            setCarregando(false);
            setJustificativas([]);
            return;
        }

        try {
            setCarregando(true);
            const res = await api.get('/api/ponto/admin/justificativas', { signal });
            setJustificativas(res.data);
            setErro(null);
        } catch (e: any) {
            if (e.name === 'AbortError') return;
            setErro(e.response?.data?.erro || 'Erro ao carregar banco de justificativas.');
        } finally {
            setCarregando(false);
        }
    };

    /**
     * Patch para aprovar uma justificativa pendente
     */
    const aprovar = async (id: string) => {
        try {
            await api.patch(`/api/ponto/admin/justificativas/${id}/aprovar`);
            await carregar(); // Soft Reload no grid
        } catch (e: any) {
            throw new Error(e.response?.data?.erro || 'Falha ao aprovar justificativa.');
        }
    };

    /**
     * Patch para rejeitar uma justificativa pendente, enviando um motivo p/ o autor.
     */
    const rejeitar = async (id: string, motivoRejeicao: string) => {
        try {
            await api.patch(`/api/ponto/admin/justificativas/${id}/rejeitar`, { motivoRejeicao });
            await carregar(); // Soft Reload no grid
        } catch (e: any) {
            throw new Error(e.response?.data?.erro || 'Falha ao rejeitar justificativa.');
        }
    };

    useEffect(() => {
        const controlador = new AbortController();
        carregar(controlador.signal);
        return () => controlador.abort();
    }, [podeAprovar]);

    return {
        justificativas,
        carregando,
        erro,
        aprovar,
        rejeitar,
        recarregar: carregar
    };
}
