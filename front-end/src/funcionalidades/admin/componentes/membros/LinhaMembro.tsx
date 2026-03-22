import { memo } from 'react';
import { useNavigate } from 'react-router';
import { Square, CheckSquare, ChevronDown, Trash2, Eye, LayoutGrid, ShieldCheck, Lock, Activity, TrendingUp, Clock } from 'lucide-react';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import type { Membro } from '@/funcionalidades/admin/hooks/usarMembros';
import { LABELS_ROLES, VARIANTE_COR_ROLES } from '@/utilitarios/constantes';
import { Tooltip } from '@/compartilhado/componentes/Tooltip';

const MAPA_CORES_ROLES: Record<string, { bg: string, bgHover: string, text: string, chevron: string }> = {
    rose: { bg: 'bg-rose-500/5', bgHover: 'group-hover/sel:bg-rose-500/10', text: 'text-rose-500', chevron: 'text-rose-300' },
    blue: { bg: 'bg-blue-500/5', bgHover: 'group-hover/sel:bg-blue-500/10', text: 'text-blue-500', chevron: 'text-blue-300' },
    indigo: { bg: 'bg-indigo-500/5', bgHover: 'group-hover/sel:bg-indigo-500/10', text: 'text-indigo-500', chevron: 'text-indigo-300' },
    amber: { bg: 'bg-amber-500/5', bgHover: 'group-hover/sel:bg-amber-500/10', text: 'text-amber-500', chevron: 'text-amber-300' },
    emerald: { bg: 'bg-emerald-500/5', bgHover: 'group-hover/sel:bg-emerald-500/10', text: 'text-emerald-500', chevron: 'text-emerald-300' },
    roxo: { bg: 'bg-violet-500/5', bgHover: 'group-hover/sel:bg-violet-500/10', text: 'text-violet-500', chevron: 'text-violet-300' },
};

interface LinhaMembroProps {
    membro: Membro;
    salvando: boolean;
    selecionado: boolean;
    onToggleSelect: (id: string, isShift?: boolean) => void;
    onAlterarRole: (membro: Membro) => void;
    onRemover: (membro: Membro) => void;
    onVerPerfil: (id: string) => void;
    onAlocar: (membro: Membro) => void;
    rolesDisponiveis: string[];
}

export const LinhaMembro = memo(({ membro, salvando, selecionado, onToggleSelect, onAlterarRole, onRemover, onVerPerfil, onAlocar, rolesDisponiveis }: LinhaMembroProps) => {
    const navigate = useNavigate();
    const { usuario, setRoleVisualizacao, ehDonoReal } = usarAutenticacao();
    const ehOMesmoUsuario = (usuario as any)?.id === membro.id;
    const podeAlterarRole = usarPermissaoAcesso('membros:alterar_role');
    const podeDesativar = usarPermissaoAcesso('membros:desativar');

    // 🛡️ BLINDAGEM DE BOOTSTRAP (Administrador de Segurança)
    const ehBootstrap = membro.is_bootstrap === true;
    const roleBloqueada = !podeAlterarRole || ehBootstrap;
    const exclusaoBloqueada = !podeDesativar || ehOMesmoUsuario || ehBootstrap;

    const variante = (VARIANTE_COR_ROLES as any)[membro.role] || 'emerald';
    const classesCores = MAPA_CORES_ROLES[variante] || MAPA_CORES_ROLES.emerald;

    return (
        <tr className={`group transition-colors ${salvando ? 'opacity-40 grayscale pointer-events-none' : 'hover:bg-muted/5'} ${selecionado ? 'bg-primary/5' : ''}`}>
            <td className="px-5 py-3.5">
                <div className="flex items-center gap-3.5">
                    <button
                        onClick={(e) => !ehOMesmoUsuario && !ehBootstrap && onToggleSelect(membro.id, e.shiftKey)}
                        className={`p-0.5 rounded transition-colors ${selecionado ? 'text-primary' : 'text-muted-foreground/20 hover:text-muted-foreground/50'}`}
                        disabled={ehOMesmoUsuario || ehBootstrap}
                    >
                        {selecionado ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>

                    <div className="flex items-center gap-3">
                        <Avatar nome={membro.nome} fotoPerfil={membro.foto_perfil} tamanho="md" coroa={ehOMesmoUsuario} />
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`text-[12px] font-bold whitespace-nowrap ${ehBootstrap ? 'text-indigo-400' : 'text-foreground/80'}`}>
                                    {membro.nome || <span className="italic text-muted-foreground/30">Pendente</span>}
                                </span>
                                {ehBootstrap && (
                                    <Tooltip texto="Administrador de Segurança (Bootstrap)">
                                        <ShieldCheck size={14} className="text-indigo-400 shrink-0" strokeWidth={2.5} />
                                    </Tooltip>
                                )}
                                {ehOMesmoUsuario && (
                                    <span className="shrink-0 text-[8px] font-bold bg-primary/8 text-primary/70 px-1.5 py-0.5 rounded-full uppercase">
                                        você
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-muted-foreground/40 lowercase mt-0.5 truncate">{membro.email}</span>
                        </div>
                    </div>
                </div>
            </td>

            <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                    <Tooltip texto={roleBloqueada ? (ehBootstrap ? "Administrador Protegido" : "Sem permissão para alterar") : "Gerenciar Carreira"}>
                        <button
                            disabled={roleBloqueada}
                            onClick={() => onAlterarRole(membro)}
                            className={`
                                relative flex items-center gap-2 rounded-full px-3.5 py-1.5 transition-all
                                ${classesCores.bg} ${classesCores.text}
                                ${roleBloqueada ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.05] hover:shadow-lg hover:shadow-primary/5 active:scale-95 group/btn'}
                            `}
                        >
                            <span className="text-[9px] font-black uppercase tracking-wider">
                                {ehBootstrap ? "ADMINISTRADOR" : (LABELS_ROLES[membro.role as keyof typeof LABELS_ROLES] || membro.role)}
                            </span>
                            
                            {!roleBloqueada ? (
                                <TrendingUp size={11} className="transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                            ) : (
                                <Lock size={10} className="opacity-40" />
                            )}
                        </button>
                    </Tooltip>

                    {/* ⚡ RAIO DE SIMULAÇÃO (Perfeitamente Alinhado) */}
                    {ehDonoReal && ehBootstrap && (
                        <div className="shrink-0">
                            <Tooltip texto="Simular este cargo" posicao="right">
                                <button
                                    onClick={() => setRoleVisualizacao(membro.role)}
                                    className={`
                                        w-6 h-6 flex items-center justify-center rounded-full transition-all duration-300 active:scale-90 
                                        ${classesCores.bg} ${classesCores.text} 
                                        hover:bg-opacity-20 hover:scale-110
                                    `}
                                >
                                    <Activity size={11} strokeWidth={3} />
                                </button>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </td>

            <td className="px-5 py-3.5 hidden xl:table-cell">
                <div className="flex flex-wrap gap-1">
                    {membro.equipe_nome ? (
                        membro.equipe_nome.split(',').map((eq: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-muted/30 text-[9px] font-medium text-muted-foreground/60">
                                {eq.trim()}
                            </span>
                        ))
                    ) : (
                        <span className="text-[10px] text-muted-foreground/20">—</span>
                    )}
                </div>
            </td>

            <td className="px-5 py-3.5 hidden lg:table-cell">
                <span className="text-[10px] text-muted-foreground/40">
                    {membro.criado_em ? new Date(membro.criado_em).toLocaleDateString('pt-BR') : '—'}
                </span>
            </td>

            <td className="px-5 py-3.5 text-right">
                <div className="flex items-center justify-end gap-0.5">
                    <button
                        onClick={() => navigate(`/app/admin/gestao-de-pontos?usuarioId=${membro.id}&aba=historico`)}
                        className="p-1.5 rounded-lg text-muted-foreground/20 hover:text-indigo-500 hover:bg-indigo-500/5 transition-all opacity-0 group-hover:opacity-100"
                        title="Auditoria de Ponto"
                    >
                        <Clock size={15} />
                    </button>

                    <button
                        onClick={() => onVerPerfil(membro.id)}
                        className="p-1.5 rounded-lg text-muted-foreground/20 hover:text-primary hover:bg-primary/5 transition-all opacity-0 group-hover:opacity-100"
                        title="Ver Perfil"
                    >
                        <Eye size={15} />
                    </button>

                    {usarPermissaoAcesso('equipes:editar_equipe') && (
                        <button
                            onClick={() => onAlocar(membro)}
                            className="p-1.5 rounded-lg text-muted-foreground/20 hover:text-indigo-500 hover:bg-indigo-500/5 transition-all opacity-0 group-hover:opacity-100"
                            title="Alocação Rápida"
                        >
                            <LayoutGrid size={15} />
                        </button>
                    )}

                    {!exclusaoBloqueada && (
                        <button
                            onClick={() => onRemover(membro)}
                            className="p-1.5 rounded-lg text-muted-foreground/20 hover:text-rose-500 hover:bg-rose-500/5 transition-all opacity-0 group-hover:opacity-100"
                            title="Remover acesso"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}



                    {ehBootstrap && !ehOMesmoUsuario && (
                        <Tooltip texto="Administrador Protegido">
                            <div className="p-1.5 text-muted-foreground/20 cursor-help">
                                <Lock size={15} />
                            </div>
                        </Tooltip>
                    )}
                </div>
            </td>
        </tr>
    );
});

export default LinhaMembro;
