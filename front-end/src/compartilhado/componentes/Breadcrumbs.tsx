import { useLocation, Link } from 'react-router';
import { ChevronRight, Home, LayoutPanelLeft } from 'lucide-react';
import { useMemo } from 'react';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { usarProjetos } from '@/funcionalidades/projetos/hooks/usarProjetos';

/**
 * Mapeamento de rotas para nomes amigáveis.
 */
const NOMES_ROTAS: Record<string, string> = {
    'app': 'Início',
    'dashboard': 'Dashboard',
    'backlog': 'Backlog',
    'projeto': 'Projeto',
    'kanban': 'Kanban',
    'ponto': 'Minha Presença',
    'avisos': 'Quadro de Avisos',
    'admin': 'Administração',
    'membros': 'Gestão de Pessoas',
    'equipes': 'Equipes',
    'projetos': 'Projetos',
    'relatorios': 'Relatórios',
    'logs': 'Registros do Sistema',
    'configuracoes': 'Governança',
    'justificativas': 'Aprovar Faltas',
    'portfolio': 'Portfólio'
};

/**
 * Componente de navegação hierárquica (Breadcrumbs).
 * Design coeso com o sistema — discreto, com mesma tipografia dos labels.
 */
export function Breadcrumbs() {
    const location = useLocation();
    const { projetoAtivoId } = usarAutenticacao();
    const { projetos } = usarProjetos();

    const paths = useMemo(() => {
        return location.pathname.split('/').filter(p => p && p !== '');
    }, [location.pathname]);

    const projetoAtivo = useMemo(() => {
        if (!projetoAtivoId) return null;
        return projetos.find(p => p.id === projetoAtivoId);
    }, [projetoAtivoId, projetos]);

    if (paths.length <= 1 || paths.includes('dashboard')) return null;

    return (
        <nav className="flex items-center gap-1.5 px-6 pt-6 overflow-x-auto scrollbar-none whitespace-nowrap animar-entrada">
            <Link 
                to="/app/dashboard" 
                className="p-1 text-muted-foreground/30 hover:text-primary transition-colors rounded"
            >
                <Home size={13} strokeWidth={1.8} />
            </Link>

            {paths.map((path, index) => {
                const isLast = index === paths.length - 1;
                const label = NOMES_ROTAS[path] || path;
                const to = `/${paths.slice(0, index + 1).join('/')}`;
                
                // Se estiver no kanban, backlog ou detalhes de projeto e for a última página, tenta injetar o projeto antes
                const mostrarProjeto = isLast && (path === 'kanban' || path === 'backlog' || path === 'projeto') && projetoAtivo;

                return (
                    <div key={to} className="flex items-center gap-1.5 ">
                        <ChevronRight size={11} className="text-border shrink-0" />
                        
                        {mostrarProjeto && (
                            <div className="flex items-center gap-1.5">
                                <Link
                                    to="/app/projetos"
                                    className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/30 hover:text-foreground/50 transition-colors uppercase tracking-[0.15em]"
                                >
                                    <LayoutPanelLeft size={10} className="mb-0.5" />
                                    {projetoAtivo?.nome}
                                </Link>
                                <ChevronRight size={11} className="text-border shrink-0" />
                            </div>
                        )}

                        {isLast ? (
                            <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-[0.15em]">
                                {label}
                            </span>
                        ) : (
                            <Link
                                to={to}
                                className="text-[10px] font-medium text-muted-foreground/30 hover:text-foreground/50 transition-colors uppercase tracking-[0.15em]"
                            >
                                {label}
                                {path === 'app' && <span className="sr-only">Início</span>}
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
