import { memo } from 'react';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';

interface BarraAcoesLoteProps {
    selecionados: Set<string>;
    handleLimparSelecao: () => void;
    handleRemoverLote: () => void;
}

export const BarraAcoesLote = memo(({ selecionados, handleLimparSelecao, handleRemoverLote }: BarraAcoesLoteProps) => {
    if (selecionados.size === 0) return null;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-6 text-white min-w-[400px]">
                <div className="flex items-center gap-3 pr-6 border-r border-slate-800">
                    <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center text-xs font-black shadow-lg shadow-primary/20">
                        {selecionados.size}
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest opacity-80">Selecionados</span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleLimparSelecao}
                        className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                    >
                        Cancelar
                    </button>
                    {usarPermissaoAcesso('membros:desativar') && (
                        <button
                            onClick={handleRemoverLote}
                            className="px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-rose-500/20"
                        >
                            Remover Acesso
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});
