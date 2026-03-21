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

    return (
        <tr 
            onClick={() => aoAlternar(log.id)} 
            className={`group cursor-pointer transition-colors ${expandido ? 'bg-muted/30' : 'hover:bg-muted/10'}`}
        >
            {/* 1. Timestamp (UTC) */}
            <td className="px-5 py-3.5 align-top">
                <div className="flex items-center gap-2">
                    <Clock size={12} className="text-muted-foreground/40" />
                    <span className="text-[10px] font-black text-muted-foreground tabular-nums tracking-wider uppercase">
                        {formatarDataHora(log.criado_em)}
                    </span>
                </div>
            </td>

            {/* 2. Operação (Ação) */}
            <td className="px-3 py-3.5 align-top">
                <Emblema 
                    texto={log.acao.replace(/_/g, ' ')} 
                    variante={log.acao.includes('ERRO') || log.acao.includes('REJEITADA') ? 'vermelho' : 'azul'} 
                />
            </td>

            {/* 3. Agente Responsável */}
            <td className="px-3 py-3.5 align-top">
                {log.nome ? (
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black text-foreground/80 uppercase tracking-wide truncate max-w-[150px]">{log.nome}</span>
                        <span className="text-[10px] text-muted-foreground/60 font-medium truncate max-w-[150px]">{log.email}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 text-muted-foreground/40">
                        <Terminal size={12} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">Sistema (Auto)</span>
                    </div>
                )}
            </td>

            {/* 4. Descrição do Evento */}
            <td className="px-3 py-3.5 align-top">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors leading-relaxed">
                        {log.descricao}
                    </span>
                    {expandido ? <ChevronDown size={14} className="text-primary" /> : <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-muted-foreground transition-all" />}
                </div>
            </td>

            {/* 5. Módulo de Origem */}
            <td className="px-5 py-3.5 align-top">
                <Emblema 
                    texto={log.modulo} 
                    variante={getCorModulo(log.modulo) as any} 
                />
            </td>
        </tr>
    );
});

export default LinhaLog;
