import { memo } from 'react';
import { UserCog } from 'lucide-react';
import { pluralizar } from '@/utilitarios/formatadores';
import { Paginacao } from '@/compartilhado/componentes/Paginacao';
import { LinhaMembro } from './LinhaMembro';
import type { Membro } from '@/funcionalidades/admin/hooks/usarMembros';

interface TabelaMembrosProps {
    paginada: Membro[];
    listaFiltrada: Membro[];
    membros: Membro[];
    carregando: boolean;
    pagina: number;
    itensPorPagina: number;
    salvandoIds: Set<string>;
    selecionados: Set<string>;
    rolesDisponiveis: string[];
    toggleSelect: (id: string) => void;
    aoPromover: (membro: Membro) => void;
    handleSetMembroExcluir: (membro: Membro) => void;
    handleVerPerfil: (id: string) => void;
    setMembroAlocacao: (membro: Membro | null) => void;
    handleMudarPagina: (p: number) => void;
    handleMudarItensPorPagina: (n: number) => void;
}

export const TabelaMembros = memo(({
    paginada,
    listaFiltrada,
    membros,
    carregando,
    pagina,
    itensPorPagina,
    salvandoIds,
    selecionados,
    rolesDisponiveis,
    toggleSelect,
    aoPromover,
    handleSetMembroExcluir,
    handleVerPerfil,
    setMembroAlocacao,
    handleMudarPagina,
    handleMudarItensPorPagina
}: TabelaMembrosProps) => {
    return (
        <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0 min-w-0 animar-entrada atraso-5">
            <div className="overflow-x-auto overflow-y-auto flex-1 min-w-0">
                <table className="w-full border-collapse table-fixed">
                    <thead className="sticky top-0 z-20">
                        <tr className="bg-muted/10 backdrop-blur-md border-b border-border">
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 w-[35%]">Membro</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Cargo Hierárquico</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hidden xl:table-cell">Alocações</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hidden lg:table-cell">Visto por último</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                        {paginada.map(m => (
                            <LinhaMembro
                                key={m.id}
                                membro={m}
                                salvando={salvandoIds.has(m.id)}
                                selecionado={selecionados.has(m.id)}
                                onToggleSelect={toggleSelect}
                                onAlterarRole={aoPromover}
                                onRemover={handleSetMembroExcluir}
                                onVerPerfil={handleVerPerfil}
                                onAlocar={(m: Membro) => setMembroAlocacao(m)}
                                rolesDisponiveis={rolesDisponiveis}
                            />
                        ))}
                    </tbody>
                </table>

                {listaFiltrada.length === 0 && !carregando && (
                    <div className="p-20 flex flex-col items-center justify-center gap-4 text-muted-foreground/30">
                        <UserCog size={64} strokeWidth={1} />
                        <p className="text-[11px] font-black uppercase tracking-widest">Nenhum membro encontrado</p>
                    </div>
                )}

                {carregando && membros.length === 0 && (
                    <div className="divide-y divide-border/10">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="px-6 py-6 animate-pulse flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-muted/20" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-1/4 bg-muted/20 rounded" />
                                    <div className="h-3 w-1/6 bg-muted/20 rounded" />
                                </div>
                                <div className="h-8 w-32 bg-muted/20 rounded-full" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Rodapé / Paginação */}
            <div className="p-4 border-t border-border bg-muted/5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-muted-foreground/60">
                    Exibindo {paginada.length} de {listaFiltrada.length} {pluralizar(listaFiltrada.length, 'membro', 'membros')}
                </span>
                <Paginacao
                    paginaAtual={pagina}
                    totalPaginas={Math.ceil(listaFiltrada.length / itensPorPagina)}
                    totalRegistros={listaFiltrada.length}
                    itensPorPagina={itensPorPagina}
                    itensListados={paginada.length}
                    aoMudarPagina={handleMudarPagina}
                    aoMudarItensPorPagina={handleMudarItensPorPagina}
                />
            </div>
        </div>
    );
});
