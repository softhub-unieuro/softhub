import { memo, useState, FormEvent } from 'react';
import { Mail, Shield, ChevronDown, Loader2, Lock, Unlock } from 'lucide-react';
import { LABELS_ROLES } from '@/utilitarios/constantes';

interface FormularioCadastroProps {
    modoInicial?: 'individual' | 'lote';
    aoCadastrar: (email: string, role: string) => Promise<any>;
    aoCadastrarLote?: (emails: string[], role: string) => Promise<any>;
    aoSucesso: () => void;
    roles: string[];
    autoCadastroAtivado?: boolean;
}

export const FormularioCadastroMembro = memo(({ modoInicial = 'individual', aoCadastrar, aoCadastrarLote, aoSucesso, roles, autoCadastroAtivado = false }: FormularioCadastroProps) => {
    const [modo, setModo] = useState<'individual' | 'lote'>(modoInicial);
    const [email, setEmail] = useState('');
    const [listaEmails, setListaEmails] = useState('');
    const [role, setRole] = useState(roles[0] || 'MEMBRO');
    const [salvando, setSalvando] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSalvando(true);
        
        let res;
        if (modo === 'individual') {
            res = await aoCadastrar(email, role);
        } else {
            const emails = listaEmails
                .split(/[\n,;]/)
                .map(e => e.trim())
                .filter(e => e.length > 5 && e.includes('@'));
            
            if (aoCadastrarLote) {
                res = await aoCadastrarLote(emails, role);
            } else {
                // Fallback caso não tenha a função (não deve ocorrer se tipado certo)
                res = { sucesso: false, erro: 'Função de lote não disponível' };
            }
        }

        setSalvando(false);
        if (res.sucesso) aoSucesso();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex bg-muted/30 p-1 rounded-2xl border border-border/40">
                <button
                    type="button"
                    onClick={() => setModo('individual')}
                    className={`flex-1 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${modo === 'individual' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}
                >
                    Individual
                </button>
                <button
                    type="button"
                    onClick={() => setModo('lote')}
                    className={`flex-1 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${modo === 'lote' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}
                >
                    Em Lote
                </button>
            </div>

            <div className="space-y-4">
                {modo === 'individual' ? (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block ml-1">E-mail Institucional</label>
                        <div className="relative group/em">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/em:text-primary transition-colors" size={16} />
                            <input
                                required
                                type="email"
                                placeholder="usuario@unieuro.edu.br"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="h-11 w-full bg-background border border-border rounded-2xl pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/30 font-medium"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Lista de E-mails</label>
                        <textarea
                            required
                            placeholder="Cole os e-mails separados por linha, vírgula ou ponto e vírgula..."
                            value={listaEmails}
                            onChange={e => setListaEmails(e.target.value)}
                            className="w-full h-32 bg-background border border-border rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none custom-scrollbar placeholder:text-muted-foreground/30 shadow-sm"
                        />
                        <div className={`mt-4 p-4 rounded-2xl border flex items-center gap-4 group/lock transition-all ${autoCadastroAtivado ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover/lock:scale-110 ${autoCadastroAtivado ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                {autoCadastroAtivado ? <Unlock size={18} strokeWidth={2.5} /> : <Lock size={18} strokeWidth={2.5} />}
                            </div>
                            <div className="flex flex-col">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${autoCadastroAtivado ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {autoCadastroAtivado ? 'Auto-cadastro Ativado' : 'Auto-cadastro Bloqueado'}
                                </p>
                                <p className={`text-[9px] font-bold leading-tight ${autoCadastroAtivado ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>
                                    {autoCadastroAtivado 
                                        ? "Qualquer pessoa com e-mail institucional pode entrar. Use esta lista apenas para definir cargos superiores."
                                        : "Acesso Restrito. Apenas e-mails autorizados manualmente nesta lista poderão se conectar à Fábrica."
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Cargo Inicial</label>
                    <div className="relative group/sh">
                        <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/sh:text-primary transition-colors" size={16} />
                        <select
                            value={role}
                            onChange={e => setRole(e.target.value)}
                            className="h-11 w-full bg-background border border-border rounded-2xl pl-11 pr-10 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer shadow-sm hover:bg-muted/30"
                        >
                            {roles.map(r => (
                                <option key={r} value={r}>
                                    {(LABELS_ROLES as any)[r] || r}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                    </div>
                </div>
            </div>

            <button
                disabled={salvando}
                className="h-11 w-full bg-primary text-white rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
                {salvando ? <Loader2 className="animate-spin" size={18} /> : <span>{modo === 'individual' ? 'Finalizar Convite' : 'Autorizar Lote'}</span>}
            </button>
        </form>
    );
});
