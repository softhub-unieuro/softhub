import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { pluralizar } from '@/utilitarios/formatadores';
import { Search, UserCheck } from 'lucide-react';
import { Modal } from '@/compartilhado/componentes/Modal';
import { Alerta } from '@/compartilhado/componentes/Alerta';
import { Avatar } from '@/compartilhado/componentes/Avatar';
import { EstadoVazio } from '@/compartilhado/componentes/EstadoVazio';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import type { MembroSimples } from './tipos';
import type { Grupo, Equipe } from '@/funcionalidades/admin/hooks/usarEquipes';

interface ModalAlocacaoProps {
    aberto: boolean;
    aoFechar: () => void;
    grupos: Grupo[];
    equipes: Equipe[];
    membros: MembroSimples[];
    aoAlocar: (membrosIds: string[], equipeId: string | null, grupoId: string | null) => Promise<void>;
    grupoIdPadrao?: string;
    equipeIdPadrao?: string;
}

export const ModalAlocacao = memo(({ aberto, aoFechar, grupos, membros, aoAlocar, grupoIdPadrao, equipeIdPadrao }: ModalAlocacaoProps) => {
    const [selecionados, setSelecionados] = useState<string[]>([]);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [busca, setBusca] = useState('');

    useEffect(() => {
        if (aberto) {
            setSelecionados([]);
            setBusca('');
            setErro(null);
        }
    }, [aberto]);

    const membrosFiltrados = useMemo(() => 
        membros.filter(m =>
            m.nome.toLowerCase().includes(busca.toLowerCase()) ||
            m.email.toLowerCase().includes(busca.toLowerCase())
        ),
    [membros, busca]);

    const toggleSelecionado = (id: string) => {
        setSelecionados(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelecionarTudo = useCallback(() => {
        const disponiveis = membrosFiltrados.filter(m => !(m.grupos_ids?.split(',') || []).includes(grupoIdPadrao || ''));
        if (selecionados.length === disponiveis.length) {
            setSelecionados([]);
        } else {
            setSelecionados(disponiveis.map(m => m.id));
        }
    }, [membrosFiltrados, selecionados.length, grupoIdPadrao]);

    const handleAlocar = useCallback(async () => {
        if (selecionados.length === 0 || !grupoIdPadrao || !equipeIdPadrao) return;
        setSalvando(true);
        setErro(null);
        try {
            await aoAlocar(selecionados, equipeIdPadrao, grupoIdPadrao);
            setSelecionados([]);
            aoFechar();
        } catch (error) {
            console.error('[Equipes] Falha na alocação em lote:', error);
            setErro('Não foi possível realizar a alocação de alguns membros.');
        } finally {
            setSalvando(false);
        }
    }, [selecionados, grupoIdPadrao, equipeIdPadrao, aoAlocar, aoFechar]);

    const grupoNome = useMemo(() => grupos.find(g => g.id === grupoIdPadrao)?.nome, [grupos, grupoIdPadrao]);
    
    return (
        <Modal 
            aberto={aberto} 
            aoFechar={aoFechar} 
            titulo={grupoNome ? `Vincular ao ${grupoNome}` : "Alocar Membro"} 
            largura="md"
        >
            <div className="flex flex-col gap-6">
                {erro && (
                    <Alerta tipo="erro" mensagem={erro} className="mb-4" />
                )}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <div className="relative group/search">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" size={16} />
                            <input
                                autoFocus
                                placeholder="Buscar por nome ou e-mail..."
                                value={busca}
                                onChange={e => setBusca(e.target.value)}
                                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:bg-white outline-none transition-all"
                            />
                        </div>
                        <div className="flex items-center justify-between px-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {selecionados.length} {pluralizar(selecionados.length, 'selecionado', 'selecionados')}
                            </p>
                            <button 
                                onClick={handleSelecionarTudo}
                                className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                            >
                                {selecionados.length > 0 ? 'Limpar Seleção' : 'Selecionar Tudo'}
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                        {membrosFiltrados.map(m => {
                            const jaVinculado = (m.grupos_ids?.split(',') || []).includes(grupoIdPadrao || '');
                            const selecionado = selecionados.includes(m.id);
                            
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => !jaVinculado && toggleSelecionado(m.id)}
                                    disabled={jaVinculado}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left group
                                        ${selecionado ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'}
                                        ${jaVinculado ? 'opacity-50 grayscale cursor-not-allowed bg-slate-50' : ''}
                                    `}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar nome={m.nome} fotoPerfil={m.foto_perfil} tamanho="sm" className={selecionado ? 'ring-2 ring-blue-200' : ''} />
                                        <div className="min-w-0">
                                            <p className={`text-[11px] font-bold truncate transition-colors leading-none mb-0.5 ${selecionado ? 'text-blue-900' : 'text-slate-900'}`}>{m.nome}</p>
                                            <p className="text-[10px] text-slate-400 font-medium truncate leading-none">{m.email}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="shrink-0 pl-2">
                                        {jaVinculado ? (
                                            <div className="bg-slate-200 text-slate-500 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg">Vinculado</div>
                                        ) : (
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                                ${selecionado ? 'bg-blue-600 border-blue-600' : 'bg-transparent border-slate-200 group-hover:border-blue-300'}
                                            `}>
                                                <div className={`w-1.5 h-1.5 rounded-full bg-white transition-all ${selecionado ? 'scale-100' : 'scale-0'}`} />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}

                        {membrosFiltrados.length === 0 && (
                            <EstadoVazio 
                                tipo="pesquisa"
                                titulo="Membro não encontrado"
                                descricao={`Nenhum membro corresponde a "${busca}".`}
                            />
                        )}
                    </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
                    <button 
                        type="button" 
                        onClick={aoFechar} 
                        className="w-full sm:w-auto px-6 h-12 text-[10px] font-black text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all uppercase tracking-widest"
                    >
                        CANCELAR
                    </button>
                    <button
                        type="button"
                        onClick={handleAlocar}
                        disabled={salvando || selecionados.length === 0}
                        className="w-full sm:flex-1 h-12 bg-blue-600 text-white rounded-2xl text-[10px] font-black shadow-sm hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-30 disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2 group px-4 uppercase tracking-widest"
                    >
                        {salvando ? <Carregando Centralizar={false} tamanho="sm" className="border-t-white border-white/30" /> : (
                            <>
                                <span>VINCULAR {selecionados.length} {pluralizar(selecionados.length, 'MEMBRO', 'MEMBROS')}</span>
                                <UserCheck size={18} className="group-hover:rotate-12 transition-transform" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
});
