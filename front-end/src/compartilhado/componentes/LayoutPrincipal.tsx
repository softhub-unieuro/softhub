import { useState, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { BarraLateral } from './BarraLateral';
import { Menu, X } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { usarProjetos } from '@/funcionalidades/projetos/hooks/usarProjetos';
import { Modal } from './Modal';
import ScannerQR from '@/funcionalidades/autenticacao/componentes/ScannerQR';
import { ErrorBoundary } from './ErrorBoundary';
import { SincronizadorGlobal } from './SincronizadorGlobal';
import { Breadcrumbs } from './Breadcrumbs';
import { usarGuardiaoSessao } from '../hooks/usarGuardiaoSessao';
import { usarSaidaAutomatica } from '@/funcionalidades/ponto/hooks/usarSaidaAutomatica';
import { ShieldAlert, LogOut, Clock } from 'lucide-react';
import { BarraPrevisualizacaoCargo } from './BarraPrevisualizacaoCargo';

interface LayoutPrincipalProps {
    children: ReactNode;
}

/**
 * Layout base de todas as páginas internas da aplicação.
 * Sidebar fixa no Desktop e Drawer no Mobile. Sem cabeçalho global.
 */
export function LayoutPrincipal({ children }: LayoutPrincipalProps) {
    const location = useLocation();
    const [sidebarAberta, setSidebarAberta] = useState(false);
    const [scannerAberto, setScannerAberto] = useState(false);
    const { projetoAtivoId } = usarAutenticacao();
    const { projetos } = usarProjetos();
    const { sessaoExpirando, continuarLogado, sairAgora } = usarGuardiaoSessao();

    // O layout agora gerencia o scroll global fluido sem depender de checar rotas específicas.

    // Inicia o hook de monitoramento para saída automática ao fechar a página
    usarSaidaAutomatica();

    // Dinamismo Inteligente: Atualiza o título da aba com o nome do projeto ativo
    useEffect(() => {
        const projeto = projetos.find(p => p.id === projetoAtivoId);
        if (projeto) {
            document.title = `${projeto.nome} | SoftHub`;
        } else {
            document.title = 'Fábrica de Software | SoftHub';
        }
    }, [projetoAtivoId, projetos]);

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden transition-colors duration-300 font-sans">
            <BarraPrevisualizacaoCargo />
            
            <div className="flex flex-1 overflow-hidden">
                <SincronizadorGlobal />

                {/* Sidebar Desktop */}
                <div className="hidden lg:flex shrink-0 w-[280px]">
                    <BarraLateral aoAbrirScanner={() => setScannerAberto(true)} />
                </div>

                {/* Mobile: Overlay & Drawer Sidebar */}
                {sidebarAberta && (
                    <div
                        className="fixed inset-0 z-50 lg:hidden"
                        onClick={() => setSidebarAberta(false)}
                    >
                        {/* Backdrop com Blur e Fade In */}
                        <div className="absolute inset-0 bg-background/60 animate-backdrop-in" />

                        {/* Drawer Content com Slide In */}
                        <div
                            className="absolute inset-y-0 left-0 w-[280px] bg-sidebar border-r border-sidebar-border shadow-2xl animate-sidebar-in"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex flex-col h-full relative">
                                <BarraLateral
                                    aoNavegar={() => setSidebarAberta(false)}
                                    aoAbrirScanner={() => setScannerAberto(true)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col flex-1 overflow-hidden relative min-w-0">
                    {/* Botão de menu mobile flutuante - Ajustado para descer se a barra estiver ativa */}
                    <button
                        onClick={() => setSidebarAberta(true)}
                        className={`lg:hidden fixed left-4 z-40 p-2.5 bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg text-muted-foreground hover:text-primary transition-all active:scale-95 ${
                            usarAutenticacao().roleVisualizacao ? 'top-16' : 'top-4'
                        }`}
                    >
                        <Menu size={20} strokeWidth={2.5} />
                    </button>

                    <main className="flex-1 p-6 pt-20 lg:pt-6 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col relative z-10 transition-all animar-entrada bg-background min-w-0">
                        <div className="flex-1 min-h-0 flex flex-col">
                            <Breadcrumbs />
                            <div className="flex-1 min-h-0 flex flex-col">
                                <ErrorBoundary modulo="Módulo Selecionado">
                                    {children}
                                </ErrorBoundary>
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            {/* Modal Scanner QR (Global via Layout) */}
            <Modal
                aberto={scannerAberto}
                aoFechar={() => setScannerAberto(false)}
                titulo="Conectar via QR Code"
                largura="sm"
            >
                <ScannerQR aoFechar={() => setScannerAberto(false)} />
            </Modal>

            {/* Modal de Segurança: Inatividade (Guardião) */}
            <Modal
                aberto={sessaoExpirando}
                aoFechar={continuarLogado}
                titulo="Aviso de Segurança"
                largura="sm"
            >
                <div className="p-2 space-y-6 text-center">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                        <ShieldAlert className="text-amber-500" size={32} />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-lg font-black text-foreground">Sessão Inativa</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Detectamos que você está inativo. Em computadores públicos, deslogamos automaticamente para proteger seus dados.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={continuarLogado}
                            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                        >
                            <Clock size={16} /> Continuar Logado
                        </button>
                        <button
                            onClick={sairAgora}
                            className="w-full py-4 bg-card border border-border/50 text-muted-foreground rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut size={16} /> Sair Agora
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
