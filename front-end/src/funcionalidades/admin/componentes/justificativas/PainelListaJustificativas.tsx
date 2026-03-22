import { useState, memo } from 'react';
import { Bot, ClipboardList } from 'lucide-react';
import { api } from '@/compartilhado/servicos/api';
import { usarJustificativasAdmin } from '@/funcionalidades/admin/hooks/usarJustificativasAdmin';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { EstadoErro } from '@/compartilhado/componentes/EstadoErro';
import { LinhaJustificativa } from '@/funcionalidades/admin/componentes/justificativas/LinhaJustificativa';
import { ModalRejeicao } from '@/funcionalidades/admin/componentes/justificativas/ModalRejeicao';
import { JustificativaCardMobile } from '@/funcionalidades/admin/componentes/justificativas/JustificativaCardMobile';

const formatarTipo = (tipo: string): string => {
    const mapa: Record<string, string> = {
        ausencia: 'Ausência (Atestado/Falta)',
        esquecimento: 'Esquecimento de Batida',
        problema_sistema: 'Falha no Sistema',
    };
    return mapa[tipo] ?? tipo;
};

export const PainelJustificativas = memo(() => {
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
        <div className="bg-white border border-slate-100 rounded-[3rem] shadow-sm flex flex-col flex-1 overflow-hidden min-h-[500px]">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50/50 rounded-2xl text-indigo-600">
                        <ClipboardList size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none mb-1">Caixa de Entrada</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Justificativas pendentes de revisão.</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                {carregando && justificativas.length === 0 ? (
                    <div className="space-y-4 p-10 animate-pulse">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-20 w-full bg-slate-50 border border-slate-100 rounded-3xl" />
                        ))}
                    </div>
                ) : erro && justificativas.length === 0 ? (
                    <div className="h-full w-full flex items-center justify-center p-12">
                        <EstadoErro titulo="Erro ao carregar justificativas" mensagem={erro} />
                    </div>
                ) : justificativas.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-24 text-center">
                        <div className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 text-slate-300 mb-6 group-hover:scale-110 transition-transform duration-700">
                            <Bot size={56} strokeWidth={1} />
                        </div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Ponto em Conformidade</h3>
                        <p className="text-[10px] text-slate-400/60 mt-2 font-bold max-w-xs leading-relaxed">Não existem pendências de auditoria de assiduidade para serem processadas no momento.</p>
                    </div>
                ) : (
                    <>
                        <table className="w-full border-collapse hidden lg:table">
                            <thead>
                                <tr className="border-b border-slate-50 bg-slate-50/10 sticky top-0 z-10 backdrop-blur-md">
                                    <th className="px-10 py-6 text-left text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 w-[25%] transition-colors duration-500 hover:text-indigo-600">
                                        MEMBRO
                                    </th>
                                    <th className="px-6 py-6 text-left text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 w-[20%] transition-colors duration-500 hover:text-indigo-600">
                                        SITUAÇÃO & DATA
                                    </th>
                                    <th className="px-6 py-6 text-left text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 transition-colors duration-500 hover:text-indigo-600">
                                        MOTIVO & EXPLICAÇÃO
                                    </th>
                                    <th className="px-10 py-6 text-right text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 w-[140px] transition-colors duration-500 hover:text-indigo-600">
                                        AÇÕES
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
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

                        <div className="lg:hidden p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
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

            <ModalRejeicao
                aberto={!!justificativaSelecionada}
                motivo={motivoRejeicao}
                processando={!!processandoAcao}
                onChangeMotivo={setMotivoRejeicao}
                onFechar={() => { setJustificativaSelecionada(null); setMotivoRejeicao(''); }}
                onConfirmar={handleRejeitar}
            />
        </div>
    );
});
