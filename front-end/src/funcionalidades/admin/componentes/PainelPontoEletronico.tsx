import { useState, memo, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Bot, Users, ClipboardCheck, Clock } from 'lucide-react';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { PainelJustificativas } from '@/funcionalidades/admin/componentes/justificativas/PainelListaJustificativas';
import { PainelMonitoramentoRealTime } from '@/funcionalidades/admin/componentes/justificativas/PainelMonitoramentoRealTime';
import { PainelHistoricoPorMembro } from '@/funcionalidades/admin/componentes/justificativas/PainelHistoricoPorMembro';
import { usarJustificativasAdmin } from '@/funcionalidades/admin/hooks/usarJustificativasAdmin';

/**
 * Painel Central de Gestão de Ponto Eletrônico & Auditoria.
 * Substitui o antigo PainelJustificativas isolado por uma visão unificada.
 */
export const PainelPontoEletronico = memo(() => {
    const [searchParams] = useSearchParams();
    const abaUrl = searchParams.get('aba') as any;
    const [abaAtiva, setAbaAtiva] = useState<'pendencias' | 'monitoramento' | 'historico'>(abaUrl || 'pendencias');

    const { justificativas } = usarJustificativasAdmin();
    const pendentesCount = useMemo(() => 
        justificativas.filter(j => j.status === 'pendente').length, 
    [justificativas]);

    useEffect(() => {
        if (abaUrl && ['pendencias', 'monitoramento', 'historico'].includes(abaUrl)) {
            setAbaAtiva(abaUrl);
        }
    }, [abaUrl]);

    const sections = [
        { 
            id: 'pendencias', 
            label: 'Auditoria de Pendências', 
            icone: ClipboardCheck, 
            desc: 'Aprovar ou rejeitar justificativas de ausências.',
            count: pendentesCount
        },
        { id: 'monitoramento', label: 'Monitoramento em Real-time', icone: Users, desc: 'Quem está com o cronômetro aberto na Fábrica.' },
        { id: 'historico', label: 'Frequência & Históricos', icone: Clock, desc: 'Analise o engajamento e audite batidas individuais.' },
    ];

    return (
        <div className="flex flex-col h-full space-y-8 animar-entrada pb-10 max-w-[1600px] mx-auto w-full px-4 sm:px-6">
            <CabecalhoFuncionalidade
                titulo="Central de Gestão de Ponto"
                subtitulo="Supervisão centralizada de assiduidade, presenças em tempo real e auditoria de justificativas."
                icone={Bot}
            />

            {/* Seletor de Abas Premium — Carrossel horizontal no mobile */}
            <div className="flex lg:flex-wrap items-center gap-3 bg-slate-50 border border-slate-100 p-2 sm:p-4 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-x-auto no-scrollbar snap-x flex-nowrap lg:flex-wrap">
                {sections.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => setAbaAtiva(section.id as any)}
                        className={`
                            flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-[1.2rem] sm:rounded-[2rem] border transition-all duration-500 group relative shrink-0 snap-center
                            ${abaAtiva === section.id 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 translate-y-[-2px]' 
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                            }
                        `}
                    >
                        <div className={`relative p-2 sm:p-2.5 rounded-xl transition-colors ${abaAtiva === section.id ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                            <section.icone size={18} />
                            {(section as any).count > 0 && (
                                <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 px-1 rounded-full flex items-center justify-center text-[9px] font-black border-2 ${
                                    abaAtiva === section.id ? 'bg-rose-500 text-white border-indigo-600' : 'bg-rose-500 text-white border-white shadow-sm'
                                }`}>
                                    {(section as any).count}
                                </span>
                            )}
                        </div>
                        <div className="text-left">
                            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest leading-none mb-1">{section.label}</p>
                            <p className={`hidden lg:block text-[9px] font-medium leading-none ${abaAtiva === section.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                                {section.desc}
                            </p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Conteúdo Dinâmico */}
            <div className="flex-1 min-h-0 bg-transparent rounded-3xl overflow-hidden flex flex-col animar-entrada-suave">
                {abaAtiva === 'pendencias' && <PainelJustificativas />}
                {abaAtiva === 'monitoramento' && <PainelMonitoramentoRealTime />}
                {abaAtiva === 'historico' && <PainelHistoricoPorMembro />}
            </div>
        </div>
    );
});

export default PainelPontoEletronico;
