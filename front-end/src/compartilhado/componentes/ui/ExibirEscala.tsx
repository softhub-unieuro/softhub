import { memo } from 'react';

interface ExibirEscalaProps {
    escala: string | null;
    className?: string;
}

const NOMES_DIAS: Record<string, string> = { 
    seg: 'SEG', ter: 'TER', qua: 'QUA', qui: 'QUI', sex: 'SEX',
    '1': 'SEG', '2': 'TER', '3': 'QUA', '4': 'QUI', '5': 'SEX' 
};

/**
 * Componente compartilhado para exibir a escala presencial de forma visual.
 * Unifica o design em todo o sistema (Cards, Listas, Detalhes).
 */
export const ExibirEscala = memo(({ escala, className = "" }: ExibirEscalaProps) => {
    
    // ⚪ ESTADO: Sem escala configurada
    if (!escala || escala.trim() === "") {
        return (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-dashed border-slate-200 text-slate-400 rounded-md text-[8px] font-black uppercase tracking-widest ${className}`}>
                Não definida
            </div>
        );
    }

    // 🟢 FORMATO NOVO: "FIXO:seg,ter|ALTE:qua"
    if (escala.includes(':')) {
        const partes = escala.split('|');
        const fixos = (partes.find(p => p.startsWith('FIXO:'))?.split(':')[1]?.split(',') || []).filter(d => !!d);
        const altes = (partes.find(p => p.startsWith('ALTE:'))?.split(':')[1]?.split(',') || []).filter(d => !!d);

        return (
            <div className={`flex flex-wrap gap-1 ${className}`}>
                {fixos.map(d => (
                    <div key={d} className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-md text-[8px] font-black uppercase tracking-tighter">
                        <span className="opacity-60">[F]</span> {NOMES_DIAS[d] || d.toUpperCase()}
                    </div>
                ))}
                {altes.map(d => (
                    <div key={d} className="flex items-center gap-1 px-1.5 py-0.5 bg-violet-600/10 border border-violet-600/20 text-violet-600 rounded-md text-[8px] font-black uppercase tracking-tighter italic shadow-sm shadow-violet-600/5">
                        <span className="opacity-60">[A]</span> {NOMES_DIAS[d] || d.toUpperCase()}
                    </div>
                ))}
            </div>
        );
    }

    // 🟠 FORMATO LEGADO: "1,2,3"
    const diasAntigos = escala.split(',').filter(d => !!d);
    return (
        <div className={`flex flex-wrap gap-1 ${className}`}>
            {diasAntigos.map(d => (
                <div key={d} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-md text-[8px] font-black uppercase tracking-tighter">
                    {NOMES_DIAS[d] || `DIA ${d}`}
                </div>
            ))}
        </div>
    );
});

ExibirEscala.displayName = 'ExibirEscala';
