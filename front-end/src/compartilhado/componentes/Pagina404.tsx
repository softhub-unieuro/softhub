import { memo, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { Home, ArrowLeft, Compass, Sparkles } from 'lucide-react';

/**
 * Página 404 premium com animações e navegação inteligente.
 * Redireciona para /app/dashboard se autenticado ou / se não.
 */
export const Pagina404 = memo(() => {
    const { estaAutenticado } = usarAutenticacao();
    const [glitchAtivo, setGlitchAtivo] = useState(false);
    
    // Efeito de glitch periódico no número 404
    useEffect(() => {
        const intervalo = setInterval(() => {
            setGlitchAtivo(true);
            setTimeout(() => setGlitchAtivo(false), 200);
        }, 3000);
        return () => clearInterval(intervalo);
    }, []);

    const destino = estaAutenticado ? '/app/dashboard' : '/';
    const textoBotaoPrincipal = estaAutenticado ? 'Voltar ao Dashboard' : 'Ir para o Início';

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
            {/* Fundo com textura de pontos */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 0.5px, transparent 0)`,
                backgroundSize: '32px 32px'
            }} />
            
            {/* Gradiente radial central */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/[0.06] rounded-full blur-[120px] pointer-events-none" />
            
            {/* Gradiente secundário */}
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-destructive/[0.04] rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-xl mx-auto animar-entrada">
                
                {/* Ícone de bússola animado */}
                <div className="relative mb-8">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Compass 
                            size={36} 
                            className="text-primary animate-spin" 
                            style={{ animationDuration: '8s' }}
                        />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive/80 border-2 border-background flex items-center justify-center">
                        <span className="text-[8px] font-black text-white">!</span>
                    </div>
                </div>

                {/* Número 404 com efeito visual */}
                <div className="relative mb-6">
                    <h1 
                        className={`text-[120px] sm:text-[160px] font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-foreground/20 to-foreground/5 select-none transition-all duration-100 ${glitchAtivo ? 'translate-x-[2px] skew-x-1' : ''}`}
                    >
                        404
                    </h1>
                    {/* Sobreposição do número com cor */}
                    <h1 
                        className={`absolute inset-0 text-[120px] sm:text-[160px] font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-primary via-blue-400 to-indigo-400 select-none opacity-60 transition-all duration-100 ${glitchAtivo ? '-translate-x-[2px] -skew-x-1' : ''}`}
                    >
                        404
                    </h1>
                </div>

                {/* Título e descrição */}
                <div className="space-y-4 mb-10">
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                        Página não encontrada
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-base max-w-sm mx-auto leading-relaxed">
                        Parece que esta rota não existe ou foi movida. 
                        Verifique o endereço ou volte para uma área segura.
                    </p>
                </div>

                {/* Botões de ação */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <Link
                        to={destino}
                        className="group w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 bg-primary text-primary-foreground rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-[0.97] transition-all"
                    >
                        <Home size={16} />
                        {textoBotaoPrincipal}
                        <Sparkles size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    
                    <button
                        onClick={() => window.history.back()}
                        className="group w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-primary/20 text-foreground rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                        Voltar
                    </button>
                </div>

                {/* Código de referência */}
                <div className="mt-12 flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive/60" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                        Erro HTTP 404 — Recurso inexistente
                    </span>
                </div>
            </div>
        </div>
    );
});

Pagina404.displayName = 'Pagina404';

export default Pagina404;
