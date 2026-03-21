import { useState, useMemo, memo } from 'react';
import { Users, Plus, Pencil, Check, X, Trash2 } from 'lucide-react';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { Tooltip } from '@/compartilhado/componentes/Tooltip';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import type { MembroSimples } from './tipos';
import { CardMembroFino } from './CardMembroFino';
import type { Grupo, Equipe } from '@/funcionalidades/admin/hooks/usarEquipes';

interface DetalheEquipeProps {
    equipe: Equipe;
    grupos: Grupo[];
    membros: MembroSimples[];
    aoAdicionarGrupo: () => void;
    aoExcluirGrupo: (g: Grupo) => void;
    aoAlocar: (gId: string, eId: string) => void;
    aoRemoverMembro: (mId: string) => void;
    aoMoverMembro: (mId: string, gOrigemId: string) => void;
    aoSelecionarLider: (tipo: 'lider' | 'sub_lider') => void;
    aoSalvarNomeGrupo: (id: string, nome: string) => Promise<void>;
    aoSalvarNomeEquipe: (id: string, nome: string) => Promise<void>;
}

export const DetalheEquipe = memo(({
    equipe,
    grupos,
    membros,
    aoAdicionarGrupo,
    aoExcluirGrupo,
    aoAlocar,
    aoRemoverMembro,
    aoMoverMembro,
    aoSelecionarLider,
    aoSalvarNomeGrupo,
    aoSalvarNomeEquipe
}: DetalheEquipeProps) => {
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [editandoEquipe, setEditandoEquipe] = useState(false);
    const [nomeTemp, setNomeTemp] = useState('');
    const [salvandoInline, setSalvandoInline] = useState(false);

    const handleSalvarInline = async (id: string) => {
        if (!nomeTemp.trim() || salvandoInline) {
            setEditandoId(null);
            return;
        }
        setSalvandoInline(true);
        try {
            await aoSalvarNomeGrupo(id, nomeTemp);
            setEditandoId(null);
        } finally {
            setSalvandoInline(false);
        }
    };

    const handleSalvarEquipeInline = async () => {
        if (!nomeTemp.trim() || salvandoInline) {
            setEditandoEquipe(false);
            return;
        }
        setSalvandoInline(true);
        try {
            await aoSalvarNomeEquipe(equipe.id, nomeTemp);
            setEditandoEquipe(false);
        } catch {
            setNomeTemp(equipe.nome);
        } finally {
            setSalvandoInline(false);
        }
    };

    const lider = useMemo(() => membros.find(m => m.id === equipe.lider_id), [membros, equipe.lider_id]);
    const subLider = useMemo(() => membros.find(m => m.id === equipe.sub_lider_id), [membros, equipe.sub_lider_id]);

    const podeEditarEquipe = usarPermissaoAcesso('equipes:editar_equipe');
    const podeCriarGrupo = usarPermissaoAcesso('equipes:criar_grupo');
    const podeEditarGrupo = usarPermissaoAcesso('equipes:editar_grupo');
    const podeAlocarMembro = usarPermissaoAcesso('equipes:alocar_membro');

    return (
        <div className="card-glass p-6 card-glass-hover flex flex-col h-full overflow-hidden">
            <div className="shrink-0">
                {/* Header da Equipe */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-5">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100">
                        <Users size={24} />
                    </div>
                    <div>
                        {editandoEquipe ? (
                            <div className="flex items-center gap-2">
                                    <input
                                        autoFocus
                                        value={nomeTemp}
                                        onChange={e => setNomeTemp(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleSalvarEquipeInline();
                                            if (e.key === 'Escape') {
                                                setNomeTemp(equipe.nome);
                                                setEditandoEquipe(false);
                                            }
                                        }}
                                        onBlur={(e) => {
                                            if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
                                                setNomeTemp(equipe.nome);
                                                setEditandoEquipe(false);
                                            }
                                        }}
                                        className="flex-1 max-w-md bg-transparent border-b border-slate-200 outline-none text-2xl font-bold text-slate-900 p-0 tracking-tight focus:border-slate-900 transition-colors"
                                    />
                                <div className="flex items-center gap-1">
                                    <Tooltip texto="Salvar">
                                        <button 
                                            onClick={handleSalvarEquipeInline} 
                                            disabled={salvandoInline}
                                            className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-2xl transition-all disabled:opacity-30" 
                                        >
                                            {salvandoInline ? <Carregando Centralizar={false} tamanho="sm" className="border-t-emerald-500 border-emerald-500/30" /> : <Check size={16} strokeWidth={2.5} />}
                                        </button>
                                    </Tooltip>
                                    <button
                                        onClick={() => {
                                            setNomeTemp(equipe.nome);
                                            setEditandoEquipe(false);
                                        }}
                                        disabled={salvandoInline}
                                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all disabled:opacity-30"
                                    >
                                        <X size={16} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 group/title">
                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{equipe.nome}</h2>
                                {podeEditarEquipe && (
                                    <Tooltip texto="Renomear equipe">
                                        <button 
                                            onClick={() => {
                                                setEditandoEquipe(true);
                                                setNomeTemp(equipe.nome);
                                            }}
                                            className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-300 hover:text-slate-600 transition-all"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    </Tooltip>
                                )}
                            </div>
                        )}
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {equipe.total_membros} membros na equipe
                        </p>
                    </div>
                </div>
            </div>

            {/* Leadership Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <div 
                    onClick={() => podeEditarEquipe && aoSelecionarLider('lider')}
                    className={`flex items-center gap-5 p-5 rounded-2xl border transition-all group/lead ${equipe.lider_id ? 'bg-slate-50/50 border-slate-100 shadow-sm hover:border-blue-200' : 'bg-white border-dashed border-slate-200 hover:bg-slate-50'} ${podeEditarEquipe ? 'cursor-pointer' : 'cursor-default'}`}
                >
                    <Avatar 
                        nome={equipe.lider_nome || '?'} 
                        fotoPerfil={lider?.foto_perfil} 
                        tamanho="md" 
                        className={!equipe.lider_id ? 'bg-slate-100 !text-slate-400' : 'ring-2 ring-white shadow-sm'}
                    />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1.5 leading-none">Líder</p>
                        <p className={`text-base font-bold tracking-tight ${equipe.lider_id ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                            {equipe.lider_nome || 'Clique para indicar'}
                        </p>
                    </div>
                </div>

                <div 
                    onClick={() => podeEditarEquipe && aoSelecionarLider('sub_lider')}
                    className={`flex items-center gap-5 p-5 rounded-2xl border transition-all group/lead ${equipe.sub_lider_id ? 'bg-slate-50/50 border-slate-100 shadow-sm hover:border-blue-200' : 'bg-white border-dashed border-slate-200 hover:bg-slate-50'} ${podeEditarEquipe ? 'cursor-pointer' : 'cursor-default'}`}
                >
                    <Avatar 
                        nome={equipe.sub_lider_nome || '?'} 
                        fotoPerfil={subLider?.foto_perfil} 
                        tamanho="md" 
                        className={!equipe.sub_lider_id ? 'bg-slate-100 !text-slate-400' : 'ring-2 ring-white shadow-sm'}
                    />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1.5 leading-none">Sub-Líder</p>
                        <p className={`text-base font-bold tracking-tight ${equipe.sub_lider_id ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                            {equipe.sub_lider_nome || 'Clique para indicar'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Side-by-Side Groups Header */}
            <div className="flex items-center justify-between mb-3 shrink-0">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400/80">Grupos de Trabalho</h4>
                {podeCriarGrupo && (
                    <button
                        onClick={aoAdicionarGrupo}
                        className="text-slate-400 hover:text-blue-600 font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center gap-1.5"
                    >
                        <Plus size={14} /> Novo Grupo
                    </button>
                )}
            </div>
            </div>

            {/* Scrollable Groups Area */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-2 -mr-2 custom-scrollbar">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                {grupos.length === 0 ? (
                    <div className="col-span-full h-full bg-muted/5 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center py-16">
                        <EstadoVazio 
                            titulo="Equipe sem Grupos"
                            descricao="Esta equipe ainda não possui grupos de trabalho definidos."
                            acao={{
                                rotulo: "Criar Primeiro Grupo",
                                aoClicar: aoAdicionarGrupo
                            }}
                        />
                    </div>
                ) : (
                    grupos.map((g, index) => {
                        const partes = g.nome.trim().split(/\s+/);
                        const devePularPrimeira = partes.length > 1 && /^(grupo|grupos)$/i.test(partes[0]);
                        const inicial = devePularPrimeira ? partes[1].charAt(0).toUpperCase() : partes[0].charAt(0).toUpperCase();

                        return (
                            <div key={g.id} className={`bg-card border border-border rounded-2xl p-4 flex flex-col h-full shadow-sm hover:shadow-md transition-all overflow-hidden group/gcard animar-entrada atraso-${(index % 5) + 1}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl border border-primary/20">
                                            {inicial}
                                        </div>
                                        <div className="flex-1">
                                            {editandoId === g.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        autoFocus
                                                        value={nomeTemp}
                                                        onChange={e => setNomeTemp(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleSalvarInline(g.id);
                                                            if (e.key === 'Escape') setEditandoId(null);
                                                        }}
                                                        className="bg-transparent border-b-2 border-primary/30 outline-none text-lg font-black text-foreground p-0 tracking-tight focus:border-primary transition-all uppercase"
                                                        disabled={salvandoInline}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group/title">
                                                    <h5 className="text-lg font-black text-foreground tracking-tight uppercase">{g.nome}</h5>
                                                    {podeEditarGrupo && (
                                                        <button 
                                                            onClick={() => {
                                                                setEditandoId(g.id);
                                                                setNomeTemp(g.nome);
                                                            }}
                                                            className="opacity-0 group-hover/title:opacity-100 p-1 text-muted-foreground hover:text-primary transition-all"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {editandoId === g.id ? (
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    onClick={() => handleSalvarInline(g.id)} 
                                                    disabled={salvandoInline}
                                                    className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all disabled:opacity-30" 
                                                >
                                                    {salvandoInline ? <Carregando Centralizar={false} tamanho="sm" /> : <Check size={18} strokeWidth={3} />}
                                                </button>
                                                <button
                                                    onClick={() => setEditandoId(null)}
                                                    disabled={salvandoInline}
                                                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all disabled:opacity-30"
                                                >
                                                    <X size={18} strokeWidth={3} />
                                                </button>
                                            </div>
                                        ) : podeEditarGrupo && (
                                            <Tooltip texto="Remover Grupo">
                                                <button 
                                                    onClick={() => aoExcluirGrupo(g)} 
                                                    disabled={salvandoInline}
                                                    className="p-2 text-muted-foreground/30 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover/gcard:opacity-100"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col min-h-0">
                                    {(() => {
                                        const membrosDoGrupo = membros.filter(m => {
                                            const ids = m.grupos_ids ? m.grupos_ids.split(',') : [];
                                            return ids.includes(g.id);
                                        });
                                        return (
                                            <>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h6 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                                                        OPERADORES ({membrosDoGrupo.length})
                                                    </h6>
                                                    {podeAlocarMembro && (
                                                        <button 
                                                            onClick={() => aoAlocar(g.id, equipe.id)} 
                                                            className="p-1.5 bg-muted/20 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-lg text-[10px] font-black flex items-center gap-1 transition-all border border-border/50"
                                                        >
                                                            <Plus size={12} strokeWidth={3} /> ALOCAR
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1 custom-scrollbar flex flex-col">
                                                    {membrosDoGrupo.map(membro => (
                                                        <CardMembroFino 
                                                            key={membro.id} 
                                                            membro={membro} 
                                                            aoRemover={() => aoRemoverMembro(membro.id)} 
                                                            aoMover={() => aoMoverMembro(membro.id, g.id)}
                                                        />
                                                    ))}
                                                    {membrosDoGrupo.length === 0 && (
                                                        <EstadoVazio 
                                                            titulo="Sem Operadores"
                                                            descricao="Este grupo ainda não possui membros alocados."
                                                            compacto={true}
                                                        />
                                                    )}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        );
                    })
                )}
                </div>
            </div>
        </div>
    );
});
