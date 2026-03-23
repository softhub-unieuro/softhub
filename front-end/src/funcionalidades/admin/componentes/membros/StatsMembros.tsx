import { memo } from 'react';
import { Wifi, Users as UsersIcon, AlertCircle, LayoutGrid, ChevronRight } from 'lucide-react';

interface StatsMembrosProps {
    membrosOnline: any[];
    membrosTotal: number;
    pendenciasPonto: number;
    membrosSemEquipe: number;
    aoAbrirOnline: () => void;
    aoAbrirSemEquipe: () => void;
}

export const StatsMembros = memo(({
    membrosOnline,
    membrosTotal,
    pendenciasPonto,
    membrosSemEquipe,
    aoAbrirOnline,
    aoAbrirSemEquipe
}: StatsMembrosProps) => {
    const stats = [
        {
            label: 'Membros Online',
            valor: membrosOnline.length,
            cor: 'emerald',
            icone: Wifi,
            atraso: 'atraso-1',
            clicavel: true,
            onClick: aoAbrirOnline
        },
        { label: 'Membros Ativos', valor: membrosTotal, cor: 'indigo', icone: UsersIcon, atraso: 'atraso-2' },
        {
            label: 'Pendências Ponto',
            valor: pendenciasPonto,
            cor: 'amber',
            icone: AlertCircle,
            atraso: 'atraso-3',
            clicavel: true,
            onClick: () => window.location.href = '/app/admin/gestao-de-pontos?aba=pendencias'
        },
        {
            label: 'Sem Equipe',
            valor: membrosSemEquipe,
            cor: 'rose',
            icone: LayoutGrid,
            atraso: 'atraso-4',
            clicavel: true,
            onClick: aoAbrirSemEquipe
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {stats.map(s => {
                const corAtiva = s.cor as 'emerald' | 'amber' | 'indigo' | 'rose';

                const estilosDinamicos = {
                    emerald: {
                        hover: 'hover:border-emerald-500/30 hover:shadow-emerald-500/5',
                        badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10',
                        chevron: 'group-hover:text-emerald-500/50'
                    },
                    amber: {
                        hover: 'hover:border-amber-500/30 hover:shadow-amber-500/5',
                        badge: 'bg-amber-500/10 text-amber-500 border-amber-500/10',
                        chevron: 'group-hover:text-amber-500/50'
                    },
                    indigo: {
                        hover: 'hover:border-indigo-500/30 hover:shadow-indigo-500/5',
                        badge: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/10',
                        chevron: 'group-hover:text-indigo-500/50'
                    },
                    rose: {
                        hover: 'hover:border-rose-500/30 hover:shadow-rose-500/5',
                        badge: 'bg-rose-500/10 text-rose-500 border-rose-500/10',
                        chevron: 'group-hover:text-rose-500/50'
                    }
                }[corAtiva];

                return (
                    <div
                        key={s.label}
                        onClick={s.onClick}
                        className={`group relative bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-4 shadow-sm transition-all animar-entrada ${s.atraso} ${s.clicavel ? `cursor-pointer ${estilosDinamicos.hover} hover:-translate-y-0.5 active:scale-[0.98]` : ''}`}
                    >
                        {s.clicavel && (
                            <>
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter border ${estilosDinamicos.badge}`}>
                                        Ver Lista
                                    </div>
                                </div>
                                <div className={`absolute bottom-3 right-3 text-muted-foreground/20 transition-colors ${estilosDinamicos.chevron}`}>
                                    <ChevronRight size={14} />
                                </div>
                            </>
                        )}

                        <div className={`p-3 bg-${s.cor}-500/10 text-${s.cor}-500 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                            <s.icone size={20} className={s.label === 'Membros Online' && membrosOnline.length > 0 ? 'animate-pulse' : ''} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-tight">{s.label}</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xl font-black text-foreground">{s.valor}</span>
                                {s.label === 'Membros Online' && s.valor > 0 && (
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
});
