import { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle, AlertCircle, RefreshCw, X, Check, Smartphone, Laptop, Sparkles } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../../compartilhado/servicos/api';

/**
 * Scanner de Login Premium (UI Upgrade).
 * Design focado em transparência, precisão e elegância institucional.
 */
export default function ScannerQR({ aoFechar }: { aoFechar: () => void }) {
    const [status, setStatus] = useState<'ocioso' | 'scaneando' | 'validando' | 'sucesso' | 'erro'>('ocioso');
    const [tokenSessao, setTokenSessao] = useState<string | null>(null);
    const [mensagemErro, setMensagemErro] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Auto-start se permitido
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
            const config = { fps: 24, qrbox: { width: 220, height: 220 } };

            scanner.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    let token = decodedText;
                    if (decodedText.includes('/auth/qr/')) {
                         token = decodedText.split('/auth/qr/').pop() || decodedText;
                    }
                    
                    if (scannerRef.current) {
                        scannerRef.current.stop().then(async () => {
                            setTokenSessao(token);
                            setStatus('validando');
                            try {
                                await api.post('/api/auth/qr/identificar', { sessaoId: token });
                            } catch (e) {}
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

    const confirmarAcesso = async () => {
        if (!tokenSessao) return;
        try {
            await api.post('/api/auth/qr/autorizar', { sessaoId: tokenSessao });
            setStatus('sucesso');
            if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
            setTimeout(aoFechar, 1500);
        } catch (err: any) {
            setMensagemErro(err.response?.data?.erro || 'Código inválido');
            setStatus('erro');
        }
    };

    return (
        <div className="flex flex-col items-center p-0 overflow-hidden bg-white rounded-[2rem] shadow-2xl border border-slate-100 min-h-[500px]">
            
            {/* 🏷️ HEADER MINIMALISTA */}
            <div className="w-full px-8 py-5 flex items-center justify-between border-b border-slate-50">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-200">
                        <Smartphone size={16} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Login Seguro</span>
                </div>
                <button onClick={aoFechar} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* 📸 CAMERA VIEWPORT (MODERNIZADO) */}
            <div className={`relative w-[280px] h-[280px] mt-8 rounded-[2.5rem] overflow-hidden bg-slate-100 ring-4 ring-slate-50 shadow-inner group transition-all duration-500`}>
                
                {status === 'ocioso' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center animate-in fade-in">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl mb-4 text-red-600">
                            <Camera size={28} />
                        </div>
                        <button
                            onClick={() => setStatus('scaneando')}
                            className="text-[10px] font-black text-red-600 uppercase tracking-widest hover:underline decoration-2"
                        >
                            Permitir Câmera
                        </button>
                    </div>
                )}

                <div id="leitor-qr" className={`${status === 'scaneando' ? 'block' : 'hidden'} w-full h-full scale-110 object-cover`} />

                {/* Overlays Visuais de Escaneamento */}
                {status === 'scaneando' && (
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Máscara de foco */}
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/50 rounded-3xl shadow-[0_0_0_100vw_rgba(0,0,0,0.4)]" />
                        
                        {/* Linha de Scanner Animada */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-[2px] bg-red-600 shadow-[0_0_15px_#ef4444] animate-scan-line" />
                        
                        {/* Cantos Estilizados */}
                        <div className="absolute top-[52px] left-[52px] w-6 h-6 border-t-4 border-l-4 border-red-600 rounded-tl-lg" />
                        <div className="absolute top-[52px] right-[52px] w-6 h-6 border-t-4 border-r-4 border-red-600 rounded-tr-lg" />
                        <div className="absolute bottom-[52px] left-[52px] w-6 h-6 border-b-4 border-l-4 border-red-600 rounded-bl-lg" />
                        <div className="absolute bottom-[52px] right-[52px] w-6 h-6 border-b-4 border-r-4 border-red-600 rounded-br-lg" />
                    </div>
                )}

                {/* Sucesso / Erro (Transfere para o centro da câmera para impacto) */}
                {status === 'sucesso' && (
                    <div className="absolute inset-0 bg-emerald-600 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                        <CheckCircle size={64} className="text-white mb-2" />
                        <span className="text-white font-black text-[10px] uppercase tracking-widest">Confirmado</span>
                    </div>
                )}

                {status === 'erro' && (
                    <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                        <AlertCircle size={48} className="text-red-500 mb-4" />
                        <span className="text-white text-xs font-bold leading-tight">{mensagemErro}</span>
                    </div>
                )}
            </div>

            {/* 🏁 ACTIONS / FOOTER */}
            <div className="flex-1 w-full flex flex-col items-center justify-center p-8 bg-[radial-gradient(ellipse_at_top,_#f8fafc_0%,white_100%)]">
                
                {status === 'validando' ? (
                    <div className="flex flex-col items-center space-y-8 animate-in slide-in-from-bottom-5">
                         <div className="text-center space-y-1">
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">Autorizar Login?</h3>
                            <p className="text-[11px] text-slate-500 font-medium">Detectamos um pedido no computador.</p>
                        </div>

                        <div className="flex gap-8 items-center">
                            <button
                                onClick={aoFechar}
                                className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-400 border border-slate-100 shadow-xl shadow-slate-200/50 active:scale-95"
                            >
                                <X size={24} />
                            </button>
                            <button
                                onClick={confirmarAcesso}
                                className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-red-600/30 active:scale-95 transition-all outline outline-8 outline-red-50"
                            >
                                <Check size={32} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-4 max-w-[200px] opacity-40">
                         <div className="flex justify-center">
                            <Sparkles className="text-red-600" size={20} />
                         </div>
                         <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-loose">
                            APONTOU, ENTROU. <br />
                            <span className="text-slate-400 font-bold">Transferência criptografada em tempo real.</span>
                         </p>
                    </div>
                )}
            </div>
        </div>
    );
}
