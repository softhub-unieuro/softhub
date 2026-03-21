import { useState, useMemo } from 'react';
import { Shield, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/compartilhado/componentes/Modal';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { LABELS_ROLES, VARIANTE_COR_ROLES } from '@/utilitarios/constantes';
import { Emblema } from '@/compartilhado/componentes/Emblema';
import type { Membro } from '@/funcionalidades/admin/hooks/usarMembros';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';

interface ModalPromocaoMembroProps {
    aberto: boolean;
    aoFechar: () => void;
    membro: Membro | null;
    aoConfirmar: (membro: Membro, novaRole: string) => Promise<void>;
    rolesDisponiveis: string[];
    carregando?: boolean;
}

export function ModalPromocaoMembro({ aberto, aoFechar, membro, aoConfirmar, rolesDisponiveis, carregando }: ModalPromocaoMembroProps) {
    const { usuario } = usarAutenticacao();
    const [novaRole, setNovaRole] = useState<string>('');

    // Efeito para resetar a role selecionada ao abrir
    useMemo(() => {
        if (aberto && membro) setNovaRole(membro.role);
    }, [aberto, membro]);

    if (!membro) return null;

    const ehPromocao = novaRole !== membro.role;

    return (
        <Modal 
            aberto={aberto} 
            aoFechar={aoFechar} 
            titulo="Gestão de Carreira" 
            largura="md"
        >
            <div className="flex flex-col gap-6 animar-entrada">
                {/* Perfil Atual */}
                <div className="flex items-center gap-4 p-4 bg-muted/20 border border-border/40 rounded-2xl">
                    <Avatar nome={membro.nome} fotoPerfil={membro.foto_perfil} tamanho="lg" />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">{membro.nome}</span>
                        <span className="text-[11px] text-muted-foreground">{membro.email}</span>
                        <div className="mt-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground/40">Cargo Atual</div>
                        <Emblema 
                            texto={LABELS_ROLES[membro.role as keyof typeof LABELS_ROLES] || membro.role} 
                            variante={VARIANTE_COR_ROLES[membro.role as keyof typeof VARIANTE_COR_ROLES] as any || 'cinza'} 
                        />
                    </div>
                </div>

                {/* Seleção de Novo Cargo */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                        <TrendingUp size={12} />
                        Novo Cargo Hierárquico
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {rolesDisponiveis.map((role) => (
                            <button
                                key={role}
                                onClick={() => setNovaRole(role)}
                                className={`
                                    flex flex-col items-start gap-1 p-3 rounded-xl border transition-all text-left
                                    ${novaRole === role 
                                        ? 'bg-primary/5 border-primary shadow-sm ring-2 ring-primary/10' 
                                        : 'bg-background border-border hover:border-muted-foreground/30 hover:bg-muted/5'}
                                `}
                            >
                                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${novaRole === role ? 'text-primary' : 'text-foreground/70'}`}>
                                    {LABELS_ROLES[role as keyof typeof LABELS_ROLES] || role}
                                </span>
                                <span className="text-[9px] text-muted-foreground/50 leading-tight">
                                    {(role === 'LIDER' || role === 'GESTOR') ? 'Acesso a gestão de equipe' : 'Responsabilidades de execução'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Aviso de Governança */}
                {ehPromocao && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
                        <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                        <div className="flex flex-col gap-1">
                            <h4 className="text-[11px] font-bold text-amber-500 uppercase">Impacto da Alteração</h4>
                            <p className="text-[12px] text-amber-500/80 leading-relaxed font-medium">
                                Esta alteração mudará as permissões de acesso do membro imediatamente. 
                                Ele será notificado pelo sistema sobre sua nova posição na hierarquia.
                            </p>
                        </div>
                    </div>
                )}

                {/* Rodapé de Ações */}
                <div className="flex gap-3 mt-4">
                    <button
                        onClick={aoFechar}
                        className="flex-1 h-12 rounded-2xl border border-border text-[11px] font-black uppercase tracking-widest hover:bg-muted/10 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        disabled={!ehPromocao || carregando}
                        onClick={() => aoConfirmar(membro, novaRole)}
                        className={`
                            flex-[1.5] h-12 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all
                            ${ehPromocao 
                                ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]' 
                                : 'bg-muted/40 text-muted-foreground cursor-not-allowed'}
                        `}
                    >
                        {carregando ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <CheckCircle2 size={16} />
                                Confirmar Alteração
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
