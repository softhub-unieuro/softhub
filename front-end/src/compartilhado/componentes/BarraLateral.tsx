import { FolderKanban, Clock, Users, Megaphone, LayoutDashboard, Database, Settings, FileText, LayoutGrid, ListTodo, Layers } from 'lucide-react';
import { useLocation } from 'react-router';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { usarNotificacoes } from '@/compartilhado/hooks/usarNotificacoes';
import { useState, useMemo } from 'react';

import { SidebarLogo } from './sidebar/SidebarLogo';
import { SidebarGroups } from './sidebar/SidebarGroups';
import { SidebarFooter } from './sidebar/SidebarFooter';
import { ModalNotificacoes } from './sidebar/ModalNotificacoes';

interface BarraLateralProps {
    aoNavegar?: () => void;
    aoAbrirScanner?: () => void;
}

/**
 * Barra lateral com navegação principal, notificações, tema e perfil.
 * Refatorada para modularização.
 */
export function BarraLateral({ aoNavegar, aoAbrirScanner }: BarraLateralProps) {
    const location = useLocation();
    const { usuario, sair, projetoAtivoId } = usarAutenticacao();
    const { notificacoes, marcarComoLida, limparTodas } = usarNotificacoes();
    const [modalNotificacoes, setModalNotificacoes] = useState(false);

    // Permissões de Visualização
    const podeVerDashboard = usarPermissaoAcesso('dashboard:visualizar');
    const podeVerKanban = usarPermissaoAcesso('tarefas:visualizar_kanban');
    const podeVerBacklog = usarPermissaoAcesso('tarefas:visualizar_backlog');
    const podeVerPonto = usarPermissaoAcesso('ponto:visualizar');
    const podeVerAvisos = usarPermissaoAcesso('avisos:visualizar');
    const podeVerJustificativas = usarPermissaoAcesso('ponto:aprovar_justificativa');
    const podeVerMembrosAdmin = usarPermissaoAcesso('membros:gerenciar');
    const podeVerRelatorios = usarPermissaoAcesso('relatorios:visualizar');
    const podeVerLogs = usarPermissaoAcesso('logs:visualizar');
    const podeVerEquipes = usarPermissaoAcesso('equipes:visualizar');
    const podeVerProjetosAdmin = usarPermissaoAcesso('projetos:visualizar');
    const podeVerProjetoDetalhes = usarPermissaoAcesso('projetos:visualizar_detalhes');
    const podeVerConfiguracoes = usarPermissaoAcesso('configuracoes:visualizar');

    const grupos = useMemo(() => {
        const todosGrupos = [
            {
                label: 'Visão Geral',
                links: [
                    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard, visivel: podeVerDashboard },
                    { label: 'Lista de Tarefas', path: '/app/backlog', icon: ListTodo, visivel: podeVerBacklog },
                    { label: 'Avisos', path: '/app/avisos', icon: Megaphone, visivel: podeVerAvisos },
                ],
            },
            {
                label: 'Equipe',
                links: [
                    { label: 'Projeto', path: '/app/projeto', icon: Layers, visivel: podeVerProjetoDetalhes },
                    { label: 'Kanban', path: '/app/kanban', icon: FolderKanban, visivel: podeVerKanban },
                    { label: 'Minha Presença', path: '/app/ponto', icon: Clock, visivel: podeVerPonto || podeVerJustificativas },
                ],
            },
            {
                label: 'Administração',
                links: [
                    { label: 'Membros', path: '/app/admin/membros', icon: Users, visivel: podeVerMembrosAdmin },
                    { label: 'Equipes', path: '/app/admin/equipes', icon: LayoutGrid, visivel: podeVerEquipes },
                    { label: 'Projetos', path: '/app/admin/projetos', icon: FolderKanban, visivel: podeVerProjetosAdmin },
                    { label: 'Relatórios', path: '/app/admin/relatorios', icon: FileText, visivel: podeVerRelatorios },
                    { label: 'Logs', path: '/app/admin/logs', icon: Database, visivel: podeVerLogs },
                    { label: 'Configurações', path: '/app/admin/configuracoes', icon: Settings, visivel: podeVerConfiguracoes },
                ],
            },
        ];

        return todosGrupos
            .map(g => ({ ...g, links: g.links.filter(l => l.visivel) }))
            .filter(g => g.label === 'Administração' ? (usuario?.role === 'ADMIN' || g.links.length > 0) : g.links.length > 0);
    }, [usuario, podeVerDashboard, podeVerBacklog, podeVerAvisos, podeVerProjetoDetalhes, podeVerKanban, podeVerPonto, podeVerJustificativas, podeVerMembrosAdmin, podeVerEquipes, podeVerProjetosAdmin, podeVerRelatorios, podeVerLogs, podeVerConfiguracoes]);

    return (
        <aside className="w-full h-full flex flex-col relative overflow-hidden animar-entrada bg-sidebar border-r border-sidebar-border/30">
            {/* Removido o brilho absoluto que causava manchas visuais em resoluções menores */}

            <SidebarLogo />

            <SidebarGroups 
                grupos={grupos} 
                currentPath={location.pathname} 
                projetoAtivoId={projetoAtivoId} 
                aoNavegar={aoNavegar} 
            />

            <SidebarFooter 
                usuario={usuario} 
                sair={sair} 
                setModalNotificacoes={setModalNotificacoes} 
                aoAbrirScanner={aoAbrirScanner}
                totalNaoLidas={notificacoes.length} 
            />

            <ModalNotificacoes 
                aberto={modalNotificacoes} 
                aoFechar={() => setModalNotificacoes(false)} 
                notificacoes={notificacoes} 
                marcarComoLida={marcarComoLida} 
                limparTodas={limparTodas} 
            />
        </aside>
    );
}
