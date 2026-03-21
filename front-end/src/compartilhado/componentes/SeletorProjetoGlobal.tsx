import { useEffect, memo } from 'react';
import { Layers, ChevronDown } from 'lucide-react';
import { usarProjetos } from '@/funcionalidades/projetos/hooks/usarProjetos';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { PROJETO_PADRAO_ID } from '@/utilitarios/constantes';

/**
 * Seletor de Projeto Global.
 * Gerencia o contexto do projeto ativo para toda a aplicação.
 */
export const SeletorProjetoGlobal = memo(() => {
    const { projetos, carregando } = usarProjetos();
    const { projetoAtivoId, setProjetoAtivoId } = usarAutenticacao();

    // Sincroniza o projeto inicial se houver projetos mas nenhum selecionado ou se o selecionado sumir
    useEffect(() => {
        if (projetos.length > 0) {
            const projetoExiste = projetos.some(p => p.id === projetoAtivoId);
            if (projetoAtivoId && !projetoExiste) {
                // Se o projeto selecionado sumiu, tenta o primeiro da lista
                const padrao = projetos.find(p => p.id === PROJETO_PADRAO_ID) || projetos[0];
                setProjetoAtivoId(padrao.id);
            }
        } else if (projetos.length === 0 && projetoAtivoId) {
            setProjetoAtivoId('');
        }
    }, [projetos, projetoAtivoId, setProjetoAtivoId]);

    const projetoAtual = projetos.find(p => p.id === projetoAtivoId);

    if (carregando && !projetoAtual) {
        return (
            <div className="h-11 w-full bg-sidebar-accent/10 border border-sidebar-border/20 rounded-2xl animate-pulse" />
        );
    }

    if (projetos.length === 0 && !carregando) {
        return (
            <div className="h-11 w-full flex items-center gap-3 px-4 bg-sidebar-accent/5 border border-sidebar-border/30 rounded-2xl group/vazio">
                <div className="w-6 h-6 rounded-lg bg-background/50 flex items-center justify-center text-muted-foreground/20 group-hover/vazio:text-primary/30 transition-colors">
                    <Layers size={14} />
                </div>
                <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">
                    Sem Projetos
                </span>
            </div>
        );
    }

    return (
        <div className="relative group/seletor">
            <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-hover/seletor:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <select
                value={projetoAtivoId}
                onChange={(e) => setProjetoAtivoId(e.target.value)}
                className="w-full h-11 pl-11 pr-10 bg-sidebar-accent/5 hover:bg-sidebar-accent/10 border border-sidebar-border/30 rounded-2xl text-[11px] font-bold text-sidebar-foreground/80 focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer relative z-10"
            >
                <option value="" className="bg-sidebar text-sidebar-foreground/50 py-2">
                    Selecionar Projeto...
                </option>
                {projetos.map(projeto => (
                    <option key={projeto.id} value={projeto.id} className="bg-sidebar text-sidebar-foreground py-2">
                        {projeto.nome}
                    </option>
                ))}
            </select>

            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-sidebar-foreground/30 group-hover/seletor:text-primary transition-colors z-20">
                <Layers size={15} />
            </div>

            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-sidebar-foreground/20 group-hover/seletor:text-sidebar-foreground/40 transition-colors z-20">
                <ChevronDown size={14} />
            </div>
        </div>
    );
});
