import { memo } from 'react';
import { Globe, Code } from 'lucide-react';
import logoUnieuro from '@/assets/logo-unieuro-branca.png';

export const LadoEsquerdoInstitucional = memo(() => {
    return (
        <div className="lg:w-[42%] bg-[#000d1a] p-8 pt-12 pb-14 lg:p-16 flex flex-col justify-between text-white relative overflow-hidden group shrink-0 select-none">
            {/* Camada 1: Fundo Base com Grid Tecnológico */}
            <div className="absolute inset-0 z-0 opacity-20" 
                 style={{ 
                    backgroundImage: 'radial-gradient(circle, #ffffff1a 1px, transparent 1px)',
                    backgroundSize: '30px 30px' 
                 }} 
            />
            
            {/* Camada 2: Mix de Luzes Decorativas (Blue & Blue Glow) */}
            <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none opacity-50" />

            <div className="relative z-10 space-y-12 lg:space-y-16 animar-entrada atraso-1">
                <div className="flex items-center gap-5">
                    <img src={logoUnieuro} alt="Logo Unieuro" className="w-10 h-10 lg:w-12 lg:h-12 object-contain" />
                    <div className="space-y-1.5">
                        <h1 className="text-xl lg:text-[24px] font-[900] leading-none tracking-tight text-white/95">FÁBRICA DE SOFTWARE</h1>
                        <div className="inline-flex items-center px-2 py-0.5 bg-blue-600/20 rounded-2xl border border-blue-500/20">
                            <span className="text-[10px] lg:text-[11px] tracking-[0.3em] text-blue-500 font-black uppercase">SoftHub</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 lg:space-y-10">
                    <h2 className="text-[42px] lg:text-[72px] font-[900] leading-[0.95] lg:leading-[0.9] tracking-tighter">
                        Sua Ideia, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400 drop-shadow-sm">Nosso Código.</span>
                    </h2>
                    <p className="text-white/60 text-sm lg:text-[17px] leading-relaxed max-w-xs lg:max-w-md font-bold">
                        Transformamos o conhecimento acadêmico em soluções tecnológicas de alto impacto.
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-16 lg:w-24 bg-blue-600 rounded-full shadow-lg shadow-blue-900/40" />
                        <div className="h-1.5 w-6 bg-white/10 rounded-full" />
                    </div>
                </div>
            </div>

            <div className="mt-8 lg:mt-0 relative z-10 hidden sm:block">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-amber-500/5 rounded-2xl border border-amber-500/10 group-hover:border-amber-500/30 transition-all duration-700">
                            <Globe size={14} className="text-amber-500/50 group-hover:text-amber-500 transition-colors" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-amber-500/40 transition-colors">Campus Águas Claras</span>
                    </div>
                    <div className="p-2 bg-amber-500/5 rounded-2xl border border-amber-500/10 group-hover:border-amber-500/40 transition-all duration-700">
                        <Code size={16} className="text-amber-500/30 group-hover:text-amber-500/60" />
                    </div>
                </div>
            </div>
        </div>
    );
});
