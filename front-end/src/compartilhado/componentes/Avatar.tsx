import { User, Crown } from 'lucide-react';

interface AvatarProps {
    nome: string;
    fotoPerfil?: string | null;
    tamanho?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    className?: string;
    coroa?: boolean;
    status?: 'online' | 'offline' | 'none';
    onClick?: (e: React.MouseEvent) => void;
}

/**
 * Avatar do usuário. Exibe a foto externa ou as iniciais baseadas no nome.
 */
export function Avatar({ nome, fotoPerfil, tamanho = 'md', className = '', coroa = false, status = 'none', onClick }: AvatarProps) {
    // Tamanhos mapeados por pixels
    const medidas = {
        sm: { box: 'w-6 h-6 text-[10px] rounded-lg', corona: 'w-2.5 h-2.5 -top-1 -left-1' },
        md: { box: 'w-8 h-8 text-xs rounded-xl', corona: 'w-3.5 h-3.5 -top-1.5 -left-1.5' },
        lg: { box: 'w-10 h-10 text-sm rounded-xl', corona: 'w-4 h-4 -top-2 -left-2' },
        xl: { box: 'w-16 h-16 text-xl rounded-2xl', corona: 'w-6 h-6 -top-3 -left-3' },
        '2xl': { box: 'w-24 h-24 text-3xl rounded-[32px]', corona: 'w-8 h-8 -top-4 -left-4' },
        'full': { box: 'w-full h-full text-4xl rounded-3xl', corona: 'w-10 h-10 -top-5 -left-5' }
    };

    const statusCores = {
        online: 'bg-emerald-500',
        offline: 'bg-slate-400',
        none: 'transparent'
    };

    const tamanhoAtual = medidas[tamanho].box;
    const tamanhoCorona = medidas[tamanho].corona;

    // Extrair iniciais (ex: "Mateus Silva" -> "MS")
    const getIniciais = (nomeCompleto: string) => {
        if (!nomeCompleto) return <User className="w-1/2 h-1/2" />;

        const pares = nomeCompleto.split(' ').filter(Boolean);
        if (pares.length === 1) return pares[0].substring(0, 2).toUpperCase();

        return `${pares[0][0]}${pares[pares.length - 1][0]}`.toUpperCase();
    };

    // Gera um número (hash) consistente baseado na string do nome
    const getHash = (str: string) => {
        let hash = 0;
        const textoParaHash = str.trim().toUpperCase();
        for (let i = 0; i < textoParaHash.length; i++) {
            hash = textoParaHash.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash);
    };

    // Cores vibrantes para os avatares sem foto
    const coresFallback = [
        'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-rose-600', 'bg-amber-600',
        'bg-indigo-600', 'bg-cyan-600', 'bg-fuchsia-600', 'bg-teal-600'
    ];
    
    const corIndex = getHash(nome) % coresFallback.length;
    const corBg = coresFallback[corIndex];

    if (fotoPerfil && fotoPerfil.trim() !== '') {
        return (
            <div 
                onClick={onClick}
                className={`relative overflow-hidden flex-shrink-0 border border-white/10 ${tamanhoAtual} ${className}`}
            >
                <img
                    src={fotoPerfil}
                    alt={`Foto de ${nome}`}
                    className="w-full h-full object-cover"
                />
                
                {coroa && (
                    <div className={`absolute ${tamanhoCorona} bg-amber-500 rounded-full flex items-center justify-center border-2 border-background shadow-lg rotate-[-15deg] animate-in zoom-in duration-500 z-10`}>
                        <Crown className="w-[70%] h-[70%] text-white fill-white" />
                    </div>
                )}

                {status !== 'none' && (
                    <span className={`absolute bottom-0 right-0 w-[25%] h-[25%] min-w-[6px] min-h-[6px] rounded-full border-2 border-white ring-1 ring-black/5 z-20 ${statusCores[status]} animate-in fade-in duration-300`} />
                )}
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className={`relative flex items-center justify-center flex-shrink-0 text-white font-medium border border-white/5 ${tamanhoAtual} ${corBg} ${className}`}
            title={nome}
        >
            <span className="opacity-90 leading-none">{getIniciais(nome)}</span>
            
            {coroa && (
                <div className={`absolute ${tamanhoCorona} bg-amber-500 rounded-full flex items-center justify-center border-2 border-background shadow-lg rotate-[-15deg] animate-in zoom-in duration-500 z-10`}>
                    <Crown className="w-[70%] h-[70%] text-white fill-white" />
                </div>
            )}

            {status !== 'none' && (
                <span className={`absolute bottom-0 right-0 w-[25%] h-[25%] min-w-[6px] min-h-[6px] rounded-md border-2 border-white ring-1 ring-black/5 z-20 ${statusCores[status]} animate-in fade-in duration-300`} />
            )}
        </div>
    );
}
