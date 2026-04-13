import { memo } from 'react';
import { UserCog, Eye, LayoutGrid, TrendingUp, Lock, Trash2 } from 'lucide-react';
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
            <div className="overflow-x-auto overflow-y-auto flex-1 min-w-0 custom-scrollbar">
                {/* 🖥️ VISÃO DESKTOP: TABELA CLÁSSICA */}
                <table className="hidden lg:table w-full border-collapse table-fixed">
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
                        {paginada?.map(m => (
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

                {/* 📱 VISÃO MOBILE: CARDS DE GESTÃO */}
                <div className="lg:hidden flex flex-col divide-y divide-border/10">
                    {paginada?.map(m => (
                        <div key={m.id} className="p-5 flex flex-col gap-5 bg-card hover:bg-muted/5 transition-colors">
                            {/* Topo: Identidade */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                        {m.foto_perfil ? (
                                            <img src={m.foto_perfil} alt={m.nome || ''} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xl font-black text-muted-foreground/20">{m.nome?.[0] || '?'}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase tracking-tight text-foreground">{m.nome || 'Sem Nome'}</span>
                                        <span className="text-[10px] text-muted-foreground font-medium lowercase italic leading-none">{m.email}</span>
                                        <div className="mt-2 flex items-center gap-1.5 self-start">
                                            <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                                                <span className="text-[8px] font-black uppercase tracking-[0.1em] text-primary">{m.role}</span>
                                            </div>
                                            {m.equipe_nome && (
                                                <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                                    <span className="text-[8px] font-black uppercase tracking-[0.1em] text-emerald-600 truncate max-w-[120px] inline-block">
                                                        {m.equipe_nome}{m.grupo_nome ? ` | ${m.grupo_nome}` : ''}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={selecionados.has(m.id)}
                                    onChange={() => toggleSelect(m.id)}
                                    className="w-5 h-5 rounded-lg border-border text-primary focus:ring-primary/20 accent-primary"
                                />
                            </div>

                            {/* Corpo: Metadados */}
                            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest px-1">
                                <span>Membro desde</span>
                                <span className="text-foreground/40 tabular-nums">
                                    {m.criado_em ? new Date(m.criado_em).toLocaleDateString('pt-BR') : '—'}
                                </span>
                            </div>

                            {/* Rodapé: Ações */}
                            <div className="grid grid-cols-4 gap-2 border-t border-border/10 pt-4">
                                <button 
                                    onClick={() => handleVerPerfil(m.id)}
                                    className="flex flex-col items-center justify-center gap-1.5 px-1 py-3 bg-muted/10 rounded-2xl active:bg-primary/10 active:text-primary transition-all border border-transparent hover:border-border group/cardbtn"
                                >
                                    <Eye size={16} className="text-muted-foreground/40 group-active/cardbtn:text-primary" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Perfil</span>
                                </button>
                                <button 
                                    onClick={() => setMembroAlocacao(m)}
                                    className="flex flex-col items-center justify-center gap-1.5 px-1 py-3 bg-muted/10 rounded-2xl active:bg-emerald-500/10 active:text-emerald-600 transition-all border border-transparent hover:border-border group/cardbtn"
                                >
                                    <LayoutGrid size={16} className="text-muted-foreground/40 group-active/cardbtn:text-emerald-500" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Alocar</span>
                                </button>
                                <button 
                                    onClick={() => aoPromover(m)}
                                    className="flex flex-col items-center justify-center gap-1.5 px-1 py-3 bg-muted/10 rounded-2xl active:bg-amber-500/10 active:text-amber-600 transition-all border border-transparent hover:border-border group/cardbtn"
                                >
                                    <TrendingUp size={16} className="text-muted-foreground/40 group-active/cardbtn:text-amber-500" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Cargo</span>
                                </button>
                                <button 
                                    onClick={() => !m.is_bootstrap && handleSetMembroExcluir(m)}
                                    disabled={m.is_bootstrap}
                                    className={`flex flex-col items-center justify-center gap-1.5 px-1 py-3 bg-muted/10 rounded-2xl transition-all border border-transparent hover:border-border group/cardbtn ${m.is_bootstrap ? 'opacity-20 grayscale cursor-not-allowed' : 'active:bg-rose-500/10 active:text-rose-600'}`}
                                >
                                    {m.is_bootstrap ? <Lock size={16} /> : <Trash2 size={16} className="text-muted-foreground/40 group-active/cardbtn:text-rose-500" />}
                                    <span className="text-[8px] font-black uppercase tracking-widest">{m.is_bootstrap ? 'Protegido' : 'Remover'}</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

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
            <Paginacao
                paginaAtual={pagina}
                totalPaginas={Math.ceil(listaFiltrada.length / itensPorPagina)}
                totalRegistros={listaFiltrada.length}
                itensPorPagina={itensPorPagina}
                itensListados={paginada?.length || 0}
                aoMudarPagina={handleMudarPagina}
                aoMudarItensPorPagina={handleMudarItensPorPagina}
                desabilitado={carregando}
            />
        </div>
    );
});
