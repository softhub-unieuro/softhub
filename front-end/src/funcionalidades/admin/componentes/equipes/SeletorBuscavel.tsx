import { useState, useRef, useLayoutEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';

export const SeletorBuscavel = memo(({
    label,
    valor,
    aoAlterar,
    opcoes,
    placeholderVazio,
    icone: Icone
}: {
    label: string,
    valor: string,
    aoAlterar: (v: string) => void,
    opcoes: { id: string, nome: string }[],
    placeholderVazio: string,
    icone?: any
}) => {
    const [aberto, setAberto] = useState(false);
    const [busca, setBusca] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    const listaOpcoes = opcoes || [];
    const filtradas = listaOpcoes.filter(o => o.nome.toLowerCase().includes(busca.toLowerCase()));
    const selecionada = listaOpcoes.find(o => o.id === valor);

    // Calcula a posição do menu em tempo real ao abrir
    useLayoutEffect(() => {
        if (aberto && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [aberto]);

    return (
        <div className="space-y-1.5 relative" ref={containerRef}>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</label>

            <div
                onClick={() => setAberto(!aberto)}
                className={`flex items-center justify-between w-full h-10 bg-background border border-border rounded-2xl px-4 cursor-pointer hover:border-primary/50 transition-all ${aberto ? 'ring-2 ring-primary/20 border-primary/50' : ''}`}
            >
                <div className="flex items-center gap-2 min-w-0">
                    {Icone && <Icone size={14} className="text-muted-foreground/40 shrink-0" />}
                    <span className={`text-sm truncate ${!selecionada ? 'text-muted-foreground/40 italic' : 'text-foreground font-medium'}`}>
                        {selecionada?.nome ?? placeholderVazio}
                    </span>
                </div>
                <ChevronDown size={14} className={`text-muted-foreground/40 transition-transform duration-300 ${aberto ? 'rotate-180' : ''}`} />
            </div>

            {aberto && createPortal(
                <>
                    {/* Backdrop para fechar ao clicar fora - z-index alto para ficar sobre a modal */}
                    <div className="fixed inset-0 z-[100]" onClick={() => { setAberto(false); setBusca(''); }} />

                    <div
                        style={{
                            position: 'fixed',
                            top: coords.top + 8,
                            left: coords.left,
                            width: coords.width,
                        }}
                        className="bg-card border border-border rounded-2xl shadow-lg z-[110] p-2 space-y-2 animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={12} />
                            <input
                                autoFocus
                                placeholder="Pesquisar..."
                                value={busca}
                                onChange={e => setBusca(e.target.value)}
                                className="w-full h-9 bg-muted/20 border border-border/50 rounded-2xl pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            <div
                                onClick={() => { aoAlterar(''); setAberto(false); setBusca(''); }}
                                className={`px-3 py-2 rounded-2xl text-xs cursor-pointer transition-colors ${!valor ? 'bg-primary/10 text-primary font-black' : 'hover:bg-muted text-muted-foreground/60'}`}
                            >
                                {placeholderVazio}
                            </div>

                            {filtradas.map(o => (
                                <div
                                    key={o.id}
                                    onClick={() => { aoAlterar(o.id); setAberto(false); setBusca(''); }}
                                    className={`px-3 py-2 rounded-2xl text-xs cursor-pointer transition-colors flex items-center justify-between ${valor === o.id ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-muted text-foreground/80'}`}
                                >
                                    <span className="truncate">{o.nome}</span>
                                    {valor === o.id && <div className="w-1 h-1 rounded-full bg-primary-foreground" />}
                                </div>
                            ))}

                            {filtradas.length === 0 && (
                                <div className="py-8 text-center">
                                    <p className="text-[10px] text-muted-foreground/30 uppercase font-black tracking-widest">Nenhum resultado</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
});
