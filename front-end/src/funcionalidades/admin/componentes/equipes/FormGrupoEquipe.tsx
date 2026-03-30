import { useState, memo } from 'react';
import { Users, Plus, Trash2, CalendarDays } from 'lucide-react';
import { Botao } from '@/compartilhado/componentes/ui/Botao';
import { SeletorBuscavel } from './SeletorBuscavel';

interface GrupoConfig {
    nome: string;
    escala_tipo: 'fixa' | 'alternada';
    escala_dias: string;
}

interface FormGrupoEquipeProps {
    titulo: string;
    tipo: 'equipe' | 'grupo';
    equipes?: { id: string; nome: string }[];
    equipeAtivaId?: string;
    aoSalvar: (dados: any) => Promise<void>;
    aoFechar: () => void;
}

const DIAS_SEMANA = [
    { id: 'seg', label: 'Seg' },
    { id: 'ter', label: 'Ter' },
    { id: 'qua', label: 'Qua' },
    { id: 'qui', label: 'Qui' },
    { id: 'sex', label: 'Sex' },
];

import { ExibirEscala } from '@/compartilhado/componentes/ui/ExibirEscala';

/**
 * Componente para criação e edição de grupos e equipes.
 */
export const FormGrupoEquipe = memo(({ titulo, tipo, equipes, equipeAtivaId, aoSalvar, aoFechar }: FormGrupoEquipeProps) => {
    const [salvando, setSalvando] = useState(false);
    const [nome, setNome] = useState('');
    const [equipeId, setEquipeId] = useState(equipeAtivaId || '');
    const [grupos, setGrupos] = useState<GrupoConfig[]>([]);
    const [novoGrupo, setNovoGrupo] = useState('');
    
    const [escalaTipo, setEscalaTipo] = useState<'fixa' | 'alternada'>('fixa');
    const [diasFixos, setDiasFixos] = useState<string[]>([]);
    
    type EstadoDia = 'vazio' | 'fixo' | 'alte';
    const [configDias, setConfigDias] = useState<Record<string, EstadoDia>>({
        seg: 'vazio', ter: 'vazio', qua: 'vazio', qui: 'vazio', sex: 'vazio'
    });

    const alternarEstadoDia = (dia: string) => {
        setConfigDias(prev => {
            const atual = prev[dia];
            let proximo: EstadoDia = 'vazio';
            if (atual === 'vazio') proximo = 'fixo';
            else if (atual === 'fixo') proximo = 'alte';
            return { ...prev, [dia]: proximo };
        });
    };

    const toggleDiaFixo = (dia: string) => {
        setDiasFixos(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]);
    };

    const gerarStringEscala = () => {
        if (escalaTipo === 'fixa') {
            return diasFixos.join(',');
        } else {
            const fixos = Object.entries(configDias).filter(([_, st]) => st === 'fixo').map(([d]) => d);
            const altes = Object.entries(configDias).filter(([_, st]) => st === 'alte').map(([d]) => d);
            return `FIXO:${fixos.join(',')}|ALTE:${altes.join(',')}`;
        }
    };

    const handleAdicionarGrupo = () => {
        if (!novoGrupo.trim()) return;
        
        setGrupos([...grupos, {
            nome: novoGrupo.trim(),
            escala_tipo: escalaTipo,
            escala_dias: gerarStringEscala()
        }]);
        setNovoGrupo('');
        setDiasFixos([]);
        setConfigDias({ seg: 'vazio', ter: 'vazio', qua: 'vazio', qui: 'vazio', sex: 'vazio' });
    };

    const handleRemoverGrupo = (index: number) => {
        setGrupos(grupos.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSalvando(true);
        try {
            let dados;
            if (tipo === 'equipe') {
                dados = { nome, grupos };
            } else {
                dados = { 
                    nome, 
                    equipe_id: equipeId || null,
                    escala_tipo: escalaTipo,
                    escala_dias: gerarStringEscala()
                };
            }
            await aoSalvar(dados);
        } finally {
            setSalvando(false);
        }
    };

    const renderCamposEscala = (classNameExterna = "space-y-4 pt-4 border-t border-border/40 mt-4") => (
        <div className={classNameExterna}>
            <div className="flex items-center gap-2 mb-3">
                <CalendarDays size={14} className="text-muted-foreground" />
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Frequência Presencial</label>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
                <Botao
                    type="button"
                    variante={escalaTipo === 'fixa' ? 'primario' : 'fantasma'}
                    onClick={() => setEscalaTipo('fixa')}
                    className={`h-10 rounded-xl text-[11px] font-bold transition-all border ${escalaTipo === 'fixa' ? 'bg-primary/10 border-primary text-primary' : 'bg-transparent border-border text-muted-foreground hover:bg-muted/10'}`}
                    rotulo="Dias Fixos"
                />
                <Botao
                    type="button"
                    variante={escalaTipo === 'alternada' ? 'primario' : 'fantasma'}
                    onClick={() => setEscalaTipo('alternada')}
                    className={`h-10 rounded-xl text-[11px] font-bold transition-all border ${escalaTipo === 'alternada' ? 'bg-violet-600/10 border-violet-600 text-violet-600' : 'bg-transparent border-border text-muted-foreground hover:bg-muted/10'}`}
                    rotulo="Escala Alternada"
                />
            </div>

            {escalaTipo === 'fixa' ? (
                <div className="flex flex-wrap gap-2">
                    {DIAS_SEMANA.map(dia => (
                        <Botao
                            key={dia.id}
                            type="button"
                            variante={diasFixos.includes(dia.id) ? 'primario' : 'fantasma'}
                            onClick={() => toggleDiaFixo(dia.id)}
                            className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all border ${diasFixos.includes(dia.id) ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent border-border text-muted-foreground hover:bg-muted/10'}`}
                            rotulo={dia.label}
                        />
                    ))}
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex flex-wrap gap-2">
                        {DIAS_SEMANA.map(dia => {
                            const st = configDias[dia.id];
                            return (
                                <button
                                    key={dia.id}
                                    type="button"
                                    onClick={() => alternarEstadoDia(dia.id)}
                                    className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-300 ${
                                        st === 'vazio' ? 'bg-muted/5 border-border/50 text-muted-foreground/40' :
                                        st === 'fixo' ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20' :
                                        'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-600/20'
                                    }`}
                                >
                                    <span className="text-[10px] font-black uppercase mb-1">{dia.label}</span>
                                    {st === 'fixo' ? (
                                        <div className="flex items-center gap-1 text-[8px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">FIXO</div>
                                    ) : st === 'alte' ? (
                                        <div className="flex items-center gap-1 text-[8px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full italic text-[7px]">RODÍZIO</div>
                                    ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="p-3 bg-muted/20 rounded-2xl border border-dashed border-border/60">
                         <p className="text-[10px] text-muted-foreground font-medium text-center leading-relaxed">
                            Clique nos dias para alternar: <br/> 
                            <span className="font-bold text-primaryUnderline">FIXO</span> (Sempre) &bull; <span className="font-bold text-violet-600">RODÍZIO</span> (Intercalado)
                         </p>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Nome {tipo === 'equipe' ? 'da Equipe' : 'do Grupo'}</label>
                    <input
                        required
                        autoFocus
                        value={nome}
                        onChange={e => setNome(e.target.value)}
                        placeholder={tipo === 'equipe' ? "Ex: Desenvolvimento, Comercial..." : "Ex: Squad Alpha, Operações..."}
                        className="w-full h-12 bg-muted/10 border border-border rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/30"
                    />
                </div>

                {tipo === 'grupo' && equipes && !equipeAtivaId && (
                    <SeletorBuscavel
                        label="Equipe Responsável"
                        valor={equipeId}
                        aoAlterar={setEquipeId}
                        opcoes={equipes}
                        placeholderVazio="Selecione a equipe de comando..."
                        icone={Users}
                    />
                )}

                {tipo === 'grupo' && renderCamposEscala()}

                {tipo === 'equipe' && (
                    <div className="space-y-4 pt-6 border-t border-border/40">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Estrutura Interna</span>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Crie os grupos de trabalho desta equipe</span>
                            </div>
                            <div className="h-7 px-3 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center">
                                <span className="text-[10px] font-black text-primary">{grupos.length} {grupos.length === 1 ? 'GRUPO' : 'GRUPOS'}</span>
                            </div>
                        </div>

                        <div className="p-3 bg-muted/20 border border-border/40 rounded-2xl space-y-3 transition-all">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-muted-foreground border border-border/50">
                                    <Plus size={16} strokeWidth={3} />
                                </div>
                                <input
                                    type="text"
                                    value={novoGrupo}
                                    onChange={e => setNovoGrupo(e.target.value)}
                                    placeholder="Nome do novo grupo..."
                                    className="flex-1 bg-transparent border-none text-[12px] font-bold outline-none placeholder:text-muted-foreground/40 h-8"
                                />
                            </div>
                            
                            {novoGrupo.trim() && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    {renderCamposEscala("space-y-2 pt-2 border-t border-border/40")}
                                    
                                    <div className="flex justify-end mt-4">
                                        <Botao
                                            type="button"
                                            variante="primario"
                                            onClick={handleAdicionarGrupo}
                                            className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-colors"
                                            rotulo="Adicionar ao Grupo"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1 pb-2">
                            {grupos.length === 0 ? (
                                <div className="py-8 border-2 border-dashed border-border/40 rounded-3xl flex flex-col items-center justify-center gap-3 opacity-30">
                                    <Users size={32} strokeWidth={1} />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sem grupos definidos</p>
                                </div>
                            ) : (
                                grupos.map((g, idx) => (
                                    <div 
                                        key={idx} 
                                        className="group/item flex flex-col gap-2 p-3 bg-white/50 border border-border/80 rounded-2xl hover:bg-white hover:shadow-lg hover:shadow-slate-100 hover:border-primary/20 transition-all duration-300 animate-in slide-in-from-bottom-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center group-hover/item:bg-primary/5 group-hover/item:text-primary transition-colors">
                                                    <span className="text-[10px] font-black">{idx + 1}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{g.nome}</span>
                                                    <ExibirEscala escala={g.escala_dias} />
                                                </div>
                                            </div>
                                            <Botao
                                                variante="fantasma"
                                                tamanho="icone"
                                                type="button"
                                                onClick={() => handleRemoverGrupo(idx)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/30 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover/item:opacity-100"
                                                icone={<Trash2 size={14} />}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                <Botao 
                    type="button" 
                    variante="fantasma"
                    onClick={aoFechar} 
                    className="h-12 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/20 rounded-xl transition-all"
                    rotulo="Descartar"
                />
                <Botao
                    type="submit"
                    variante="primario"
                    disabled={salvando || !nome.trim()}
                    className="flex-1 h-12 rounded-xl text-[10px] font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-30 flex items-center justify-center uppercase tracking-widest"
                    carregando={salvando}
                    rotulo="Confirmar Cadastro"
                />
            </div>
        </form>
    );
});
