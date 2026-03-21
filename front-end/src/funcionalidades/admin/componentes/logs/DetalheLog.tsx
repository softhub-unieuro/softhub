import React, { memo } from 'react';
import { Database, Network, Fingerprint, Layers } from 'lucide-react';
import type { LogSistema } from '../../hooks/usarLogs';

interface Props {
    log: LogSistema;
}

export const DetalheLog = memo(({ log }: Props) => {
    let dadosAntigos = null;
    let dadosNovos = null;

    try {
        if (log.dados_anteriores) dadosAntigos = JSON.parse(log.dados_anteriores);
        if (log.dados_novos) dadosNovos = JSON.parse(log.dados_novos);
    } catch (e) {
        // Fallback para texto plano se não for JSON
        dadosAntigos = log.dados_anteriores;
        dadosNovos = log.dados_novos;
    }

    return (
        <div className="p-6 bg-slate-900/40 border-t border-border/10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Metadados Técnicos */}
                <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 border-b border-primary/10 pb-2 flex items-center gap-2">
                        <Fingerprint size={12} />
                        Assinatura Digital & Contexto
                    </h5>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase">ID do Registro</span>
                            <code className="block text-[10px] font-mono text-muted-foreground select-all">{log.id}</code>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase">Endereço IP</span>
                            <div className="flex items-center gap-1.5 text-indigo-400">
                                <Network size={10} />
                                <code className="text-[10px] font-mono font-black">{log.ip || 'Interno'}</code>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase">Tipo de Entidade</span>
                            <div className="flex items-center gap-1.5 text-emerald-400">
                                <Database size={10} />
                                <span className="text-[10px] font-black uppercase tracking-wider">{log.entidade_tipo || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase">ID da Entidade</span>
                            <code className="block text-[10px] font-mono text-muted-foreground select-all">{log.entidade_id || 'Global'}</code>
                        </div>
                    </div>
                </div>

                {/* Diferencial de Dados (Snapshot) */}
                <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 border-b border-primary/10 pb-2 flex items-center gap-2">
                        <Layers size={12} />
                        Diferencial de Dados (Snapshot)
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase">Estado Anterior</span>
                            <div className="bg-slate-950/80 border border-border/20 rounded-xl p-3 max-h-[200px] overflow-auto custom-scrollbar">
                                {dadosAntigos ? (
                                    <pre className="text-[10px] font-mono text-rose-400/80 whitespace-pre-wrap">
                                        {typeof dadosAntigos === 'object' ? JSON.stringify(dadosAntigos, null, 2) : dadosAntigos}
                                    </pre>
                                ) : (
                                    <span className="text-[10px] text-muted-foreground/30 italic">Sem dados prévios</span>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase">Novo Estado</span>
                            <div className="bg-slate-950/80 border border-border/20 rounded-xl p-3 max-h-[200px] overflow-auto custom-scrollbar">
                                {dadosNovos ? (
                                    <pre className="text-[10px] font-mono text-emerald-400/80 whitespace-pre-wrap">
                                        {typeof dadosNovos === 'object' ? JSON.stringify(dadosNovos, null, 2) : dadosNovos}
                                    </pre>
                                ) : (
                                    <span className="text-[10px] text-muted-foreground/30 italic">Sem novos dados</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default DetalheLog;
