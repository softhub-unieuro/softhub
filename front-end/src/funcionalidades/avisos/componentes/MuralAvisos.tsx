import { useState, useMemo, memo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Megaphone } from 'lucide-react';
import { usarAvisos } from '@/funcionalidades/avisos/hooks/usarAvisos';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { EstadoErro } from '@/compartilhado/componentes/EstadoErro';
import { usarPermissao, usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { Modal } from '@/compartilhado/componentes/Modal';
import { FormularioAviso } from './FormularioAviso';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { CardAviso } from './CardAviso';

export const MuralAvisos = memo(() => {
    const { avisos, carregando, erro, removerAviso } = usarAvisos();
    const podeCriar = usarPermissaoAcesso('avisos:criar');
    const podeRemoverGeral = usarPermissaoAcesso('avisos:remover');
    const isAdmin = usarPermissao('ADMIN');
    const [modalAberto, setModalAberto] = useState(false);
    const { usuario } = usarAutenticacao();
    const [searchParams, setSearchParams] = useSearchParams();
    const [avisoDestacadoId, setAvisoDestacadoId] = useState<string | null>(null);
    const refDestaque = useRef<HTMLDivElement>(null);

    // Destaque de aviso vindo do Dashboard
    useEffect(() => {
        const destaque = searchParams.get('destaque');
        if (destaque && avisos.length > 0) {
            setAvisoDestacadoId(destaque);
            // Limpa o query param para não persistir
            setSearchParams({}, { replace: true });
            // Scroll após renderização
            setTimeout(() => {
                refDestaque.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
            // Remove destaque após 3s
            setTimeout(() => setAvisoDestacadoId(null), 4000);
        }
    }, [searchParams, avisos, setSearchParams]);

    // Ordenamos os avisos para Urgente aparecer primeiro
    const avisosOrdenados = useMemo(() => {
        return [...avisos].sort((a, b) => {
            const pVal: Record<string, number> = { urgente: 3, importante: 2, info: 1 };
            return (pVal[b.prioridade] || 0) - (pVal[a.prioridade] || 0);
        });
    }, [avisos]);

    return (
        <div className="w-full space-y-6 animar-entrada">
            <CabecalhoFuncionalidade
                titulo="Quadro de Avisos"
                subtitulo="Comunicados importantes para toda a equipe."
                icone={Megaphone}
                variante="destaque"
            >
                <div className="flex items-center gap-4">
                    {podeCriar && (
                        <button
                            onClick={() => setModalAberto(true)}
                            className="h-11 px-6 bg-primary text-primary-foreground rounded-full flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all"
                        >
                            <Plus size={18} strokeWidth={3} />
                            <span>Criar Aviso</span>
                        </button>
                    )}
                </div>
            </CabecalhoFuncionalidade>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                {carregando && avisos.length === 0 ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 w-full bg-card/60 border border-border/40 rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : erro ? (
                    <div className="py-24 max-w-lg mx-auto w-full">
                         <EstadoErro titulo="Erro no Mural" mensagem={erro} />
                    </div>
                ) : avisosOrdenados.length === 0 ? (
                    <EstadoVazio 
                        titulo="Tudo Tranquilo"
                        descricao="Nenhum aviso novo por aqui. Continue o bom trabalho!"
                    />
                ) : (
                    avisosOrdenados.map((aviso, index) => {
                        const corDestaque: Record<string, string> = {
                            urgente: 'ring-red-500/50',
                            importante: 'ring-amber-500/50',
                            info: 'ring-blue-500/50',
                        };
                        const anel = corDestaque[aviso.prioridade] || 'ring-primary/50';
                        return (
                            <div 
                                key={aviso.id}
                                ref={aviso.id === avisoDestacadoId ? refDestaque : undefined}
                                className={`transition-all duration-700 rounded-3xl ${
                                    aviso.id === avisoDestacadoId 
                                        ? `ring-2 ${anel} ring-offset-2 ring-offset-background animate-pulse` 
                                        : ''
                                }`}
                            >
                                <CardAviso 
                                    aviso={aviso}
                                    podeDeletar={isAdmin || podeRemoverGeral || usuario?.id === aviso.criado_por.id}
                                    aoRemover={removerAviso}
                                    index={index}
                                />
                            </div>
                        );
                    })
                )}
            </div>

            {modalAberto && (
                <Modal aberto={modalAberto} aoFechar={() => setModalAberto(false)} titulo="Criar Novo Aviso" largura="sm">
                    <FormularioAviso aoSalvar={() => setModalAberto(false)} />
                </Modal>
            )}

        </div>
    );
});
 
export default MuralAvisos;
