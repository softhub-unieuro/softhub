import { Search, X, Calendar, ChevronDown } from 'lucide-react';
import { ReactNode } from 'react';

/**
 * Interface para as opções de um select na Barra de Filtros.
 */
interface OpcaoFiltro {
    valor: string;
    rotulo: string;
}

/**
 * Props para a Barra de Filtros Padronizada.
 */
interface BarraFiltrosProps {
    busca: string;
    aoMudarBusca: (v: string) => void;
    placeholderBusca?: string;
    children?: ReactNode; // Para filtros adicionais (selects, toggles, etc.)
    aoLimparFiltros?: () => void;
    temFiltrosAtivos?: boolean;
    desabilitarBusca?: boolean;
    className?: string;
}

/**
 * Componente de Barra de Filtros Padronizada conforme novo design premium.
 */
export function BarraFiltros({ 
    busca, 
    aoMudarBusca, 
    placeholderBusca = "Pesquisar...", 
    children, 
    aoLimparFiltros,
    temFiltrosAtivos,
    desabilitarBusca = false,
    className = ""
}: BarraFiltrosProps) {
    return (
        <div className={`my-4 flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between p-3 bg-card border border-border rounded-2xl shadow-sm w-full animate-in fade-in slide-in-from-top-4 duration-700 ${className}`}>
            <div className="flex flex-col lg:flex-row flex-1 items-stretch lg:items-center justify-between gap-3 w-full">
                {/* Busca Principal */}
                <div className={`relative group flex-1 max-w-xl transition-opacity duration-300 ${desabilitarBusca ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder={placeholderBusca}
                        value={busca}
                        onChange={(e) => aoMudarBusca(e.target.value)}
                        disabled={desabilitarBusca}
                        className="w-full h-11 pl-12 pr-4 py-3 bg-background border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium placeholder:text-muted-foreground text-foreground disabled:cursor-not-allowed"
                    />
                    {busca && (
                        <button 
                            onClick={() => aoMudarBusca('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Filtros Customizados */}
                <div className="flex flex-wrap items-center gap-2">
                    {children}
                </div>
            </div>

            {/* Ações Globais */}
            {temFiltrosAtivos && aoLimparFiltros && (
                <button
                    onClick={aoLimparFiltros}
                    className="h-11 px-4 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-2xl transition-all border border-rose-100 hover:border-rose-200 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shrink-0"
                >
                    <X size={14} />
                    Limpar
                </button>
            )}
        </div>
    );
}

/**
 * Componente de Seletor (Dropdown) para usar dentro da Barra de Filtros.
 */
export function FiltroSelect({ 
    valor, 
    aoMudar, 
    opcoes, 
    rotuloPadrao,
    className = "" 
}: { 
    valor: string; 
    aoMudar: (v: string) => void; 
    opcoes: OpcaoFiltro[]; 
    rotuloPadrao: string;
    className?: string;
}) {
    return (
        <div className={`relative flex items-center group ${className}`}>
            <select
                value={valor}
                onChange={(e) => aoMudar(e.target.value)}
                className={`h-11 pl-4 pr-10 bg-background border border-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all appearance-none cursor-pointer min-w-[120px] shadow-sm hover:bg-accent hover:text-accent-foreground ${valor ? 'text-primary border-primary/20 bg-primary/5' : ''}`}
            >
                <option value="" className="bg-popover text-popover-foreground">{rotuloPadrao}</option>
                {opcoes.map(opt => (
                    <option key={opt.valor} value={opt.valor} className="bg-popover text-popover-foreground font-bold">
                        {opt.rotulo}
                    </option>
                ))}
            </select>
            <ChevronDown size={14} className={`absolute right-4 pointer-events-none transition-all ${valor ? 'text-primary scale-110' : 'text-muted-foreground'}`} />
        </div>
    );
}

/**
 * Componente de Range de Data para usar dentro da Barra de Filtros.
 */
export function FiltroDataRange({ 
    inicio, 
    fim, 
    aoMudarInicio, 
    aoMudarFim,
    desabilitado = false
}: { 
    inicio: string; 
    fim: string; 
    aoMudarInicio: (v: string) => void; 
    aoMudarFim: (v: string) => void;
    desabilitado?: boolean;
}) {
    return (
        <div className={`flex items-center bg-background border border-border rounded-2xl px-4 h-11 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all shadow-sm ${desabilitado ? 'opacity-30 pointer-events-none' : 'hover:border-primary/20'}`}>
            <Calendar size={14} className={`mr-3 shrink-0 ${inicio || fim ? 'text-primary' : 'text-muted-foreground'}`} />
            <input
                type="date"
                value={inicio}
                onChange={e => aoMudarInicio(e.target.value)}
                className="bg-transparent border-none text-[11px] font-semibold text-muted-foreground focus:text-foreground focus:outline-none w-[110px] uppercase selection:bg-primary/30"
            />
            <span className="mx-2 text-muted-foreground/50 text-[10px] font-black uppercase tracking-tighter">até</span>
            <input
                type="date"
                value={fim}
                onChange={e => aoMudarFim(e.target.value)}
                className="bg-transparent border-none text-[11px] font-semibold text-muted-foreground focus:text-foreground focus:outline-none w-[110px] uppercase selection:bg-primary/30"
            />
        </div>
    );
}

/**
 * Componente de Toggle (Switch) Padronizado para a Barra de Filtros.
 */
export function FiltroToggle({ 
    opcoes, 
    valorAtivo, 
    aoMudar 
}: { 
    opcoes: { valor: string; rotulo: string }[]; 
    valorAtivo: string; 
    aoMudar: (v: any) => void;
}) {
    return (
        <div className="flex items-center bg-background border border-border rounded-2xl p-1 h-11 shadow-sm">
            {opcoes.map((opt) => (
                <button
                    key={opt.valor}
                    onClick={() => aoMudar(opt.valor)}
                    className={`px-4 h-full rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center ${
                        valorAtivo === opt.valor
                            ? 'bg-slate-950 text-white shadow-md'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {opt.rotulo}
                </button>
            ))}
        </div>
    );
}

/**
 * Componente de Grupo de Filtros (Pills) para usar dentro da Barra de Filtros.
 */
export function FiltroPills({
    label,
    opcoes,
    valoresAtivos,
    aoToggle,
    variante = 'padrao'
}: {
    label: string,
    opcoes: Record<string, string>,
    valoresAtivos: string[],
    aoToggle: (v: string) => void,
    variante?: 'padrao' | 'primary'
}) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">{label}</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {Object.entries(opcoes).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => aoToggle(key)}
                        className={`px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap border ${valoresAtivos.includes(key)
                            ? variante === 'primary' 
                                ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                                : 'bg-slate-950 text-white border-slate-950 shadow-md'
                            : 'bg-background text-muted-foreground border-border hover:border-muted-foreground/30 hover:text-foreground'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}
