import { memo } from 'react';
import { Wifi, Clock, LayoutGrid } from 'lucide-react';
import { pluralizar } from '@/utilitarios/formatadores';
import { Modal } from '@/compartilhado/componentes/Modal';
import { ConfirmacaoExclusao } from '@/compartilhado/componentes/ConfirmacaoExclusao';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { FormularioCadastroMembro } from './FormularioCadastroMembro';
import { PerfilProvider } from '@/funcionalidades/perfil/contexto/PerfilContexto';
import { ModalEdicaoPerfil } from '@/funcionalidades/perfil/componentes/ModalEdicaoPerfil';
import { ModalAlocacaoDireta } from './ModalAlocacaoDireta';
import { ModalPromocaoMembro } from './ModalPromocaoMembro';
import type { Membro } from '@/funcionalidades/admin/hooks/usarMembros';

interface ModaisMembrosProps {
    modalAberto: boolean;
    modoModal: 'individual' | 'lote';
    handleFecharModal: () => void;
    cadastrarMembro: (email: string, role: string) => Promise<any>;
    cadastrarMembroLote: (emails: string[], role: string) => Promise<any>;
    rolesDisponiveis: string[];
    configuracoes: any;
    membroParaExcluir: Membro | null;
    setMembroParaExcluir: (m: Membro | null) => void;
    handleRemoverConfirmado: () => void;
    modalOnlineAberto: boolean;
    setModalOnlineAberto: (b: boolean) => void;
    membrosOnline: any[];
    modalSemEquipeAberto: boolean;
    setModalSemEquipeAberto: (b: boolean) => void;
    membrosSemEquipe: Membro[];
    podeAlocar: boolean;
    setMembroAlocacao: (m: Membro | null) => void;
    handleVerPerfil: (id: string) => void;
    idPerfilParaVer: string | null;
    handleFecharPerfil: () => void;
    membroAlocacao: any | null;
    grupos: any[];
    equipes: any[];
    alocarMembro: (mId: string, eId: string | null, gId: string | null) => Promise<any>;
    exibirToast: (msg: string, tipo?: any) => void;
    recarregar: () => Promise<void>;
    membroParaPromover: Membro | null;
    setMembroParaPromover: (m: Membro | null) => void;
    handleConfirmarPromocao: (m: Membro, novaRole: string) => Promise<void>;
}

export const ModaisMembros = memo(({
    modalAberto, modoModal, handleFecharModal, cadastrarMembro, cadastrarMembroLote,
    rolesDisponiveis, configuracoes, membroParaExcluir, setMembroParaExcluir,
    handleRemoverConfirmado, modalOnlineAberto, setModalOnlineAberto, membrosOnline,
    modalSemEquipeAberto, setModalSemEquipeAberto, membrosSemEquipe, podeAlocar,
    setMembroAlocacao, handleVerPerfil, idPerfilParaVer, handleFecharPerfil,
    membroAlocacao, grupos, equipes, alocarMembro, exibirToast, recarregar,
    membroParaPromover, setMembroParaPromover, handleConfirmarPromocao
}: ModaisMembrosProps) => {
    return (
        <>
            <Modal aberto={modalAberto} aoFechar={handleFecharModal} titulo="Autorizar Acesso" largura="sm">
                <FormularioCadastroMembro
                    modoInicial={modoModal}
                    aoCadastrar={cadastrarMembro}
                    aoCadastrarLote={cadastrarMembroLote}
                    aoSucesso={handleFecharModal}
                    roles={rolesDisponiveis}
                    autoCadastroAtivado={configuracoes?.auto_cadastro}
                />
            </Modal>

            <ConfirmacaoExclusao
                aberto={!!membroParaExcluir}
                aoFechar={() => setMembroParaExcluir(null)}
                aoConfirmar={handleRemoverConfirmado}
                titulo="Remover Acesso?"
                descricao={`Esta ação removerá permanentemente o acesso de ${membroParaExcluir?.nome || membroParaExcluir?.email}.`}
            />

            {/* Modal de Membros Online */}
            <Modal aberto={modalOnlineAberto} aoFechar={() => setModalOnlineAberto(false)} titulo="Membros Online Agora" largura="lg">
                <div className="space-y-6">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-start gap-3">
                        <Wifi className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">Regra de Presença</p>
                            <p className="text-[10px] text-emerald-600/70 font-medium leading-relaxed">
                                Este hub exibe apenas membros que realizaram a batida de **ENTRADA** hoje e ainda não registraram a saída.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 px-1 py-1 border-b border-border/10">
                        <div className="flex -space-x-2">
                            {membrosOnline.slice(0, 3).map((m: any) => (
                                <div key={m.id} className="w-8 h-8 rounded-full border-2 border-background ring-2 ring-emerald-500/20 overflow-hidden">
                                    <Avatar nome={m.nome} fotoPerfil={m.foto_perfil} />
                                </div>
                            ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-medium">
                            {membrosOnline.length === 0
                                ? "Ninguém bateu ponto no momento."
                                : `${membrosOnline.length} ${pluralizar(membrosOnline.length, 'membro está', 'membros estão')} em turno agora.`}
                        </p>
                    </div>

                    <div className="max-h-[450px] overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {membrosOnline.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center gap-4 text-muted-foreground/30 text-center">
                                <Wifi size={48} strokeWidth={1} className="opacity-20 translate-y-2 animate-bounce" />
                                <div className="space-y-2">
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em]">Pista Vazia</p>
                                    <p className="text-[10px] font-bold max-w-[200px]">Os membros aparecerão aqui assim que registrarem o ponto de entrada.</p>
                                </div>
                            </div>
                        ) : (
                            membrosOnline.map((m: any) => (
                                <div key={m.id} className="group flex items-center justify-between p-4 bg-white/50 border border-slate-100/80 rounded-[24px] hover:bg-white hover:border-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Avatar nome={m.nome} fotoPerfil={m.foto_perfil} tamanho="md" />
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors uppercase leading-none whitespace-nowrap">{m.nome}</span>
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">@</div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.email.split('@')[0]}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1.5">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/5 text-emerald-600 rounded-full border border-emerald-500/10">
                                            <Clock size={11} className="opacity-70" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">
                                                Dês das {new Date(m.entrada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md">
                                            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-300">Status: Operacional</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-50 flex justify-center">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Hub em Tempo Real</p>
                    </div>
                </div>
            </Modal>

            {/* Modal de Membros Sem Equipe */}
            <Modal aberto={modalSemEquipeAberto} aoFechar={() => setModalSemEquipeAberto(false)} titulo="Membros Sem Equipe" largura="lg">
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-1 py-3 border-b border-border/10">
                        <div className="flex -space-x-2">
                            {membrosSemEquipe.slice(0, 3).map((m: any) => (
                                <div key={m.id} className="w-8 h-8 rounded-full border-2 border-background ring-2 ring-rose-500/20 overflow-hidden">
                                    <Avatar nome={m.nome} fotoPerfil={m.foto_perfil} />
                                </div>
                            ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-medium">
                            {membrosSemEquipe.length === 0
                                ? "Todos os membros estão alocados em equipes."
                                : `${membrosSemEquipe.length} ${pluralizar(membrosSemEquipe.length, 'membro está', 'membros estão')} aguardando alocação.`}
                        </p>
                    </div>

                    <div className="max-h-[450px] overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {membrosSemEquipe.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center gap-4 text-muted-foreground/30">
                                <LayoutGrid size={48} strokeWidth={1} className="opacity-20 animate-pulse" />
                                <p className="text-[11px] font-black uppercase tracking-[0.2em]">Tudo em Ordem</p>
                            </div>
                        ) : (
                            membrosSemEquipe.map((m: any) => (
                                <div key={m.id} className="group flex items-center justify-between p-4 bg-white/50 border border-slate-100/80 rounded-[24px] hover:bg-white hover:border-rose-500/20 hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-500">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Avatar nome={m.nome} fotoPerfil={m.foto_perfil} tamanho="md" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-800 tracking-tight group-hover:text-rose-600 transition-colors uppercase leading-none whitespace-nowrap">{m.nome}</span>
                                            <span className="text-[10px] font-bold text-slate-400 mt-1.5 lowercase opacity-70">{m.email}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1.5">
                                        {podeAlocar ? (
                                            <button
                                                onClick={() => {
                                                    setMembroAlocacao(m);
                                                }}
                                                className="px-4 py-2 bg-primary/10 text-primary rounded-full border border-primary/20 text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                                            >
                                                Alocar Agora
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setModalSemEquipeAberto(false);
                                                    handleVerPerfil(m.id);
                                                }}
                                                className="px-4 py-2 bg-slate-500/10 text-slate-600 rounded-full border border-slate-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-slate-500 hover:text-white transition-all font-mono"
                                            >
                                                Ver Perfil
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-50 flex justify-center">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Gestão de Alocação</p>
                    </div>
                </div>
            </Modal>

            {/* Modal de Detalhes do Perfil (Diferente conforme ID de entrada) */}
            {idPerfilParaVer && (
                <PerfilProvider customUsuarioId={idPerfilParaVer}>
                    <ModalEdicaoPerfil
                        aberto={!!idPerfilParaVer}
                        aoFechar={handleFecharPerfil}
                    />
                </PerfilProvider>
            )}

            <ModalAlocacaoDireta
                aberto={!!membroAlocacao}
                aoFechar={() => setMembroAlocacao(null)}
                membro={membroAlocacao}
                grupos={grupos}
                equipes={equipes}
                aoAlocar={async (mId, eId, gId) => {
                    await alocarMembro(mId, eId, gId);
                    exibirToast(`Membro alocado com sucesso!`);
                    await recarregar();
                }}
            />

            {/* WF 31 - Gestão de Carreira (Novo) */}
            <ModalPromocaoMembro 
                aberto={!!membroParaPromover}
                aoFechar={() => setMembroParaPromover(null)}
                membro={membroParaPromover}
                rolesDisponiveis={rolesDisponiveis}
                aoConfirmar={handleConfirmarPromocao}
            />
        </>
    );
});
