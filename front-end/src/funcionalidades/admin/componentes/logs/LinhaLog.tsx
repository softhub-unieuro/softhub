import React, { memo } from 'react';
import { formatarDataHora } from '@/utilitarios/formatadores';
import { Emblema } from '@/compartilhado/componentes/Emblema';
import { ShieldCheck, User, Terminal, ChevronRight, ChevronDown, Clock } from 'lucide-react';
import type { LogSistema } from '../../hooks/usarLogs';

interface Props {
    log: LogSistema;
    expandido: boolean;
    aoAlternar: (id: string) => void;
}

export const LinhaLog = memo(({ log, expandido, aoAlternar }: Props) => {
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
            vermelho: 'border-l-rose-500 hover:bg-rose-500/5',
            verde: 'border-l-emerald-500 hover:bg-emerald-500/5',
            amarelo: 'border-l-amber-500 hover:bg-amber-500/5',
            roxo: 'border-l-indigo-500 hover:bg-indigo-500/5',
            azul: 'border-l-blue-500 hover:bg-blue-500/5',
            cinza: 'border-l-slate-400 hover:bg-slate-400/5'
        };
        return map[v as keyof typeof map] || map.azul;
    };

    return (
        <tr 
            onClick={() => aoAlternar(log.id)} 
            className={`
                group cursor-pointer transition-all duration-300 border-l-4
                ${expandido ? 'bg-muted/30' : 'bg-transparent'}
                ${getEstiloLinha(log.acao)}
            `}
        >
            {/* 1. Timestamp (UTC) */}
            <td className="px-5 py-2.5 align-middle">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                        <Clock size={10} />
                        <span className="text-[9px] font-black uppercase tracking-tighter tabular-nums text-muted-foreground/60">DATA & HORA</span>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors tabular-nums">
                        {formatarDataHora(log.criado_em)}
                    </span>
                </div>
            </td>

            {/* 2. Operação (Ação) */}
            <td className="px-3 py-2.5 align-middle">
                <Emblema 
                    texto={log.acao.replace(/_/g, ' ')} 
                    variante={getVarianteAcao(log.acao)} 
                />
            </td>

            {/* 3. Agente Responsável */}
            <td className="px-3 py-2.5 align-middle">
                {log.nome ? (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border group-hover:border-primary/30 transition-all overflow-hidden shrink-0">
                            {log.foto_perfil ? (
                                <img src={log.foto_perfil} alt={log.nome} className="w-full h-full object-cover" />
                            ) : (
                                <User size={14} className="text-muted-foreground/60" />
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-bold text-foreground/90 uppercase tracking-tight truncate">{log.nome}</span>
                            <span className="text-[9px] text-muted-foreground/50 font-medium truncate italic">{log.email}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-2 py-1 bg-muted/30 rounded-lg w-fit">
                        <Terminal size={12} className="text-muted-foreground/40" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Sistema</span>
                    </div>
                )}
            </td>

            {/* 4. Descrição do Evento */}
            <td className="px-3 py-2.5 align-middle">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-medium text-foreground/70 group-hover:text-foreground transition-colors leading-relaxed truncate block w-full">
                        {log.descricao}
                    </span>
                    <div className={`p-1 rounded-full transition-all ${expandido ? 'bg-primary text-primary-foreground rotate-180' : 'bg-muted text-muted-foreground opacity-0 group-hover:opacity-100'}`}>
                        {expandido ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                </div>
            </td>

            {/* 5. Módulo de Origem */}
            <td className="px-5 py-2.5 align-middle text-right">
                <div className="flex flex-col items-end gap-1">
                    <span className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">ORIGEM</span>
                    <Emblema 
                        texto={log.modulo} 
                        variante={getCorModulo(log.modulo) as any} 
                    />
                </div>
            </td>
        </tr>
    );
});

export default LinhaLog;
