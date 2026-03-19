import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { Eye, X, ShieldAlert, ChevronRight } from 'lucide-react';

export function BarraPrevisualizacaoCargo() {
    const { roleVisualizacao, setRoleVisualizacao } = usarAutenticacao();

    if (!roleVisualizacao) return null;

    return (
        <div className="bg-indigo-600 text-white px-6 py-2 flex items-center justify-between sticky top-0 z-[100] shadow-lg animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-4">
                <div className="bg-white/20 p-1.5 rounded-lg">
                    <Eye size={16} className="text-white" />
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-widest leading-none">Modo de Previsualização Ativo</span>
                        <div className="h-1 w-1 rounded-full bg-indigo-300" />
                        <span className="text-[11px] font-medium text-indigo-100 flex items-center gap-1">
                            Você está vendo este sistema como <strong className="text-white font-black underline underline-offset-4">{roleVisualizacao}</strong>
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10">
                    <ShieldAlert size={12} className="text-indigo-200" />
                    <span className="text-[10px] font-bold uppercase tracking-tight text-indigo-100">Algumas ações reais podem ser bloqueadas pelo servidor</span>
                </div>
                
                <button
                    onClick={() => setRoleVisualizacao(null)}
                    className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-tighter hover:bg-indigo-50 active:scale-95 transition-all shadow-md group"
                >
                    Desativar
                    <X size={14} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                </button>
            </div>
        </div>
    );
}
