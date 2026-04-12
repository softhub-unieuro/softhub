import { useState } from 'react';
import { Shield, UserPlus, Trash2, Plus } from 'lucide-react';
import type { ConfiguracoesSistema } from '@/funcionalidades/admin/hooks/usarConfiguracoes';

interface Props {
    configuracoes: ConfiguracoesSistema | null;
    atualizarConfiguracao: (chave: keyof ConfiguracoesSistema, valor: any) => Promise<any>;
    podeEditar: boolean;
}

export function SecaoGovernanca({ configuracoes, atualizarConfiguracao, podeEditar }: Props) {
    const [salvandoGov, setSalvandoGov] = useState<string | null>(null);
    const [novoDominio, setNovoDominio] = useState('');

    return (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-fit animar-entrada atraso-2">
            <div className="p-5 border-b border-border bg-muted/10 flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500 shadow-sm shadow-indigo-500/5">
                    <Shield size={18} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-[0.15em] text-foreground leading-none">Governança</h3>
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-1">Controle Crítico</span>
                </div>
            </div>

            <div className="p-5 space-y-6">
                {/* Switch de Auto-cadastro */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/50 block ml-1">Auto-cadastro</label>
                    <button 
                        disabled={!podeEditar || salvandoGov === 'auto_cadastro'}
                        onClick={async () => {
                            if (!configuracoes) return;
                            setSalvandoGov('auto_cadastro');
                            await atualizarConfiguracao('auto_cadastro', !configuracoes.auto_cadastro);
                            setSalvandoGov(null);
                        }}
                        className={`w-full group relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                            configuracoes?.auto_cadastro 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' 
                            : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl transition-colors ${configuracoes?.auto_cadastro ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-muted'}`}>
                                <UserPlus size={16} />
                            </div>
                            <div className="flex flex-col items-start translate-y-[-1px]">
                                <span className="text-[10px] font-black uppercase tracking-wider leading-none">
                                    {configuracoes?.auto_cadastro ? 'Ativado' : 'Bloqueado'}
                                </span>
                                <span className="text-[9px] font-bold opacity-70 mt-1">
                                    {configuracoes?.auto_cadastro ? 'Registro Aberto' : 'Acesso Restrito'}
                                </span>
                            </div>
                        </div>
                        <div className={`w-9 h-5 rounded-full relative transition-colors ${configuracoes?.auto_cadastro ? 'bg-emerald-500/40' : 'bg-muted-foreground/20'}`}>
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${configuracoes?.auto_cadastro ? 'left-5' : 'left-1'}`} />
                        </div>
                    </button>
                </div>

                {/* Organização GitHub */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/50 block ml-1">Organização GitHub</label>
                    <div className="relative">
                        <input 
                            disabled={!podeEditar}
                            value={configuracoes?.github_org || ''}
                            onChange={(e) => atualizarConfiguracao('github_org', e.target.value)}
                            placeholder="Ex: unieuro-softhub"
                            className="w-full bg-muted/40 border border-border/50 rounded-xl px-4 py-3 text-[11px] font-bold text-foreground outline-none focus:bg-background focus:border-indigo-500/30 transition-all placeholder:text-muted-foreground/30"
                        />
                    </div>
                    <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest ml-1">Base para links de documentação e repositórios</p>
                </div>

                {/* Domínios Autorizados */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/50 block ml-1">Domínios Válidos</label>
                    <div className="space-y-2">
                        {(configuracoes?.dominios_autorizados || ['unieuro.edu.br']).map(dominio => (
                            <div key={dominio} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40 group/dom hover:bg-muted/40 transition-colors">
                                <span className="text-[11px] font-bold text-foreground/80 lowercase tracking-wide">@{dominio}</span>
                                {podeEditar && (configuracoes?.dominios_autorizados || []).length > 1 && (
                                    <button 
                                        onClick={async () => {
                                            if (!configuracoes) return;
                                            const novos = configuracoes.dominios_autorizados.filter(d => d !== dominio);
                                            await atualizarConfiguracao('dominios_autorizados', novos);
                                        }}
                                        className="opacity-0 group-hover/dom:opacity-100 p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    {podeEditar && (
                        <form 
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!novoDominio || !configuracoes) return;
                                const limpo = novoDominio.replace('@', '').toLowerCase();
                                if (configuracoes.dominios_autorizados?.includes(limpo)) return;
                                const novos = [...(configuracoes.dominios_autorizados || []), limpo];
                                await atualizarConfiguracao('dominios_autorizados', novos);
                                setNovoDominio('');
                            }}
                            className="flex gap-2"
                        >
                            <input 
                                placeholder="Ex: dominio.com"
                                value={novoDominio}
                                onChange={e => setNovoDominio(e.target.value)}
                                className="flex-1 bg-muted/40 border border-border/50 rounded-xl px-4 py-2.5 text-[11px] font-bold outline-none focus:bg-background focus:border-indigo-500/30 transition-all placeholder:text-muted-foreground/30"
                            />
                            <button className="p-2.5 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/10 active:scale-95 transition-all hover:bg-indigo-600 flex items-center justify-center">
                                <Plus size={18} strokeWidth={3} />
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
