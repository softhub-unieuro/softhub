import { formatarDataHora } from '@/utilitarios/formatadores';
import { Emblema } from '@/compartilhado/componentes/Emblema';
import type { JustificativaPonto } from '@/funcionalidades/ponto/hooks/usarJustificativa';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { Pencil, Trash2 } from 'lucide-react';
import { Tooltip } from '@/compartilhado/componentes/Tooltip';
import { Botao } from '@/compartilhado/componentes/ui/Botao';

interface ListaJustificativasProps {
    justificativas: JustificativaPonto[];
    aoEditar: (just: JustificativaPonto) => void;
    aoExcluir: (id: string) => void;
}

/** Mapeia o tipo técnico para rótulo amigável. */
const formatarTipo = (tipo: string): string => {
    const mapa: Record<string, string> = {
        ausencia: 'Ausência (Atestado/Falta)',
        esquecimento: 'Esquecimento de Batida',
        problema_sistema: 'Falha no Sistema',
    };
    return mapa[tipo] ?? tipo;
};

/**
 * Lista de justificativas do próprio usuário em formato de tabela padronizada.
 * Exibida no painel de ponto eletrônico.
 */
export function ListaJustificativas({ justificativas, aoEditar, aoExcluir }: ListaJustificativasProps) {
    if (justificativas.length === 0) {
        return (
            <div className="py-8">
                <EstadoVazio 
                    titulo="Sem justificativas" 
                    descricao="Você ainda não enviou nenhuma justificativa de ponto." 
                    compacto={true}
                />
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                        <th className="px-3 py-2.5 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                            Data
                        </th>
                        <th className="px-3 py-2.5 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                            Tipo
                        </th>
                        <th className="px-3 py-2.5 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 hidden sm:table-cell">
                            Motivo
                        </th>
                        <th className="px-3 py-2.5 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                            Status
                        </th>
                        <th className="px-3 py-2.5 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 w-24">
                            Ações
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                    {justificativas.map(just => (
                        <tr key={just.id} className="hover:bg-muted/20 transition-colors">
                            {/* Data */}
                            <td className="px-3 py-3 align-middle text-center">
                                <p className="text-[11px] text-foreground">
                                    {formatarDataHora(just.criado_em)}
                                </p>
                            </td>

                            {/* Tipo */}
                            <td className="px-3 py-3 align-middle text-center">
                                <span className="text-[11px] font-bold text-primary/70 uppercase tracking-wide">
                                    {formatarTipo(just.tipo)}
                                </span>
                            </td>

                            {/* Motivo */}
                            <td className="px-3 py-3 align-middle text-center hidden sm:table-cell">
                                <p className="text-[11px] text-muted-foreground line-clamp-2 max-w-[200px] mx-auto">
                                    {just.motivo}
                                </p>
                                {just.status === 'rejeitada' && just.motivo_rejeicao && (
                                    <p className="text-[10px] text-destructive mt-1 font-medium">
                                        Reprovação: {just.motivo_rejeicao}
                                    </p>
                                )}
                            </td>

                            {/* Status */}
                            <td className="px-3 py-3 align-middle text-center w-28">
                                {just.status === 'aprovada' && <Emblema texto="Aprovada" variante="verde" />}
                                {just.status === 'rejeitada' && <Emblema texto="Rejeitada" variante="vermelho" />}
                                {just.status === 'pendente' && <Emblema texto="Pendente" variante="amarelo" />}
                            </td>
                            
                            {/* Ações */}
                            <td className="px-3 py-3 align-middle text-center w-24">
                                {just.status === 'pendente' ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Tooltip texto="Editar" posicao="top">
                                            <Botao 
                                                variante="fantasma"
                                                tamanho="icone"
                                                onClick={() => aoEditar(just)}
                                                className="h-8 w-8 rounded-2xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
                                                icone={<Pencil className="w-4 h-4" />}
                                            />
                                        </Tooltip>
                                        <Tooltip texto="Excluir" posicao="top">
                                            <Botao 
                                                variante="fantasma"
                                                tamanho="icone"
                                                onClick={() => aoExcluir(just.id)}
                                                className="h-8 w-8 rounded-2xl text-slate-400 hover:text-destructive hover:bg-destructive/5 transition-colors"
                                                icone={<Trash2 className="w-4 h-4" />}
                                            />
                                        </Tooltip>
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-muted-foreground/40 font-black tracking-widest uppercase truncate">-</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
