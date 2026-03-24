import { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle, AlertCircle, RefreshCw, ShieldCheck, Smartphone, Laptop, ArrowRight } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../../compartilhado/servicos/api';

/**
 * Scanner de Login Rápido (UX Refinada).
 * Foca na velocidade e minimalismo: "Apontou, Escaneou, Entrou".
 */
export default function ScannerQR({ aoFechar }: { aoFechar: () => void }) {
    const [status, setStatus] = useState<'ocioso' | 'scaneando' | 'validando' | 'sucesso' | 'erro'>('ocioso');
    const [tokenSessao, setTokenSessao] = useState<string | null>(null);
    const [mensagemErro, setMensagemErro] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Tenta iniciar automaticamente se já houver permissão
    useEffect(() => {
        const checkPerms = async () => {
             try {
                const result = await navigator.permissions.query({ name: 'camera' as any });
                if (result.state === 'granted') setStatus('scaneando');
             } catch (e) {}
        };
        checkPerms();
    }, []);

    useEffect(() => {
        if (status === 'scaneando') {
            const scanner = new Html5Qrcode('leitor-qr');
            scannerRef.current = scanner;
            const config = { fps: 20, qrbox: { width: 220, height: 220 } };

            scanner.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    let token = decodedText;
                    if (decodedText.includes('/auth/qr/')) {
                         token = decodedText.split('/auth/qr/').pop() || decodedText;
                    }
                    
                    if (scannerRef.current) {
                        scannerRef.current.stop().then(() => {
                            setTokenSessao(token);
                            setStatus('validando');
                            // Dispara a autorização IMEDIATA para reduzir cliques (UX Discord style)
                            executarAutorizacaoAutomatica(token);
                        });
                    }
                },
                undefined
            ).catch(() => setStatus('ocioso'));
        }

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop();
            }
        };
    }, [status]);

    const executarAutorizacaoAutomatica = async (token: string) => {
        try {
            await api.post('/api/auth/qr/identificar', { sessaoId: token });
            await api.post('/api/auth/qr/autorizar', { sessaoId: token });
            setStatus('sucesso');
            if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
            setTimeout(aoFechar, 1500);
        } catch (err: any) {
            setMensagemErro(err.response?.data?.erro || 'Link inválido');
            setStatus('erro');
        }
    };

    return (
        <div className="flex flex-col items-center p-0 overflow-hidden bg-slate-950 rounded-[2rem]">
            {/* 🖥️ VISUAL BRIDGE */}
            {status !== 'scaneando' && status !== 'sucesso' && (
                <div className="w-full pt-10 pb-4 flex items-center justify-center gap-6 animate-in fade-in slide-in-from-top-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                        <Smartphone className="text-red-500" size={20} />
                    </div>
                    <ArrowRight className="text-white/10" size={16} />
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                        <Laptop className="text-slate-500" size={20} />
                    </div>
                </div>
            )}

            {/* 📸 SCANNER / CAMERA */}
            <div className={`relative w-full ${status === 'scaneando' ? 'aspect-square' : 'aspect-square'} overflow-hidden transition-all duration-700`}>
                
                {status === 'ocioso' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-[radial-gradient(circle_at_center,_#ef444410_0%,transparent_70%)]">
                        <button
                            onClick={() => setStatus('scaneando')}
                            className="group relative px-10 py-5 bg-red-600 text-white text-[11px] font-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-red-600/30 uppercase tracking-[0.2em] overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                <Camera size={18} /> Iniciar Scanner
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </button>
                    </div>
                )}

                <div id="leitor-qr" className={`${status === 'scaneando' ? 'block' : 'hidden'} w-full h-full scale-110`} />

                {status === 'scaneando' && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-64 h-64 border-2 border-white/20 rounded-[2.5rem] relative">
                             {/* Cantos Tech */}
                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-red-600 rounded-tl-xl" />
                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-red-600 rounded-tr-xl" />
                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-red-600 rounded-bl-xl" />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-red-600 rounded-br-xl" />
                            
                            <div className="w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent absolute top-0 animate-scan-line shadow-[0_0_15px_#ef4444]" />
                        </div>
                    </div>
                )}

                {status === 'validando' && (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center space-y-6 animate-pulse">
                        <div className="w-20 h-20 bg-red-600/5 rounded-full flex items-center justify-center border border-red-600/20">
                            <RefreshCw className="w-10 h-10 text-red-600 animate-spin" />
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Validando Acesso...</p>
                    </div>
                )}

                {status === 'sucesso' && (
                    <div className="absolute inset-0 bg-emerald-600 flex flex-col items-center justify-center space-y-6 animate-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center shadow-inner">
                            <CheckCircle className="w-12 h-12 text-white animate-bounce-short" />
                        </div>
                        <h2 className="text-white font-black uppercase tracking-[0.2em] text-[12px]">Conectado!</h2>
                    </div>
                )}

                {status === 'erro' && (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-12 text-center space-y-6">
                        <div className="w-16 h-16 bg-red-600/10 text-red-500 rounded-full flex items-center justify-center border border-red-600/20">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <p className="text-xs font-bold text-white tracking-tight leading-relaxed">{mensagemErro}</p>
                        <button
                            onClick={() => setStatus('ocioso')}
                            className="px-8 py-3 bg-white/5 text-[10px] font-black text-white uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all"
                        >
                            Tentar outro código
                        </button>
                    </div>
                )}
            </div>

            {/* 🏁 FOOTER DESC */}
            <div className="w-full p-10 bg-white/[0.02] border-t border-white/5">
                <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em] leading-relaxed">
                    Apontou, Entrou. <br />
                    <span className="text-slate-700">A transferência de sessão é criptografada de ponta-a-ponta.</span>
                </p>
            </div>
        </div>
    );
}
