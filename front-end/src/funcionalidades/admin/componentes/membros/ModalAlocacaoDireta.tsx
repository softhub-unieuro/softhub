import { useState, useMemo, memo } from 'react';
import { Plus, Users } from 'lucide-react';
import { Modal } from '@/compartilhado/componentes/Modal';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { FormGrupoEquipe } from '../equipes/FormGrupoEquipe';
import { usarEquipes } from '@/funcionalidades/admin/hooks/usarEquipes';
import { usarToast } from '@/compartilhado/hooks/usarToast';

interface ModalAlocacaoDiretaProps {
    aberto: boolean;
    aoFechar: () => void;
    membro: any;
    grupos: any[];
    equipes: any[];
    aoAlocar: (membroId: string, equipeId: string | null, grupoId: string | null) => Promise<any>;
}

/** Componente para alocação rápida de membros sem sair do painel administrativo. */
export const ModalAlocacaoDireta = memo(({ aberto, aoFechar, membro, grupos, equipes, aoAlocar }: ModalAlocacaoDiretaProps) => {
    const [equipe_id, setEquipeId] = useState('');
    const [grupo_id, setGrupoId] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [modalEquipeAberto, setModalEquipeAberto] = useState(false);

    const { criarEquipe } = usarEquipes();
    const { exibirToast } = usarToast();

    const gruposFiltrados = useMemo(() =>
        grupos.filter((g: any) => g.equipe_id === equipe_id),
        [grupos, equipe_id]);

    const handleConfirmar = async () => {
        if (!equipe_id || !grupo_id) return;
        setSalvando(true);
        try {
            if (membro) await aoAlocar(membro.id, equipe_id, grupo_id);
            aoFechar();
        } catch (e) {
            console.error('Falha ao alocar:', e);
        } finally {
            setSalvando(false);
        }
    };

    const handleCriarNovaEquipe = async (dados: any) => {
        try {
            const res = await criarEquipe(dados);
            const novoId = (res as any).data?.id;
            if (novoId) {
                setEquipeId(novoId);
                exibirToast('Equipe criada! Agora crie um grupo para ela.');
            }
            setModalEquipeAberto(false);
        } catch (e: any) {
            exibirToast(e.response?.data?.erro || 'Erro ao criar equipe.', 'erro');
        }
    };

    return (
        <>
        <Modal aberto={aberto} aoFechar={aoFechar} titulo="Alocação Rápida" largura="sm">
            <div className="space-y-6">
                {membro && (
                    <div className="flex items-center gap-4 p-4 bg-background border border-border/40 rounded-2xl shadow-sm">
                        <Avatar nome={membro.nome} fotoPerfil={membro.foto_perfil} />
                        <div>
                            <p className="text-[13px] font-black uppercase tracking-tight text-slate-900">{membro.nome}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 tracking-wider transition-opacity">{membro.email}</p>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Equipe Destino</label>
                        <button
                            onClick={() => setModalEquipeAberto(true)}
                            className="text-[9px] font-black uppercase tracking-wider text-primary hover:opacity-70 flex items-center gap-1 transition-all"
                        >
                            <Plus size={10} strokeWidth={4} /> Criar Nova
                        </button>
                    </div>
                    <select
                        value={equipe_id}
                        onChange={e => setEquipeId(e.target.value)}
                        className="h-11 w-full bg-background border border-border rounded-2xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer shadow-sm hover:bg-muted/30"
                    >
                        <option value="">Selecione uma equipe...</option>
                        {equipes.map((e: any) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block ml-1">Grupo Destino</label>
                    <select
                        value={grupo_id}
                        onChange={e => setGrupoId(e.target.value)}
                        className="h-11 w-full bg-background border border-border rounded-2xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer shadow-sm hover:bg-muted/30 disabled:opacity-30 disabled:grayscale disabled:pointer-events-none"
                        disabled={!equipe_id}
                    >
                        <option value="">Selecione um grupo...</option>
                        {gruposFiltrados.map((g: any) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                    </select>
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleConfirmar}
                        disabled={salvando || !equipe_id || !grupo_id}
                        className="h-12 w-full bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {salvando ? <Carregando Centralizar={false} tamanho="sm" className="border-t-white" /> : (
                            <>
                                <span>Efetivar Alocação</span>
                                <Plus size={16} strokeWidth={3} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>

        {/* Modal para Criação de Equipe Durante Alocação */}
        <Modal
            aberto={modalEquipeAberto}
            aoFechar={() => setModalEquipeAberto(false)}
            titulo="Nova Equipe"
            largura="sm"
        >
            <FormGrupoEquipe
                titulo="Equipe"
                tipo="equipe"
                aoSalvar={handleCriarNovaEquipe}
                aoFechar={() => setModalEquipeAberto(false)}
            />
        </Modal>
    </>
    );
});
