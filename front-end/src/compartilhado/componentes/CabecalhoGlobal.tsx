import { useState, useMemo } from 'react';
import { useLocation, Link } from 'react-router';
import { 
    Menu, QrCode, Sun, Moon, Bell, Search, 
    User, LogOut, ChevronRight, LayoutDashboard,
    FolderKanban, Clock, Megaphone, ListTodo,
    Settings, Users, LayoutGrid, FileText, Database, Layers, ShieldCheck, Activity
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import { usarTema } from '@/contexto/ContextoTema';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { usarNotificacoes } from '@/compartilhado/hooks/usarNotificacoes';
import { Avatar } from './Avatar';
import logoUnieuro from '../../assets/logo-unieuro.png';

interface CabecalhoGlobalProps {
    aoAbrirSidebar: () => void;
    aoAbrirScanner: () => void;
}

/**
 * Mapeamento de rotas para nomes e ícones.
 */
const CONFIG_ROTAS: Record<string, { label: string; icone: any }> = {
    'app': { label: 'Visão Geral', icone: LayoutDashboard },
    'dashboard': { label: 'Dashboard', icone: LayoutDashboard },
    'backlog': { label: 'Backlog', icone: ListTodo },
    'projeto': { label: 'Projeto', icone: Layers },
    'kanban': { label: 'Kanban', icone: FolderKanban },
    'ponto': { label: 'Ponto Eletrônico', icone: Clock },
    'avisos': { label: 'Mural de Avisos', icone: Megaphone },
    'admin': { label: 'Administração', icone: Settings },
    'membros': { label: 'Gerenciar Membros', icone: Users },
    'equipes': { label: 'Gestão de Equipes', icone: LayoutGrid },
    'projetos': { label: 'Configurar Projetos', icone: FolderKanban },
    'relatorios': { label: 'Relatórios', icone: FileText },
    'logs': { label: 'Logs do Sistema', icone: Database },
    'configuracoes': { label: 'Governança', icone: Settings },
    'justificativas': { label: 'Auditoria de Ponto', icone: Clock }
};

/**
 * Cabeçalho Global Moderno - Estilo Mission Control.
 * Integra título dinâmico, navegação e comandos globais em um design premium.
 */
export function CabecalhoGlobal({ aoAbrirSidebar, aoAbrirScanner }: CabecalhoGlobalProps) {
    const { tema, setTema } = usarTema();
    const { usuario, sair, ehDonoReal, setRoleVisualizacao, configuracoes } = usarAutenticacao();
    const { notificacoes } = usarNotificacoes();
    const location = useLocation();
    const [buscaFocada, setBuscaFocada] = useState(false);

    const totalNaoLidas = notificacoes.length;

    // Lógica para Título Dinâmico
    const pathAtivo = useMemo(() => {
        const parts = location.pathname.split('/').filter(p => p);
        const last = parts[parts.length - 1];
        return CONFIG_ROTAS[last] || { label: 'Fábrica de Software', icone: Layers };
    }, [location.pathname]);

    return (
        <header className="h-20 shrink-0 flex items-center justify-between px-6 bg-background/40 backdrop-blur-2xl border-b border-border/40 sticky top-0 z-40 transition-all duration-500 overflow-hidden group/header">
            
            {/* Esquerda: Identidade & Título Dinâmico */}
            <div className="flex items-center gap-6">
                <button
                    onClick={aoAbrirSidebar}
                    className="lg:hidden p-2.5 -ml-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-2xl transition-all"
                >
                    <Menu size={20} strokeWidth={2.5} />
                </button>

                <div className="flex items-center gap-4 animar-entrada">
                    <img src={logoUnieuro} alt="Unieuro" className="hidden sm:block w-9 h-9 object-contain group-hover/header:rotate-6 transition-transform duration-500" />
                    
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <pathAtivo.icone size={14} className="text-primary/60" />
                            <h1 className="text-sm font-black text-foreground uppercase tracking-wider text-gradient-premium">
                                {pathAtivo.label}
                            </h1>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 opacity-40">
                             <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">SoftHub</span>
                             <ChevronRight size={10} />
                             <span className="text-[9px] font-bold uppercase tracking-widest text-primary italic">Mission Control</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Centro: Busca Global Inteligente (Placeholder) */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
                <div className={`
                    relative w-full transition-all duration-500 group/search
                    ${buscaFocada ? 'scale-[1.02]' : 'scale-100'}
                `}>
                    <Search 
                        size={16} 
                        className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${buscaFocada ? 'text-primary' : 'text-muted-foreground/30'}`} 
                    />
                    <input 
                        type="text"
                        placeholder="Pesquisar tarefas, membros ou avisos..."
                        onFocus={() => setBuscaFocada(true)}
                        onBlur={() => setBuscaFocada(false)}
                        className={`
                            w-full h-11 pl-12 pr-4 bg-background/40 border border-border/20 rounded-2xl 
                            text-[13px] placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20
                            transition-all duration-500 backdrop-blur-md shadow-inner
                            ${buscaFocada ? 'bg-background/60 border-primary/20' : 'hover:border-border/40'}
                        `}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-muted rounded border border-border/40 text-[9px] font-black text-muted-foreground/40 tracking-widest">
                        CTRL + K
                    </div>
                </div>
            </div>

            {/* Direita: Ações & Perfil */}
            <div className="flex items-center gap-3">
                
                {/* Comandos Rápidos */}
                <div className="hidden sm:flex items-center gap-1 p-1.5 bg-background/40 backdrop-blur-md rounded-2xl border border-border/20 shadow-inner">
                    <Tooltip texto="Conectar via QR" posicao="bottom">
                        <button
                            onClick={aoAbrirScanner}
                            className="p-2 text-muted-foreground hover:text-primary transition-all hover:bg-primary/5 rounded-xl border border-transparent hover:border-primary/10 active:scale-95"
                        >
                            <QrCode size={18} strokeWidth={2.5} />
                        </button>
                    </Tooltip>

                    <div className="w-px h-4 bg-border/20 mx-1" />

                    <Tooltip texto={tema === 'dark' ? "Modo Claro" : "Modo Escuro"} posicao="bottom">
                        <button
                            onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')}
                            className="p-2 text-muted-foreground hover:text-primary transition-all hover:bg-primary/5 rounded-xl border border-transparent hover:border-primary/10 active:scale-95"
                        >
                            {tema === 'dark' ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />}
                        </button>
                    </Tooltip>


                </div>

                {/* Notificações */}
                <Tooltip texto="Notificações" posicao="bottom">
                    <button className="relative p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/10 rounded-2xl transition-all group/notif">
                        <Bell size={20} strokeWidth={2.5} className="group-hover/notif:rotate-12 transition-transform" />
                        {totalNaoLidas > 0 && (
                            <span className="absolute top-2 right-2 w-4.5 h-4.5 bg-primary text-[10px] font-black text-white rounded-full flex items-center justify-center ring-2 ring-background animate-in zoom-in duration-300">
                                {totalNaoLidas}
                            </span>
                        )}
                    </button>
                </Tooltip>

                {/* Perfil & Logout */}
                {usuario && (
                    <div className="flex items-center gap-3 ml-2 pl-3 border-l border-border/20">
                        <div className="hidden lg:flex flex-col text-right">
                            <span className="text-[12px] font-black tracking-tight text-foreground truncate max-w-[120px]">
                                {usuario.nome.split(' ')[0]}
                            </span>
                            <div className="flex items-center gap-1.5 justify-end">
                                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest -mt-0.5">
                                    {usuario.role}
                                </span>
                                
                                {ehDonoReal && usuario.role === 'ADMIN' && (
                                    <Tooltip texto="Simular outro cargo" posicao="bottom">
                                        <div className="relative group/sim-menu">
                                            <button className="p-1 text-rose-500 hover:text-rose-400 transition-all hover:bg-rose-500/5 rounded-lg active:scale-90">
                                                <Activity size={14} strokeWidth={3} />
                                            </button>

                                            {/* Dropdown de Simulação - Posicionado em relação ao role */}
                                            <div className="absolute right-0 top-full pt-2 opacity-0 translate-y-2 pointer-events-none group-hover/sim-menu:opacity-100 group-hover/sim-menu:translate-y-0 group-hover/sim-menu:pointer-events-auto transition-all duration-300 z-50">
                                                <div className="w-64 bg-card/95 backdrop-blur-xl border border-amber-500/20 rounded-2xl shadow-2xl p-2">
                                                    <div className="px-3 py-3 border-b border-border/20 mb-1">
                                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Simulação de Cargo</p>
                                                        <p className="text-[9px] text-muted-foreground leading-tight mt-1">Teste as permissões de outros cargos em tempo real.</p>
                                                    </div>
                                                    
                                                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1 space-y-1">
                                                        {(configuracoes.hierarquia_roles || []).filter(r => r !== 'ADMIN').map(role => (
                                                            <button
                                                                key={role}
                                                                onClick={() => setRoleVisualizacao(role)}
                                                                className="w-full text-left px-3 py-2 text-[11px] font-bold text-muted-foreground hover:text-amber-500 hover:bg-amber-500/5 rounded-xl transition-all flex items-center justify-between group/item"
                                                            >
                                                                {role}
                                                                <ChevronRight size={12} className="opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                        
                        <div className="relative group/perfil">
                            <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover/perfil:opacity-40 transition-opacity rounded-full" />
                            <Avatar nome={usuario.nome} fotoPerfil={usuario.foto_perfil} tamanho="md" />
                            
                            {/* Menu de Perfil (Simples) */}
                            <div className="absolute right-0 top-full pt-4 opacity-0 translate-y-2 pointer-events-none group-hover/perfil:opacity-100 group-hover/perfil:translate-y-0 group-hover/perfil:pointer-events-auto transition-all duration-300 z-50">
                                <div className="w-56 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-2">
                                    <div className="px-3 py-3 border-b border-border/20 mb-1">
                                        <p className="text-[11px] font-black text-foreground uppercase tracking-widest">{usuario.nome}</p>
                                        <p className="text-[10px] text-muted-foreground truncate">{usuario.email}</p>
                                    </div>
                                    <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[12px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                                        <User size={16} /> Ver Perfil
                                    </button>
                                    <button 
                                        onClick={sair}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[12px] font-medium text-red-400 hover:bg-red-400/5 rounded-xl transition-all"
                                    >
                                        <LogOut size={16} /> Sair do Sistema
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Brilho Superior */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-1/3 h-20 bg-primary/10 blur-[100px] pointer-events-none" />
        </header>
    );
}
