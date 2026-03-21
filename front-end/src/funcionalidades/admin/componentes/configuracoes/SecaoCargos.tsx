import { useState, useCallback, type FormEvent } from 'react';
import { ShieldCheck, Plus, Check, X, Pencil, Trash2, Eye } from 'lucide-react';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import type { ConfiguracoesSistema } from '@/funcionalidades/admin/hooks/usarConfiguracoes';

export const CARGOS_FIXOS = ['ADMIN', 'TODOS'];

interface Props {
    configuracoes: ConfiguracoesSistema | null;
    atualizarConfiguracao: (chave: keyof ConfiguracoesSistema, valor: any) => Promise<any>;
    salvarConfiguracoesLote: (dados: Partial<ConfiguracoesSistema>) => Promise<any>;
    renomearCargo: (antigo: string, novo: string) => Promise<any>;
    podeEditar: boolean;
    isAdmin: boolean;
    roles: string[];
}

export function SecaoCargos({ configuracoes, atualizarConfiguracao, salvarConfiguracoesLote, renomearCargo, podeEditar, isAdmin, roles }: Props) {
    const { setRoleVisualizacao } = usarAutenticacao();
    const [novoCargo, setNovoCargo] = useState('');
    const [editandoRole, setEditandoRole] = useState<string | null>(null);
    const [nomeRoleTemp, setNomeRoleTemp] = useState('');
    const [salvandoRole, setSalvandoRole] = useState(false);

    /** Renomeia um cargo na matriz e nos usuários */
    const handleRenomearRoleAction = useCallback(async (antigo: string) => {
        const novo = nomeRoleTemp.toUpperCase().trim();
        if (!novo || novo === antigo || salvandoRole) {
            setEditandoRole(null);
            return;
        }
        setSalvandoRole(true);
        const res = await renomearCargo(antigo, novo);
        if (res.sucesso) {
            setEditandoRole(null);
        }
        setSalvandoRole(false);
    }, [nomeRoleTemp, salvandoRole, renomearCargo]);

    /** Normaliza nome para processamento (ID) */
    const normalizeToSlug = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim().replace(/\s/g, '_');

    /** Adiciona um novo cargo com permissões básicas */
    const handleAddCargo = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        const label = novoCargo.trim();
        const slug = normalizeToSlug(label);
        
        if (!slug || !configuracoes) return;
        
        // 1. Atualiza Permissões
        const novasPermissoes = {
            ...configuracoes.permissoes_roles,
            [slug]: {
                'tarefas:visualizar': true,
                'ponto:registrar': true,
                'avisos:visualizar': true,
                'dashboard:visualizar': true,
            },
        };
        
        // 2. Atualiza Hierarquia (Insere acima do MEMBRO)
        const novaHierarquia = [...(configuracoes.hierarquia_roles || [])];
        const indexMembro = novaHierarquia.indexOf('MEMBRO');
        if (indexMembro !== -1) novaHierarquia.splice(indexMembro + 1, 0, slug);
        else novaHierarquia.push(slug);

        // 3. Atualiza Labels
        const novasLabels = { 
            ...(configuracoes.labels_roles || {}),
            [slug]: label 
        };
        
        // Salva tudo em LOTE para evitar Erro 500 (Batch)
        const res = await salvarConfiguracoesLote({
            hierarquia_roles: Array.from(new Set(novaHierarquia)),
            permissoes_roles: novasPermissoes,
            labels_roles: novasLabels
        });
        
        if (res.sucesso) setNovoCargo('');
    }, [novoCargo, configuracoes, salvarConfiguracoesLote]);

    /** Remove um cargo (exceto os fixos: ADMIN e TODOS) */
    const handleRemoverCargo = useCallback(async (role: string) => {
        if (!configuracoes || CARGOS_FIXOS.includes(role)) return;
        
        // 1. Remove da Matriz
        const novasPermissoes = { ...configuracoes.permissoes_roles };
        delete novasPermissoes[role];
        
        // 2. Remove da Hierarquia
        const novaHierarquia = (configuracoes.hierarquia_roles || []).filter(r => r !== role);

        // 3. Remove Labels
        const novasLabels = { ...(configuracoes.labels_roles || {}) };
        delete novasLabels[role];
        
        await salvarConfiguracoesLote({
            hierarquia_roles: novaHierarquia,
            permissoes_roles: novasPermissoes,
            labels_roles: novasLabels
        });
    }, [configuracoes, salvarConfiguracoesLote]);

    return (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-fit animar-entrada atraso-5">
            <div className="p-5 border-b border-border bg-muted/10 flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm shadow-primary/5">
                    <ShieldCheck size={18} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-[0.15em] text-foreground leading-none">Cargos</h3>
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-1">Hierarquia do Time</span>
                </div>
            </div>

            <div className="p-5 space-y-6">
                {/* Formulário para adicionar cargo */}
                {podeEditar && (
                    <form onSubmit={handleAddCargo} className="flex gap-2">
                        <input
                            required
                            value={novoCargo}
                            onChange={e => setNovoCargo(e.target.value)}
                            placeholder="EX: LIDER_TECH"
                            className="flex-1 bg-muted/40 border border-border/50 rounded-xl px-4 py-2.5 text-[11px] font-bold outline-none focus:bg-background focus:border-primary/30 transition-all uppercase placeholder:text-muted-foreground/30"
                        />
                        <button
                            type="submit"
                            className="p-2.5 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/10 active:scale-95 transition-all hover:bg-primary/90 flex items-center justify-center"
                        >
                            <Plus size={18} strokeWidth={3} />
                        </button>
                    </form>
                )}

                {/* Lista de cargos */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/50 block ml-1">Cargos Ativos</label>
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                        {roles.filter(r => r !== 'TODOS' && r !== 'ADMIN').map(role => (
                            <div
                                key={role}
                                className="group/card flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-border/30 hover:bg-muted/20 hover:border-border transition-all"
                            >
                                <div className="flex items-center flex-1 min-w-0">
                                    <div className="w-1 h-1 rounded-full bg-muted-foreground/30 mr-3 transition-all group-hover/card:bg-primary group-hover/card:scale-125" />
                                    
                                    <div className="flex flex-col flex-1 min-w-0">
                                        {editandoRole === role ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    autoFocus
                                                    value={nomeRoleTemp}
                                                    onChange={e => setNomeRoleTemp(e.target.value)}
                                                    className="flex-1 bg-transparent border-b border-primary/20 outline-none text-[10px] font-black uppercase text-foreground py-0.5"
                                                />
                                                <button onClick={() => handleRenomearRoleAction(role)} className="text-emerald-500 hover:bg-emerald-500/10 p-1 rounded-md transition-colors">
                                                     <Check size={12} strokeWidth={3} />
                                                </button>
                                                <button onClick={() => setEditandoRole(null)} className="text-rose-500 hover:bg-rose-500/10 p-1 rounded-md transition-colors">
                                                    <X size={12} strokeWidth={3} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70 group-hover/card:text-foreground transition-colors truncate">
                                                    {configuracoes?.labels_roles?.[role] || role}
                                                </span>
                                                {podeEditar && !CARGOS_FIXOS.includes(role) && (
                                                    <button onClick={() => { setEditandoRole(role); setNomeRoleTemp(role); }} className="opacity-0 group-hover/card:opacity-100 p-1 text-muted-foreground hover:text-primary transition-all">
                                                        <Pencil size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Botão de Previsualização (Discord Style) */}
                                    {!CARGOS_FIXOS.includes(role) && isAdmin && editandoRole !== role && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setRoleVisualizacao(role); }}
                                            title={`Ver sistema como ${role}`}
                                            className="opacity-0 group-hover/card:opacity-100 p-2 text-indigo-500 hover:text-white hover:bg-indigo-500 rounded-xl transition-all active:scale-90"
                                        >
                                            <Eye size={12} strokeWidth={2.5} />
                                        </button>
                                    )}

                                    {!CARGOS_FIXOS.includes(role) && podeEditar && editandoRole !== role && (
                                        <button
                                            onClick={() => handleRemoverCargo(role)}
                                            className="opacity-0 group-hover/card:opacity-100 p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all active:scale-95"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
