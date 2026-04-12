import React, { memo } from 'react';
import { formatarDataHora } from '@/utilitarios/formatadores';
import { Emblema } from '@/compartilhado/componentes/Emblema';
import { User, Terminal, ChevronRight, ChevronDown, Clock, Globe } from 'lucide-react';
import type { LogSistema } from '../../hooks/usarLogs';

interface Props {
    log: LogSistema & { quantidade?: number };
    expandido: boolean;
    aoAlternar: (id: string) => void;
}

export const LinhaLog = memo(({ log, expandido, aoAlternar }: Props) => {
    const quantidade = log.quantidade || 1;

    const getCorModulo = (modulo: string) => {
        switch (modulo.toLowerCase()) {
            case 'kanban': return 'azul';
            case 'ponto': return 'amarelo';
            case 'membros': return 'roxo';
            case 'autenticacao': return 'vermelho';
            case 'admin': return 'cinza';
            default: return 'verde';
        }
    };

    const getVarianteAcao = (acao: string) => {
        const a = acao.toUpperCase();
        if (a.includes('ERRO') || a.includes('REJEITADA') || a.includes('REMOVIDA') || a.includes('REMOVIDO') || a.includes('DELETE')) return 'vermelho';
        if (a.includes('CRIADA') || a.includes('CADASTRADO') || a.includes('ADICIONADO') || a.includes('APROVADA') || a.includes('NOVO') || a.includes('PRE_CADASTRADO')) return 'verde';
        if (a.includes('EDITADA') || a.includes('ALTERADA') || a.includes('ATUALIZADA') || a.includes('MOVIDA') || a.includes('RENOMEADA') || a.includes('CONFIG_')) return 'amarelo';
        if (a.includes('LOGIN') || a.includes('MSAL') || a.includes('ENTRADA') || a.includes('SAIDA') || a.includes('SESSION')) return 'roxo';
        return 'azul';
    };

    const getEstiloLinha = (acao: string) => {
        const v = getVarianteAcao(acao);
        const map = {
            vermelho: 'border-l-rose-500 hover:bg-rose-500/[0.03]',
            verde: 'border-l-emerald-500 hover:bg-emerald-500/[0.03]',
            amarelo: 'border-l-amber-500 hover:bg-amber-500/[0.03]',
            roxo: 'border-l-indigo-500 hover:bg-indigo-500/[0.03]',
            azul: 'border-l-blue-500 hover:bg-blue-500/[0.03]',
            cinza: 'border-l-slate-400 hover:bg-slate-400/[0.03]'
        };
        return map[v as keyof typeof map] || map.azul;
    };

    return (
        <tr 
            onClick={() => aoAlternar(log.id)} 
            className={`
                group cursor-pointer transition-all duration-300 border-l-[3px]
                ${expandido ? 'bg-muted/30' : 'bg-transparent'}
                ${getEstiloLinha(log.acao)}
                hover:shadow-[inset_4px_0_0_0_currentColor]
            `}
        >
            {/* 1. Cronômetro Stylized */}
            <td className="px-6 py-3.5 align-middle">
                <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black tabular-nums text-foreground/80 tracking-tight leading-none">
                        {formatarDataHora(log.criado_em).split(' às ')[1]}
                    </span>
                    <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-70 transition-opacity">
                        <Clock size={10} strokeWidth={3} />
                        <span className="text-[9px] font-bold tabular-nums tracking-widest leading-none">
                            {formatarDataHora(log.criado_em).split(' às ')[0]}
                        </span>
                    </div>
                </div>
            </td>

            {/* 2. Operação com Contador */}
            <td className="px-4 py-3.5 align-middle">
                <div className="flex items-center gap-2.5">
                    <Emblema 
                        texto={log.acao.replace(/_/g, ' ')} 
                        variante={getVarianteAcao(log.acao)} 
                    />
                    {quantidade > 1 && (
                        <div className="flex items-center gap-1 animate-in zoom-in-50 duration-500 text-primary">
                            <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                            <span className="text-[10px] font-black tracking-tighter">x{quantidade}</span>
                        </div>
                    )}
                </div>
            </td>

            {/* 3. Agente Responsável - Expanded View */}
            <td className="px-4 py-3.5 align-middle">
                {log.nome ? (
                    <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-card flex items-center justify-center border border-border shadow-sm group-hover:border-primary/20 transition-all overflow-hidden shrink-0 relative">
                            {log.foto_perfil ? (
                                <img src={log.foto_perfil} alt={log.nome} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            ) : (
                                <User size={16} className="text-muted-foreground/40 transition-transform group-hover:scale-110" />
                            )}
                            {log.ip && (
                                <div className="absolute top-0 right-0 p-0.5 bg-primary/10 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Globe size={6} className="text-primary" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                            <span className="text-[12px] font-black text-foreground/90 uppercase tracking-tighter truncate leading-none">{log.nome}</span>
                            <span className="text-[10px] text-muted-foreground/30 font-bold truncate lowercase tracking-tight">@{log.email?.split('@')[0]}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2.5 px-3 py-1.5 bg-muted/20 rounded-xl w-fit border border-border/10">
                        <Terminal size={14} className="text-muted-foreground/20" strokeWidth={3} />
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/30">System Agent</span>
                    </div>
                )}
            </td>

            {/* 4. Descrição do Evento - Enhanced Typography */}
            <td className="px-4 py-3.5 align-middle">
                <div className="flex items-center justify-between gap-6 mr-4">
                    <p className="text-[13px] font-semibold text-foreground/70 group-hover:text-foreground transition-all leading-relaxed tracking-normal first-letter:uppercase">
                        {log.descricao}
                    </p>
                    <div className={`shrink-0 p-1.5 rounded-lg transition-all ${expandido ? 'bg-primary text-primary-foreground rotate-180 shadow-lg shadow-primary/20' : 'bg-muted/50 text-muted-foreground opacity-0 group-hover:opacity-100'}`}>
                        {expandido ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
                    </div>
                </div>
            </td>

            {/* 5. Módulo e Contexto */}
            <td className="px-6 py-3.5 align-middle text-right">
                <div className="flex flex-col items-end gap-2">
                    <Emblema 
                        texto={log.modulo} 
                        variante={getCorModulo(log.modulo) as any} 
                    />
                    <div className="flex items-center gap-1.5 opacity-20 group-hover:opacity-40 transition-opacity">
                        <span className="text-[9px] font-black uppercase tracking-widest">Auditoria</span>
                        <div className="w-1.5 h-[1px] bg-foreground" />
                    </div>
                </div>
            </td>
        </tr>
    );
});

export default LinhaLog;
