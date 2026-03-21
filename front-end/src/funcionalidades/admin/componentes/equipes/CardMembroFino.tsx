import { memo } from 'react';
import { ArrowRightLeft, Trash2 } from 'lucide-react';
import { Tooltip } from '@/compartilhado/componentes/Tooltip';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import type { MembroSimples } from './tipos';

interface CardMembroFinoProps {
    membro: MembroSimples;
    aoRemover: () => void;
    aoMover: () => void;
}

export const CardMembroFino = memo(({ membro, aoRemover, aoMover }: CardMembroFinoProps) => {
    const podeAlocar = usarPermissaoAcesso('equipes:alocar_membro');

    return (
        <div className="flex items-center justify-between p-2.5 bg-muted/10 border border-transparent hover:border-border hover:bg-card rounded-xl transition-all group">
            <div className="flex items-center gap-2.5 min-w-0">
                <Avatar nome={membro.nome} fotoPerfil={membro.foto_perfil} tamanho="sm" />
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-tight text-foreground truncate">{membro.nome}</p>
                    <p className="text-[9px] text-muted-foreground/60 font-bold truncate tracking-tight">{membro.email}</p>
                </div>
            </div>
            {podeAlocar && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <Tooltip texto="Transferir Membro">
                        <button
                            onClick={aoMover}
                            className="p-1.5 text-muted-foreground hover:text-primary transition-all active:scale-90"
                        >
                            <ArrowRightLeft size={12} strokeWidth={2.5} />
                        </button>
                    </Tooltip>
                    <Tooltip texto="Remover da Equipe">
                        <button
                            onClick={aoRemover}
                            className="p-1.5 text-muted-foreground hover:text-rose-500 transition-all active:scale-90"
                        >
                            <Trash2 size={12} strokeWidth={2.5} />
                        </button>
                    </Tooltip>
                </div>
            )}
        </div>
    );
});
