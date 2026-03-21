import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginacaoProps {
    paginaAtual: number;
    totalPaginas: number;
    totalRegistros: number;
    itensPorPagina: number;
    itensListados: number;
    aoMudarPagina: (pagina: number) => void;
    aoMudarItensPorPagina: (itens: number) => void;
    opcoesItensPorPagina?: number[];
    desabilitado?: boolean;
}

/**
 * Componente universal de Paginação (Footer de Listas).
 * Controla navegação entre páginas e quantidade exibida por página.
 */
export function Paginacao({
    paginaAtual,
    totalPaginas,
    totalRegistros,
    itensPorPagina,
    itensListados,
    aoMudarPagina,
    aoMudarItensPorPagina,
    opcoesItensPorPagina = [20, 50, 100],
    desabilitado = false
}: PaginacaoProps) {
    if (totalRegistros === 0) return null;

    // Lógica para mostrar apenas algumas páginas (ex: 1 [2] 3 ... 10)
    const paginas = [];
    const maxVisiveis = 5;
    let inicio = Math.max(1, paginaAtual - Math.floor(maxVisiveis / 2));
    let fim = Math.min(totalPaginas, inicio + maxVisiveis - 1);

    if (fim - inicio + 1 < maxVisiveis) {
        inicio = Math.max(1, fim - maxVisiveis + 1);
    }

    for (let i = inicio; i <= fim; i++) {
        paginas.push(i);
    }

    const BotaoNavegacao = ({ 
        onClick, 
        disabled, 
        children, 
        title 
    }: { 
        onClick: () => void, 
        disabled: boolean, 
        children: React.ReactNode,
        title?: string
    }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-20 disabled:pointer-events-none"
        >
            {children}
        </button>
    );

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full py-4 px-2 border-t border-border/40 animate-in fade-in slide-in-from-bottom-2 duration-1000">
            {/* Esquerda: Info e Seletor de Itens */}
            <div className="flex items-center gap-6">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.15em] mb-0.5">Exibição</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground/80 tabular-nums">
                            {itensListados} <span className="text-[10px] text-muted-foreground/40 font-normal mx-0.5">de</span> {totalRegistros}
                        </span>
                        <div className="h-3 w-[1px] bg-border/40 mx-1" />
                        <select
                            value={itensPorPagina}
                            onChange={e => aoMudarItensPorPagina(Number(e.target.value))}
                            disabled={desabilitado}
                            className="bg-transparent text-[10px] font-bold text-muted-foreground/60 hover:text-primary transition-colors outline-none cursor-pointer uppercase tracking-tight"
                        >
                            {opcoesItensPorPagina.map(num => (
                                <option key={num} value={num} className="bg-popover text-popover-foreground">{num} / pág</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Direita: Controles de Página */}
            <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 mr-2">
                    <BotaoNavegacao onClick={() => aoMudarPagina(1)} disabled={paginaAtual === 1 || desabilitado} title="Início">
                        <ChevronsLeft size={14} />
                    </BotaoNavegacao>
                    <BotaoNavegacao onClick={() => aoMudarPagina(paginaAtual - 1)} disabled={paginaAtual === 1 || desabilitado}>
                        <ChevronLeft size={14} />
                    </BotaoNavegacao>
                </div>

                <div className="flex items-center gap-1">
                    {inicio > 1 && <span className="text-muted-foreground/30 px-1 text-[10px]">...</span>}
                    {paginas.map(p => (
                        <button
                            key={p}
                            onClick={() => aoMudarPagina(p)}
                            disabled={desabilitado}
                            className={`
                                w-8 h-8 flex items-center justify-center rounded-lg text-[11px] font-black transition-all
                                ${p === paginaAtual 
                                    ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(37,99,235,0.3)] scale-110 z-10' 
                                    : 'text-muted-foreground/60 hover:bg-muted hover:text-foreground border border-transparent'
                                }
                            `}
                        >
                            {p}
                        </button>
                    ))}
                    {fim < totalPaginas && <span className="text-muted-foreground/30 px-1 text-[10px]">...</span>}
                </div>

                <div className="flex items-center gap-1 ml-2">
                    <BotaoNavegacao onClick={() => aoMudarPagina(paginaAtual + 1)} disabled={paginaAtual === totalPaginas || desabilitado}>
                        <ChevronRight size={14} />
                    </BotaoNavegacao>
                    <BotaoNavegacao onClick={() => aoMudarPagina(totalPaginas)} disabled={paginaAtual === totalPaginas || desabilitado} title="Fim">
                        <ChevronsRight size={14} />
                    </BotaoNavegacao>
                </div>
            </div>
        </div>
    );
}
