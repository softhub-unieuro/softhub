import { memo } from 'react';
import { Tooltip } from '@/compartilhado/componentes/Tooltip';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { usarMembrosOnline } from '@/compartilhado/hooks/usarMembrosOnline';

export const MembrosOnline = memo(() => {
    const { membrosOnline, carregando } = usarMembrosOnline();

    if (carregando || membrosOnline.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 p-3 bg-primary/5 border border-primary/10 rounded-2xl animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Online Agora</span>
                <span className="flex h-1.5 w-1.5 rounded-sm bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex items-center -space-x-2">
                {membrosOnline.slice(0, 5).map((m: any) => (
                    <Tooltip key={m.id} texto={m.nome} posicao="top">
                        <Avatar
                            nome={m.nome}
                            fotoPerfil={m.foto_perfil}
                            tamanho="sm"
                            className="ring-2 ring-sidebar border-none"
                        />
                    </Tooltip>
                ))}
                {membrosOnline.length > 5 && (
                    <div className="h-6 w-6 rounded-lg bg-sidebar-accent border border-sidebar-border flex items-center justify-center text-[8px] font-black text-muted-foreground z-10">
                        +{membrosOnline.length - 5}
                    </div>
                )}
            </div>
        </div>
    );
});
