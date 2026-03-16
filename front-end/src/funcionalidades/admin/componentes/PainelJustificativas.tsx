import { useState } from 'react';
import { Bot } from 'lucide-react';
import { api } from '@/compartilhado/servicos/api';
import { ConfirmacaoExclusao } from '@/compartilhado/componentes/ConfirmacaoExclusao';
import { usarJustificativasAdmin } from '@/funcionalidades/admin/hooks/usarJustificativasAdmin';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { EstadoErro } from '@/compartilhado/componentes/EstadoErro';
import { LinhaJustificativa } from '@/funcionalidades/admin/componentes/justificativas/LinhaJustificativa';
import { ModalRejeicao } from '@/funcionalidades/admin/componentes/justificativas/ModalRejeicao';
import { JustificativaCardMobile } from '@/funcionalidades/admin/componentes/justificativas/JustificativaCardMobile';

/** Mapeia o tipo técnico para rótulo amigável. */
const formatarTipo = (tipo: string): string => {
    const mapa: Record<string, string> = {
        ausencia: 'Ausência (Atestado/Falta)',
        esquecimento: 'Esquecimento de Batida',
        problema_sistema: 'Falha no Sistema',
    };
    return mapa[tipo] ?? tipo;
};

/**
 * Painel de revisão de justificativas de ponto.
 * Usa tabela semântica padronizada.
 */
export function PainelJustificativas() {
    const { justificativas, carregando, erro, aprovar, rejeitar } = usarJustificativasAdmin();
    const [processandoAcao, setProcessandoAcao] = useState<string | null>(null);
    const [justificativaSelecionada, setJustificativaSelecionada] = useState<string | null>(null);
    const [motivoRejeicao, setMotivoRejeicao] = useState('');
    const [analisesIA, setAnalisesIA] = useState<Record<string, { sugestao: string, analise: string }>>({});
    const [carregandoIA, setCarregandoIA] = useState<string | null>(null);

    const handleAnalisarIA = async (id: string, motivo: string) => {
        setCarregandoIA(id);
        try {
            const res = await api.post('/api/ia/analisar-justificativa', { motivo });
            setAnalisesIA(prev => ({ ...prev, [id]: res.data }));
        } catch (e) {
            console.error('Erro ao analisar com IA:', e);
        } finally {
            setCarregandoIA(null);
        }
    };

    const handleAprovar = async (id: string) => {
        setProcessandoAcao(id);
        try {
            await aprovar(id);
        } catch (e) {
            console.error('Falha ao aprovar:', e);
        } finally {
            setProcessandoAcao(null);
        }
    };

    const handleRejeitar = async () => {
        if (!justificativaSelecionada || !motivoRejeicao.trim()) return;
        setProcessandoAcao(justificativaSelecionada);
        try {
            await rejeitar(justificativaSelecionada, motivoRejeicao);
            setJustificativaSelecionada(null);
            setMotivoRejeicao('');
        } catch (e) {
            console.error('Falha ao rejeitar:', e);
        } finally {
            setProcessandoAcao(null);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6 animar-entrada pb-10">
            <CabecalhoFuncionalidade
                titulo="Caixa de Auditoria"
                subtitulo="Revisão e processamento de justificativas de ponto e ausências."
                icone={Bot}
            />

            <div className="bg-card border border-border rounded-2xl flex flex-col flex-1 overflow-hidden shadow-sm shadow-black/5">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {carregando && justificativas.length === 0 ? (
                        <div className="space-y-4 p-8">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 w-full bg-muted/20 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : erro && justificativas.length === 0 ? (
                        <div className="h-full w-full flex items-center justify-center p-12">
                            <EstadoErro titulo="Erro ao carregar justificativas" mensagem={erro} />
                        </div>
                    ) : justificativas.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-16 text-center">
                            <div className="p-6 bg-muted/20 rounded-full text-muted-foreground/30 mb-4 animate-pulse">
                                <Bot size={48} strokeWidth={1} />
                            </div>
                            <h3 className="text-[12px] font-black uppercase tracking-widest text-foreground/40">Caixa de Entrada Vazia</h3>
                            <p className="text-[10px] text-muted-foreground/40 mt-2">Nenhuma justificativa aguardando auditoria neste momento.</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop: Tabela */}
                            <table className="w-full border-collapse hidden lg:table">
                                <thead>
                                    <tr className="border-b border-border bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
                                        <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 w-[25%]">
                                            MEMBRO
                                        </th>
                                        <th className="px-4 py-4 text-left text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 w-[20%]">
                                            SITUAÇÃO & DATA
                                        </th>
                                        <th className="px-4 py-4 text-left text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                                            MOTIVO & EXPLICAÇÃO
                                        </th>
                                        <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 w-[140px]">
                                            AÇÕES
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {justificativas.map((just, index) => (
                                        <LinhaJustificativa 
                                            key={just.id}
                                            justificativa={just}
                                            index={index}
                                            formatarTipo={formatarTipo}
                                            analiseIA={analisesIA[just.id]}
                                            carregandoIA={carregandoIA === just.id}
                                            processandoAcao={processandoAcao === just.id}
                                            onAnalisarIA={handleAnalisarIA}
                                            onAprovar={handleAprovar}
                                            onInciarRejeicao={setJustificativaSelecionada}
                                        />
                                    ))}
                                </tbody>
                            </table>

                            {/* Mobile: Cards */}
                            <div className="lg:hidden p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {justificativas.map((just) => (
                                    <JustificativaCardMobile
                                        key={just.id}
                                        justificativa={just}
                                        formatarTipo={formatarTipo}
                                        analiseIA={analisesIA[just.id]}
                                        carregandoIA={carregandoIA === just.id}
                                        processandoAcao={processandoAcao === just.id}
                                        onAnalisarIA={handleAnalisarIA}
                                        onAprovar={handleAprovar}
                                        onInciarRejeicao={setJustificativaSelecionada}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal de Rejeição */}
            <ModalRejeicao
                aberto={!!justificativaSelecionada}
                motivo={motivoRejeicao}
                processando={!!processandoAcao}
                onChangeMotivo={setMotivoRejeicao}
                onFechar={() => { setJustificativaSelecionada(null); setMotivoRejeicao(''); }}
                onConfirmar={handleRejeitar}
            />

            <ConfirmacaoExclusao
                aberto={false}
                aoFechar={() => {}}
                aoConfirmar={() => {}}
                titulo=""
                descricao=""
            />
        </div>
    );
}
 
export default PainelJustificativas;
