import { useState, useMemo, memo, useCallback } from 'react';
import { Users, Plus, Pencil, Check, X, Trash2 } from 'lucide-react';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { Tooltip } from '@/compartilhado/componentes/Tooltip';
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    <div 
                    onClick={() => podeEditarEquipe && aoSelecionarLider('lider')}
                    className={`group/lead relative flex items-center gap-5 p-5 rounded-3xl border transition-all duration-300 overflow-hidden ${
                        equipe.lider_id 
                            ? 'bg-white/80 border-primary/20 shadow-sm hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.06)] hover:border-primary/40' 
                            : 'bg-slate-50 border-dashed border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    } ${podeEditarEquipe ? 'cursor-pointer' : 'cursor-default'}`}
                >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-[2.5rem] -mr-8 -mt-8 opacity-0 group-hover/lead:opacity-100 transition-opacity" />
                    <Avatar 
                        nome={equipe.lider_nome || '?'} 
                        fotoPerfil={lider?.foto_perfil} 
                        tamanho="md" 
                        className={`transition-transform duration-300 group-hover/lead:scale-110 ${!equipe.lider_id ? 'bg-slate-100 !text-slate-400' : 'ring-2 ring-white shadow-sm'}`}
                    />
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-1.5 leading-none opacity-60">Liderança Principal</p>
                        <p className={`text-base font-black tracking-tighter uppercase ${equipe.lider_id ? 'text-slate-900' : 'text-slate-400/70 italic'}`}>
                            {equipe.lider_nome || (podeEditarEquipe ? 'Indicar Líder' : 'Não definido')}
                        </p>
                    </div>
                </div>

                <div 
                    onClick={() => podeEditarEquipe && aoSelecionarLider('sub_lider')}
                    className={`group/lead relative flex items-center gap-5 p-5 rounded-3xl border transition-all duration-300 overflow-hidden ${
                        equipe.sub_lider_id 
                            ? 'bg-white/80 border-primary/20 shadow-sm hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.06)] hover:border-primary/40' 
                            : 'bg-slate-50 border-dashed border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    } ${podeEditarEquipe ? 'cursor-pointer' : 'cursor-default'}`}
                >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-[2.5rem] -mr-8 -mt-8 opacity-0 group-hover/lead:opacity-100 transition-opacity" />
                    <Avatar 
                        nome={equipe.sub_lider_nome || '?'} 
                        fotoPerfil={subLider?.foto_perfil} 
                        tamanho="md" 
                        className={`transition-transform duration-300 group-hover/lead:scale-110 ${!equipe.sub_lider_id ? 'bg-slate-100 !text-slate-400' : 'ring-2 ring-white shadow-sm'}`}
                    />
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-1.5 leading-none opacity-60">Sub-Liderança</p>
                        <p className={`text-base font-black tracking-tighter uppercase ${equipe.sub_lider_id ? 'text-slate-900' : 'text-slate-400/70 italic'}`}>
                            {equipe.sub_lider_nome || (podeEditarEquipe ? 'Indicar Sub' : 'Não definido')}
                        </p>
                    </div>
                </div>
                </div>

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

            <div className="flex-1 overflow-y-auto min-h-0 pr-2 -mr-2 custom-scrollbar flex flex-col">
                {grupos.length === 0 ? (
                    <div className="flex-1 bg-muted/5 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center py-16 min-h-[300px]">
                        <Users size={32} strokeWidth={1} className="text-slate-300 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Equipe sem Grupos</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 grow">
                        {grupos.map((g, index) => {
                            const partes = g.nome.trim().split(/\s+/);
                            const devePularPrimeira = partes.length > 1 && /^(grupo|grupos)$/i.test(partes[0]);
                            const inicial = devePularPrimeira ? partes[1].charAt(0).toUpperCase() : partes[0].charAt(0).toUpperCase();

                            return (
                                <div key={g.id} className={`group/gcard relative bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-3xl p-5 flex flex-col h-full shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] hover:border-primary/20 transition-all duration-500 overflow-hidden animar-entrada atraso-${(index % 5) + 1}`}>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover/gcard:bg-primary/10 transition-colors duration-500" />
                                    
                                    <div className="flex items-center justify-between mb-6 relative">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-primary/20 border border-white/20 select-none">
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
                                                            className="bg-transparent border-b-2 border-primary/40 outline-none text-xl font-black text-slate-900 p-0 tracking-tight focus:border-primary transition-all uppercase"
                                                            disabled={salvandoInline}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1 items-start group/title">
                                                        <div className="flex items-center gap-2">
                                                            <h5 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">{g.nome}</h5>
                                                            {podeEditarGrupo && (
                                                                <button 
                                                                    onClick={() => {
                                                                        setEditandoId(g.id);
                                                                        setNomeTemp(g.nome);
                                                                    }}
                                                                    className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-300 hover:text-primary transition-all"
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                            <span className="text-primary/60">PRESENCIAL:</span> {g.escala_tipo === 'fixa' ? (g.escala_dias || 'Não definido') : (g.escala_dias || 'Alternada')}
                                                        </span>
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
                                                        {salvandoInline ? <Carregando Centralizar={false} tamanho="sm" /> : <Check size={20} strokeWidth={3} />}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditandoId(null)}
                                                        disabled={salvandoInline}
                                                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all disabled:opacity-30"
                                                    >
                                                        <X size={20} strokeWidth={3} />
                                                    </button>
                                                </div>
                                            ) : podeEditarGrupo && (
                                                <button 
                                                    onClick={() => aoExcluirGrupo(g)} 
                                                    disabled={salvandoInline}
                                                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all opacity-0 group-hover/gcard:opacity-100"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col min-h-0 relative">
                                        {(() => {
                                            const membrosDoGrupo = membros.filter(m => {
                                                const ids = m.grupos_ids ? m.grupos_ids.split(',') : [];
                                                return ids.includes(g.id);
                                            });
                                            return (
                                                <>
                                                    <div className="flex items-center justify-between mb-4 px-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                                            <h6 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                                Membros Alocados ({membrosDoGrupo.length})
                                                            </h6>
                                                        </div>
                                                        {podeAlocarMembro && (
                                                            <button 
                                                                onClick={() => aoAlocar(g.id, equipe.id)} 
                                                                className="h-9 px-4 bg-primary text-primary-foreground rounded-xl text-[10px] font-black flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:scale-95 border border-primary/20"
                                                            >
                                                                <Plus size={14} strokeWidth={3} /> ALOCAR
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1 custom-scrollbar flex flex-col pb-2">
                                                        {membrosDoGrupo.map(membro => (
                                                            <CardMembroFino 
                                                                key={membro.id} 
                                                                membro={membro} 
                                                                aoRemover={() => aoRemoverMembro(membro.id)} 
                                                                aoMover={() => aoMoverMembro(membro.id, g.id)}
                                                            />
                                                        ))}
                                                        {membrosDoGrupo.length === 0 && (
                                                            <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-40">
                                                                <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-3">
                                                                    <Users size={20} className="text-slate-400" />
                                                                </div>
                                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Nenhum integrante</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
});
