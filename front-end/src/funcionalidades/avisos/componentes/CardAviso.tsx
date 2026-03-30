import { memo } from 'react';
import { Trash2, Megaphone } from 'lucide-react';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { formatarDataHora } from '@/utilitarios/formatadores';
import { Emblema } from '@/compartilhado/componentes/Emblema';
import { Botao } from '@/compartilhado/componentes/ui/Botao';

interface CardAvisoProps {
    aviso: any;
    podeDeletar: boolean;
    aoRemover: (id: string) => void;
    index: number;
}

export const CardAviso = memo(({ aviso, podeDeletar, aoRemover, index }: CardAvisoProps) => {
    const IconePrioridade = aviso.prioridade === 'urgente' ? Megaphone : null;

    return (
        <div className={`card-glass p-5 md:p-6 relative overflow-hidden flex flex-col sm:flex-row gap-6 card-glass-hover h-full transition-all group animar-entrada atraso-${(index % 5) + 1}`}>
            {/* Mural de avisos usa design de cápsula totalmente arredondada */}

            {/* Lado Esquerdo - Conteúdo Principal */}
            <div className="flex-1 flex flex-col">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Emblema 
                        texto={aviso.prioridade === 'info' ? 'Informativo' : aviso.prioridade === 'importante' ? 'Importante' : 'Urgente'}
                        variante={aviso.prioridade === 'urgente' ? 'vermelho' : aviso.prioridade === 'importante' ? 'amarelo' : 'azul'}
                        className="py-1 px-3"
                    />
                    <span className="text-muted-foreground/60 text-[10px] font-bold uppercase tracking-wider pl-2">
                        {formatarDataHora(aviso.criado_em)}
                    </span>
                    {aviso.expira_em && (
                        <span className="text-muted-foreground/50 text-[10px] uppercase font-bold tracking-wider border-l border-border pl-3 ml-1">
                            Expira em {formatarDataHora(aviso.expira_em)}
                        </span>
                    )}
                </div>

                <h3 className={`text-[17px] font-bold text-foreground tracking-tight ${aviso.conteudo ? 'mb-2' : 'mb-0'}`}>
                    {IconePrioridade && <IconePrioridade className="inline w-5 h-5 text-destructive mr-2 -mt-1" />}
                    {aviso.titulo}
                </h3>

                {aviso.conteudo && (
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-[15px]">
                        {aviso.conteudo}
                    </p>
                )}
            </div>

            {/* Lado Direito - Autor e Ações */}
            <div className="sm:w-56 shrink-0 flex flex-row sm:flex-col justify-between items-center sm:items-stretch border-t sm:border-t-0 sm:border-l border-border pt-5 sm:pt-0 sm:pl-6 relative">
                
                {/* Lixeira */}
                <div className="order-2 sm:order-1 flex justify-end min-h-[32px]">
                    {podeDeletar && (
                        <Botao 
                            variante="fantasma"
                            tamanho="icone"
                            onClick={() => aoRemover(aviso.id)}
                            className="text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-full transition-all sm:opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none sm:-mt-2 sm:-mr-2 flex items-center justify-center shrink-0"
                            icone={<Trash2 className="w-4 h-4" />}
                            title="Apagar Aviso"
                        />
                    )}
                </div>

                {/* Autor */}
                <div className="order-1 sm:order-2 flex items-center justify-start sm:justify-end gap-3 mt-auto flex-1 sm:flex-initial min-w-0">
                    <div className="text-left sm:text-right min-w-0">
                        <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-0.5">Publicado por</p>
                        <p className="text-[13px] font-bold text-foreground leading-tight sm:line-clamp-2">{aviso.criado_por.nome || 'Sistema'}</p>
                    </div>
                    <div className="shrink-0">
                        <Avatar nome={aviso.criado_por.nome || 'S'} fotoPerfil={aviso.criado_por.foto} tamanho="md" />
                    </div>
                </div>
            </div>
        </div>
    );
});
