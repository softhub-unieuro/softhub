import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { X, ChevronDown, ShieldAlert, Check } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/compartilhado/componentes/ui/dropdown-menu';

export function BarraPrevisualizacaoCargo() {
    const { roleVisualizacao, setRoleVisualizacao, configuracoes } = usarAutenticacao();

    if (!roleVisualizacao) return null;

    // Lista de roles disponíveis para simulação (Baseada na hierarquia completa)
    const rolesDisponiveis = configuracoes.hierarquia_roles || [];

    return (
        <div className="bg-[#4e5dec] text-white px-4 py-2 flex items-center justify-center gap-8 sticky top-0 z-[100] shadow-xl border-b border-indigo-400/30 animate-in slide-in-from-top duration-300">
            {/* Centro: Status e Botão Desativar */}
            <div className="flex items-center gap-4">
                <span className="text-[12px] font-medium text-indigo-50">
                    Você está vendo este servidor como <strong className="text-white uppercase">{roleVisualizacao}</strong>.
                </span>
                
                <button
                    onClick={() => setRoleVisualizacao(null)}
                    className="px-4 py-1.5 rounded-full border border-white/40 hover:bg-white/10 text-[10px] font-black uppercase tracking-tight transition-all active:scale-95 bg-white/5"
                >
                    Desativar
                </button>
            </div>

            <div className="w-px h-4 bg-white/20" />

            {/* Direita: Seletor de Cargos (Discord Style) */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors border border-white/20 text-[11px] font-bold min-w-[140px] justify-between bg-white/5">
                        Selecionar cargos
                        <ChevronDown size={14} className="opacity-50" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-[200px] mt-1 bg-[#2f3136] border-none text-gray-300 rounded-lg p-2 shadow-2xl">
                    <div className="px-2 py-1.5 mb-1">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Cargos Disponíveis</span>
                    </div>
                    {rolesDisponiveis.map((role) => (
                        <DropdownMenuItem
                            key={role}
                            onClick={() => setRoleVisualizacao(role)}
                            className={`flex items-center justify-between px-2 py-2 rounded-md cursor-pointer transition-colors ${
                                roleVisualizacao === role 
                                    ? 'bg-[#4e5dec] text-white' 
                                    : 'hover:bg-[#393c43] text-gray-300'
                            }`}
                        >
                            <span className="text-[11px] font-bold">{role}</span>
                            {roleVisualizacao === role && <Check size={12} strokeWidth={3} />}
                        </DropdownMenuItem>
                    ))}
                    
                    <div className="h-px bg-white/5 my-2" />
                    
                    <div className="px-2 py-1 flex items-start gap-2 opacity-50">
                        <ShieldAlert size={12} className="mt-0.5 shrink-0" />
                        <span className="text-[9px] font-medium leading-tight">
                            As permissões são aplicadas apenas na interface. Ações críticas exigem cargo real no banco.
                        </span>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
