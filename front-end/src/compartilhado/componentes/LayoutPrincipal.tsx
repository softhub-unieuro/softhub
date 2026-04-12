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
import { usarConfiguracoes } from '@/funcionalidades/admin/hooks/usarConfiguracoes';
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

    // Trava de Scroll do Body quando a Sidebar Mobile está aberta
    useEffect(() => {
        const root = document.documentElement;
        if (sidebarAberta) {
            document.body.style.overflow = 'hidden';
            root.style.overflow = 'hidden';
            document.body.style.height = '100dvh'; // Previne rolagem no mobile
            root.style.overscrollBehavior = 'none'; // Previne efeito elástico (bounce) no iOS/Android
        } else {
            document.body.style.overflow = '';
            root.style.overflow = '';
            document.body.style.height = '';
            root.style.overscrollBehavior = '';
        }
        return () => {
            document.body.style.overflow = '';
            root.style.overflow = '';
            document.body.style.height = '';
            root.style.overscrollBehavior = '';
        };
    }, [sidebarAberta]);

    const { configuracoes } = usarConfiguracoes();
    const corPrimaria = configuracoes?.cor_primaria || '#4f46e2';

    // Injeção Dinâmica de Branding (Primary Color)
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--primary', corPrimaria);
        
        // Calcular variações de opacidade para sombras e estados hover
        root.style.setProperty('--primary-ring', `${corPrimaria}33`); // 20%
        root.style.setProperty('--primary-muted', `${corPrimaria}1a`); // 10%
    }, [corPrimaria]);

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
        <div className="flex flex-col min-h-screen w-full bg-background text-foreground transition-colors duration-300 font-sans">
            <BarraPrevisualizacaoCargo />
            
            <div className="flex flex-1 w-full relative">
                <SincronizadorGlobal />

                {/* Sidebar Desktop - FIXED h-screen que se mantém estática enquanto o body scrolla */}
                <div className="hidden lg:flex fixed inset-y-0 left-0 w-[280px] z-30 h-screen">
                    <BarraLateral aoAbrirScanner={() => setScannerAberto(true)} />
                </div>

                {/* Mobile: Overlay & Drawer Sidebar */}
                {sidebarAberta && (
                    <div
                        className="fixed inset-0 z-50 lg:hidden touch-none"
                        onClick={() => setSidebarAberta(false)}
                    >
                        {/* Backdrop com Blur e Fade In */}
                        <div className="absolute inset-0 bg-background/60 animate-backdrop-in touch-none" />

                        {/* Drawer Content com Slide In */}
                        <div
                            className="absolute inset-y-0 left-0 w-[280px] bg-sidebar border-r border-sidebar-border shadow-2xl animate-sidebar-in h-[100dvh] touch-auto"
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

                {/* Container de Conteúdo - Recebe padding paraSidebar e cresce com o conteúdo do BODY */}
                <div className="flex flex-col flex-1 w-full min-w-0 lg:pl-[280px]">
                    {/* Botão de menu mobile flutuante - Posicionado para ergonomia (FAB) */}
                    <button
                        onClick={() => setSidebarAberta(true)}
                        className="lg:hidden fixed right-6 bottom-6 z-40 p-3.5 bg-card/40 backdrop-blur-xl border border-white/[0.08] text-muted-foreground/50 rounded-full shadow-lg hover:text-primary hover:border-primary/20 transition-all active:scale-90"
                    >
                        <Menu size={20} strokeWidth={2} />
                    </button>

                    <main className="flex-1 w-full flex flex-col relative z-20 transition-all animar-entrada min-w-0">
                        <div className="flex-1 flex flex-col">
                            <Breadcrumbs />
                            <div className="flex-1 flex flex-col w-full px-6 py-6">
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
