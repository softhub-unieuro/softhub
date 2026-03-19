import { useState, useMemo, useCallback, Fragment } from 'react';
import { Lock, ShieldCheck, Globe, Plus, Shield, Eye } from 'lucide-react';
import { pluralizar } from '@/utilitarios/formatadores';
import { 
    FolderKanban, Clock, LayoutDashboard, LayoutGrid, FileText, Database, UserCircle, MessageSquare, Settings2 
} from 'lucide-react';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import type { ConfiguracoesSistema } from '@/funcionalidades/admin/hooks/usarConfiguracoes';

export const PERMISSOES_SISTEMA = [
    {
        modulo: 'tarefas',
        label: 'Kanban & Backlog',
        icone: FolderKanban,
        permissoes: [
            { chave: 'tarefas:visualizar_kanban', label: 'Visualizar Quadro Kanban' },
            { chave: 'tarefas:visualizar_backlog', label: 'Visualizar Backlog' },
            { chave: 'tarefas:visualizar_detalhes', label: 'Ver Detalhes da Tarefa' },
            { chave: 'tarefas:criar', label: 'Criar' },
            { chave: 'tarefas:editar', label: 'Editar' },
            { chave: 'tarefas:mover', label: 'Mover' },
            { chave: 'tarefas:arquivar', label: 'Arquivar' },
            { chave: 'tarefas:comentar', label: 'Comentar' },
            { chave: 'tarefas:checklist', label: 'Checklist' },
            { chave: 'tarefas:visualizar_historico', label: 'Ver Histórico da Tarefa' },
        ],
    },
    {
        modulo: 'projetos',
        label: 'Projetos & Portfólio',
        icone: Globe,
        permissoes: [
            { chave: 'projetos:visualizar', label: 'Gerenciar Projetos (Lista Admin)' },
            { chave: 'projetos:criar', label: 'Criar Projetos' },
            { chave: 'projetos:editar', label: 'Editar Projetos' },
            { chave: 'projetos:excluir', label: 'Excluir Projetos' },
            { chave: 'projetos:visualizar_detalhes', label: 'Ver Visão do Projeto (Equipe)' },
            { chave: 'projetos:documentos', label: 'Acessar Documentos do Projeto' },
        ],
    },
    {
        modulo: 'ponto',
        label: 'Ponto Eletrônico',
        icone: Clock,
        permissoes: [
            { chave: 'ponto:registrar', label: 'Registrar' },
            { chave: 'ponto:visualizar', label: 'Visualizar Histórico' },
            { chave: 'ponto:justificar', label: 'Enviar Justificativa' },
            { chave: 'ponto:aprovar_justificativa', label: 'Aprovar Justificativa' },
            { chave: 'ponto:exportar', label: 'Exportar Relatório (CSV)' },
        ],
    },
    {
        modulo: 'membros',
        label: 'Membros',
        icone: UserCircle,
        permissoes: [
            { chave: 'membros:gerenciar', label: 'Gerenciar Membros (Lista)' },
            { chave: 'membros:alterar_role', label: 'Alterar Cargo' },
            { chave: 'membros:desativar', label: 'Desativar Membro' },
        ],
    },
    {
        modulo: 'avisos',
        label: 'Avisos & Notificações',
        icone: MessageSquare,
        permissoes: [
            { chave: 'avisos:visualizar', label: 'Visualizar Mural' },
            { chave: 'avisos:criar', label: 'Criar Aviso' },
            { chave: 'avisos:remover', label: 'Remover Aviso' },
            { chave: 'sistema:notificacoes', label: 'Receber Notificações Críticas' },
        ],
    },
    {
        modulo: 'equipes',
        label: 'Estrutura de Equipes',
        icone: LayoutGrid,
        permissoes: [
            { chave: 'equipes:visualizar', label: 'Visualizar Organograma' },
            { chave: 'equipes:criar_grupo', label: 'Criar Grupo' },
            { chave: 'equipes:editar_grupo', label: 'Editar Grupo' },
            { chave: 'equipes:criar_equipe', label: 'Criar Equipe' },
            { chave: 'equipes:editar_equipe', label: 'Editar Equipe' },
            { chave: 'equipes:alocar_membro', label: 'Alocar/Mover Membros' },
        ],
    },
    {
        modulo: 'dashboard',
        label: 'Dashboard',
        icone: LayoutDashboard,
        permissoes: [
            { chave: 'dashboard:visualizar', label: 'Visualizar Métricas Gerais' },
        ],
    },
    {
        modulo: 'relatorios',
        label: 'Relatórios',
        icone: FileText,
        permissoes: [
            { chave: 'relatorios:visualizar', label: 'Visualizar Relatórios' },
            { chave: 'relatorios:imprimir', label: 'Exportar/Imprimir Dados' },
        ],
    },
    {
        modulo: 'logs',
        label: 'Painel de Logs',
        icone: Database,
        permissoes: [
            { chave: 'logs:visualizar', label: 'Ver histórico global (Auditoria completa)' },
        ],
    },
    {
        modulo: 'configuracoes',
        label: 'Configurações',
        icone: Settings2,
        permissoes: [
            { chave: 'configuracoes:visualizar', label: 'Visualizar Painel' },
            { chave: 'configuracoes:editar', label: 'Editar Governança' },
            { chave: 'configuracoes:matriz_governanca', label: 'Acesso à Matriz & Governança Crítica (Apenas Admin delega)' },
        ],
    },
] as const;

interface Props {
    configuracoes: ConfiguracoesSistema | null;
    atualizarConfiguracao: (chave: keyof ConfiguracoesSistema, valor: any) => Promise<any>;
    podeEditar: boolean;
    isAdmin: boolean;
    temAcessoCritico: boolean;
    rolesMatriz: string[];
    onErroTemporario: (erro: string) => void;
}

export function SecaoMatrizAcesso({ configuracoes, atualizarConfiguracao, podeEditar, isAdmin, temAcessoCritico, rolesMatriz, onErroTemporario }: Props) {
    const { setRoleVisualizacao } = usarAutenticacao();
    const [buscaPermissao, setBuscaPermissao] = useState('');
    const [salvando, setSalvando] = useState<string | null>(null);

    const permissoesFiltradas = useMemo(() => {
        if (!buscaPermissao) return PERMISSOES_SISTEMA;
        return PERMISSOES_SISTEMA.map(modulo => ({
            ...modulo,
            permissoes: modulo.permissoes.filter(p =>
                p.label.toLowerCase().includes(buscaPermissao.toLowerCase()) ||
                modulo.label.toLowerCase().includes(buscaPermissao.toLowerCase())
            )
        })).filter(modulo => modulo.permissoes.length > 0);
    }, [buscaPermissao]);

    const handleTogglePermissao = useCallback(async (role: string, permissao: string) => {
        if (!configuracoes) return;
        const chave = `permissoes_roles.${role}.${permissao}`;
        setSalvando(chave);
        try {
            const novasPermissoes = { ...configuracoes.permissoes_roles };
            novasPermissoes[role] = { ...novasPermissoes[role], [permissao]: !novasPermissoes[role]?.[permissao] };
            const res = await atualizarConfiguracao('permissoes_roles', novasPermissoes);

            if (!res?.sucesso) {
                onErroTemporario(res?.erro || 'Erro ao atualizar permissão.');
            }
        } catch (err) {
            onErroTemporario('Falha na comunicação com o servidor.');
        } finally {
            setSalvando(null);
        }
    }, [configuracoes, atualizarConfiguracao, onErroTemporario]);

    if (!isAdmin && !temAcessoCritico) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-card border border-border rounded-2xl text-center">
                <div className="p-4 bg-muted/20 rounded-full mb-6">
                    <Shield className="text-muted-foreground/30" size={48} strokeWidth={1} />
                </div>
                <h3 className="text-[14px] font-black uppercase tracking-widest text-foreground/80 mb-2">Acesso Restrito ao Administrador</h3>
                <p className="text-[11px] text-muted-foreground max-w-sm leading-relaxed">
                    A matriz de controle de acesso e configurações globais de governança são visíveis apenas para o cargo operacional de ADMIN.
                </p>
            </div>
        );
    }

    return (
        <section className="bg-card border border-border rounded-2xl shadow-sm flex flex-col overflow-hidden transition-all group/matriz animar-entrada atraso-2">
            <div className="px-6 py-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-muted/10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/10">
                        <Lock size={20} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-foreground leading-none">Matriz de Controle de Acesso</h2>
                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-1.5 opacity-60">
                            {PERMISSOES_SISTEMA.reduce((acc, m) => acc + m.permissoes.length, 0)} {pluralizar(PERMISSOES_SISTEMA.reduce((acc, m) => acc + m.permissoes.length, 0), 'Regra Ativa', 'Regras Ativas')} • {PERMISSOES_SISTEMA.length} {pluralizar(PERMISSOES_SISTEMA.length, 'Domínio', 'Domínios')}
                        </span>
                    </div>
                </div>

                <div className="relative group/search max-w-xs w-full">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors">
                        <Plus className="rotate-45" size={14} strokeWidth={3} />
                    </div>
                    <input
                        type="text"
                        placeholder="Filtrar por nome ou módulo..."
                        value={buscaPermissao}
                        onChange={(e) => setBuscaPermissao(e.target.value)}
                        className="w-full h-11 bg-muted/40 border border-border/40 rounded-xl pl-11 pr-4 text-[11px] font-bold outline-none focus:bg-background focus:border-primary/30 transition-all placeholder:text-muted-foreground/30"
                    />
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar bg-card border-x border-border/20">
                <table className="w-full border-collapse">
                    <thead className="relative z-30">
                        <tr className="border-b border-border bg-muted/5">
                            <th className="sticky left-0 bg-card/90 backdrop-blur-md z-40 px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 min-w-[300px] border-r border-border/50 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]">
                                Capacidade / Módulo
                            </th>
                            {rolesMatriz.map(role => (
                                <th key={role} className={`px-6 py-4 text-center min-w-[140px] border-r border-border/30 last:border-0 ${role === 'TODOS' ? 'bg-emerald-500/[0.03]' : ''}`}>
                                    <div className="flex flex-col items-center gap-2 group/rolehead">
                                        {role === 'TODOS' && <Globe size={14} className="text-emerald-500 mb-1" />}
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black tracking-widest uppercase transition-colors ${role === 'ADMIN' ? 'text-primary' : role === 'TODOS' ? 'text-emerald-600' : 'text-foreground/80'}`}>
                                                {role}
                                            </span>
                                            
                                            {/* Botão de Previsualização (Discord Style) */}
                                            {role !== 'ADMIN' && role !== 'TODOS' && isAdmin && (
                                                <button
                                                    onClick={() => setRoleVisualizacao(role)}
                                                    title={`Ver sistema como ${role}`}
                                                    className="p-1 px-1.5 bg-indigo-500/10 text-indigo-500 rounded-md opacity-0 group-hover/rolehead:opacity-100 hover:bg-indigo-500 hover:text-white transition-all scale-90 hover:scale-100 shadow-sm"
                                                >
                                                    <Eye size={10} strokeWidth={3} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {permissoesFiltradas.map((grupo) => {
                            const IconeModulo = grupo.icone;
                            return (
                                <Fragment key={grupo.modulo}>
                                    <tr className="bg-muted/5">
                                        <td colSpan={1 + rolesMatriz.length} className="px-6 py-3 border-y border-border/40">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-background border border-border/60 rounded-xl shadow-sm">
                                                    <IconeModulo size={14} className="text-primary/60" />
                                                </div>
                                                <span className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground/50">
                                                    {grupo.label}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>

                                    {grupo.permissoes.map((perm) => (
                                        <tr key={`${grupo.modulo}-${perm.chave}`} className="group transition-all hover:bg-muted/10">
                                            <td className="sticky left-0 bg-card/95 backdrop-blur-md z-10 px-6 py-4 border-b border-border/40 border-r border-border/20 shadow-[8px_0_15px_-5px_rgba(0,0,0,0.01)] transition-colors group-hover:bg-muted/20">
                                                <div className="flex items-center gap-3 pl-2 group-hover:translate-x-1 transition-transform duration-300">
                                                    <div className="w-1 h-1 rounded-full bg-border group-hover:bg-primary group-hover:scale-125 transition-all outline outline-4 outline-transparent group-hover:outline-primary/5" />
                                                    <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors tracking-tight">{perm.label}</span>
                                                </div>
                                            </td>
                                            {rolesMatriz.map(role => {
                                                const ativa = configuracoes?.permissoes_roles[role]?.[perm.chave] ?? false;
                                                const universal = (configuracoes?.permissoes_roles['TODOS'] as any)?.[perm.chave] ?? false;
                                                const salvandoEste = salvando === `permissoes_roles.${role}.${perm.chave}`;
                                                const forcadoPorTodos = role !== 'TODOS' && universal;
                                                const somenteAdminPodeClicar = perm.chave === 'configuracoes:matriz_governanca' && !isAdmin;

                                                return (
                                                    <td key={`${role}-${perm.chave}`} className={`px-4 py-4 text-center border-b border-border/40 border-r border-border/10 last:border-r-0 ${role === 'TODOS' ? 'bg-emerald-500/[0.01]' : ''}`}>
                                                        <div className="flex justify-center items-center">
                                                            <button
                                                                disabled={salvandoEste || !podeEditar || forcadoPorTodos || somenteAdminPodeClicar}
                                                                onClick={() => podeEditar && !forcadoPorTodos && !somenteAdminPodeClicar && handleTogglePermissao(role, perm.chave)}
                                                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                                                    forcadoPorTodos || somenteAdminPodeClicar
                                                                    ? 'bg-muted text-muted-foreground/30 cursor-not-allowed'
                                                                    : podeEditar ? 'cursor-pointer active:scale-90 hover:scale-105 shadow-sm' : 'cursor-not-allowed opacity-20'
                                                                } ${
                                                                    !forcadoPorTodos && !somenteAdminPodeClicar && ativa
                                                                    ? role === 'TODOS'
                                                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40'
                                                                        : 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                                                    : !forcadoPorTodos
                                                                        ? 'bg-muted/40 border border-border/30 text-transparent hover:border-primary/40'
                                                                        : ''
                                                                } ${salvandoEste ? 'animate-pulse scale-90' : ''}`}
                                                            >
                                                                {(ativa || forcadoPorTodos) && <ShieldCheck size={16} strokeWidth={2.5} />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </Fragment>
                            );
                        })}

                        {permissoesFiltradas.length === 0 && (
                            <tr>
                                <td colSpan={1 + rolesMatriz.length} className="px-10 py-20 text-center">
                                    <div className="flex flex-col items-center gap-4 text-muted-foreground/30">
                                        <Lock size={48} strokeWidth={1} />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma permissão para "{buscaPermissao}"</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
