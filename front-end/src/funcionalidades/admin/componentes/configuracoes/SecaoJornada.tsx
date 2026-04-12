import { useState, useEffect } from 'react';
import { Clock, Info } from 'lucide-react';
import type { ConfiguracoesSistema } from '@/funcionalidades/admin/hooks/usarConfiguracoes';

interface Props {
    configuracoes: ConfiguracoesSistema | null;
    atualizarConfiguracao: (chave: keyof ConfiguracoesSistema, valor: any) => Promise<any>;
    podeEditar: boolean;
}

/**
 * Módulo de Jornada: Horários, Metas e Tolerâncias.
 */
export function SecaoJornada({ configuracoes, atualizarConfiguracao, podeEditar }: Props) {
    const [metaLocal, setMetaLocal] = useState(String(configuracoes?.meta_semanal_horas || 20));
    const [toleranciaLocal, setToleranciaLocal] = useState(String(configuracoes?.tolerancia_ponto_minutos || 15));
    const [mensagemLocal, setMensagemLocal] = useState(configuracoes?.mensagem_meta_semanal || '');

    useEffect(() => {
        if (configuracoes) {
            setMetaLocal(String(configuracoes.meta_semanal_horas));
            setToleranciaLocal(String(configuracoes.tolerancia_ponto_minutos));
            setMensagemLocal(configuracoes.mensagem_meta_semanal);
        }
    }, [configuracoes]);

    return (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-fit animar-entrada atraso-4">
            <div className="p-5 border-b border-border bg-muted/10 flex items-center gap-3">
                <div className="p-2.5 bg-sky-500/10 rounded-xl text-sky-500 shadow-sm shadow-sky-500/5">
                    <Clock size={18} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-[0.15em] text-foreground leading-none">Jornada</h3>
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-1">Janela do Ponto</span>
                </div>
            </div>

            <div className="p-6 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Início</label>
                        <input 
                            type="time"
                            disabled={!podeEditar}
                            value={configuracoes?.hora_inicio_ponto || '13:00'}
                            onClick={(e) => (e.target as any).showPicker?.()}
                            onChange={(e) => atualizarConfiguracao('hora_inicio_ponto', e.target.value)}
                            className="w-full bg-muted/40 border border-border/50 rounded-xl px-4 py-3 text-[13px] font-black text-foreground outline-none focus:bg-background focus:border-sky-500/30 transition-all cursor-pointer"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Término</label>
                        <input 
                            type="time"
                            disabled={!podeEditar}
                            value={configuracoes?.hora_fim_ponto || '17:00'}
                            onClick={(e) => (e.target as any).showPicker?.()}
                            onChange={(e) => atualizarConfiguracao('hora_fim_ponto', e.target.value)}
                            className="w-full bg-muted/40 border border-border/50 rounded-xl px-4 py-3 text-[13px] font-black text-foreground outline-none focus:bg-background focus:border-sky-500/30 transition-all cursor-pointer"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Meta Semanal (Horas)</label>
                        <div className="relative">
                            <input 
                                type="number"
                                min="1"
                                max="168"
                                disabled={!podeEditar}
                                value={metaLocal}
                                onChange={(e) => setMetaLocal(e.target.value)}
                                onBlur={() => {
                                    const val = Number(metaLocal);
                                    if (!isNaN(val) && val !== configuracoes?.meta_semanal_horas) {
                                        atualizarConfiguracao('meta_semanal_horas', val);
                                    }
                                }}
                                className="w-full bg-muted/40 border border-border/50 rounded-xl px-4 py-3 text-[13px] font-black text-foreground outline-none focus:bg-background focus:border-sky-500/30 transition-all disabled:opacity-50"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Tolerância (Min)</label>
                        <div className="relative">
                            <input 
                                type="number"
                                min="1"
                                max="60"
                                disabled={!podeEditar}
                                value={toleranciaLocal}
                                onChange={(e) => setToleranciaLocal(e.target.value)}
                                onBlur={() => {
                                    const val = Number(toleranciaLocal);
                                    if (!isNaN(val) && val !== configuracoes?.tolerancia_ponto_minutos) {
                                        atualizarConfiguracao('tolerancia_ponto_minutos', val);
                                    }
                                }}
                                className="w-full bg-muted/40 border border-border/50 rounded-xl px-4 py-3 text-[13px] font-black text-foreground outline-none focus:bg-background focus:border-sky-500/30 transition-all disabled:opacity-50"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Mensagem de Boas-vindas (Meta)</label>
                    <textarea 
                        rows={2}
                        disabled={!podeEditar}
                        value={mensagemLocal}
                        onChange={(e) => setMensagemLocal(e.target.value)}
                        onBlur={() => {
                            if (mensagemLocal !== configuracoes?.mensagem_meta_semanal) {
                                atualizarConfiguracao('mensagem_meta_semanal', mensagemLocal);
                            }
                        }}
                        placeholder="Ex: A semana está só começando..."
                        className="w-full bg-muted/40 border border-border/50 rounded-xl px-4 py-3 text-[11px] font-bold text-foreground outline-none focus:bg-background focus:border-sky-500/30 transition-all resize-none disabled:opacity-50"
                    />
                </div>

                {/* Dias da Semana Minimalistas */}
                <div className="space-y-3 pt-4 border-t border-border/40">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 px-1 block">Frequência Semanal</label>
                    <div className="flex items-center gap-1.5 px-1">
                        {[
                            { id: 1, label: 'S', nome: 'Segunda' },
                            { id: 2, label: 'T', nome: 'Terça' },
                            { id: 3, label: 'Q', nome: 'Quarta' },
                            { id: 4, label: 'Q', nome: 'Quinta' },
                            { id: 5, label: 'S', nome: 'Sexta' },
                            { id: 6, label: 'S', nome: 'Sábado' },
                            { id: 0, label: 'D', nome: 'Domingo' }
                        ].map((dia) => {
                            const ativo = (configuracoes?.dias_trabalho || [1,2,3,4,5]).includes(dia.id);
                            return (
                                <button
                                    key={dia.id}
                                    type="button"
                                    disabled={!podeEditar}
                                    title={dia.nome}
                                    onClick={() => {
                                        const atuais = configuracoes?.dias_trabalho || [1,2,3,4,5];
                                        const novos = atuais.includes(dia.id)
                                            ? atuais.filter(id => id !== dia.id)
                                            : [...atuais, dia.id].sort();
                                        atualizarConfiguracao('dias_trabalho', novos);
                                    }}
                                    className={`
                                        flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all duration-300
                                        ${ativo 
                                            ? 'bg-sky-500/10 text-sky-500 border border-sky-500/20 shadow-sm shadow-sky-500/5' 
                                            : 'text-muted-foreground/30 hover:text-muted-foreground/50 hover:bg-muted/30'}
                                        ${!podeEditar && 'opacity-50 cursor-not-allowed'}
                                        active:scale-95
                                    `}
                                >
                                    {dia.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed bg-sky-500/[0.03] border border-sky-500/10 p-3 rounded-xl">
                    <Info size={12} className="inline mr-2 text-sky-500" />
                    Membros só poderão registrar ponto dentro deste intervalo.
                </p>
            </div>
        </div>
    );
}
