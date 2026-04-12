import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import type { ConfiguracoesSistema } from '@/funcionalidades/admin/hooks/usarConfiguracoes';

interface Props {
    configuracoes: ConfiguracoesSistema | null;
    atualizarConfiguracao: (chave: keyof ConfiguracoesSistema, valor: any) => Promise<any>;
}

export function SecaoSistema({ configuracoes, atualizarConfiguracao }: Props) {
    const [salvandoGov, setSalvandoGov] = useState<string | null>(null);

    return (
        <div className={`border rounded-2xl shadow-lg transition-all duration-500 overflow-hidden animar-entrada atraso-1 ${
            configuracoes?.modo_manutencao 
            ? 'bg-rose-500/10 border-rose-500/40 shadow-rose-500/5' 
            : 'bg-card border-border shadow-sm'
        }`}>
            <div className={`p-5 flex items-center gap-3 ${configuracoes?.modo_manutencao ? 'bg-rose-500/5' : 'bg-muted/10'}`}>
                <div className={`p-2.5 rounded-xl shadow-sm transition-all duration-300 ${
                    configuracoes?.modo_manutencao ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-500/10 text-slate-500'
                }`}>
                    <Settings2 size={18} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                    <h3 className={`text-xs font-black uppercase tracking-[0.15em] leading-none ${configuracoes?.modo_manutencao ? 'text-rose-600' : 'text-foreground'}`}>
                        SISTEMA
                    </h3>
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-1">Status Global</span>
                </div>
            </div>
            <div className="p-5">
                <button 
                    onClick={async () => {
                        if (!configuracoes) return;
                        setSalvandoGov('modo_manutencao');
                        await atualizarConfiguracao('modo_manutencao', !configuracoes.modo_manutencao);
                        setSalvandoGov(null);
                    }}
                    className={`w-full group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                        configuracoes?.modo_manutencao 
                        ? 'bg-rose-600 text-white border-rose-400' 
                        : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50'
                    }`}
                >
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        {configuracoes?.modo_manutencao ? 'Manutenção Ativa' : 'Sistema Online'}
                    </span>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${configuracoes?.modo_manutencao ? 'bg-white/30' : 'bg-muted-foreground/20'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${configuracoes?.modo_manutencao ? 'left-4.5' : 'left-0.5'}`} />
                    </div>
                </button>
                <p className="mt-3 text-[9px] text-muted-foreground font-medium leading-relaxed px-1">
                    <span className="font-black text-rose-500/80 mr-1 uppercase">Atenção:</span>
                    Ativar o modo de manutenção bloqueia o acesso de todos os membros, exceto administradores.
                </p>

                <div className="mt-8 space-y-5 pt-5 border-t border-border/40">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Cor Primária (Branding)</label>
                        <div className="flex gap-3">
                            <input 
                                type="color"
                                value={configuracoes?.cor_primaria || '#4f46e2'}
                                onChange={(e) => atualizarConfiguracao('cor_primaria', e.target.value)}
                                className="w-12 h-10 p-1 bg-muted/40 border border-border/50 rounded-xl cursor-pointer"
                            />
                            <input 
                                type="text"
                                value={configuracoes?.cor_primaria || '#4f46e2'}
                                onChange={(e) => atualizarConfiguracao('cor_primaria', e.target.value)}
                                className="flex-1 bg-muted/40 border border-border/50 rounded-xl px-4 py-2 text-[11px] font-black pointer-events-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Sincronia Global (Segundos)</label>
                        <input 
                            type="number"
                            min="5"
                            max="3600"
                            value={configuracoes?.intervalo_sincronia_segundos || 30}
                            onChange={(e) => atualizarConfiguracao('intervalo_sincronia_segundos', Number(e.target.value))}
                            className="w-full bg-muted/40 border border-border/50 rounded-xl px-4 py-3 text-[13px] font-black text-foreground outline-none focus:bg-background focus:border-indigo-500/30 transition-all"
                        />
                        <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest ml-1">Tempo entre atualizações de avisos e presença</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
