import { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle, AlertCircle, RefreshCw, X, Check, Sparkles, ShieldCheck, QrCode, ClipboardCheck, LayoutDashboard } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../../compartilhado/servicos/api';

/**
 * Scanner de Login "SoftHub Ultimate".
 * Design Institucional Premium, Tutorial Integrado e Feedback Multissensorial.
 */
export default function ScannerQR({ aoFechar }: { aoFechar: () => void }) {
    const [status, setStatus] = useState<'ocioso' | 'carregando' | 'scaneando' | 'validando' | 'sucesso' | 'erro'>('ocioso');
    const [tokenSessao, setTokenSessao] = useState<string | null>(null);
    const [mensagemErro, setMensagemErro] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Contexto de áudio capturado no primeiro clique (Safari/Chrome compat)
    const audioContextRef = useRef<AudioContext | null>(null);

    const emitirBeep = () => {
        try {
            if (!audioContextRef.current) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                audioContextRef.current = new AudioContextClass();
            }
            const ctx = audioContextRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        } catch (e) {}
    };

    const iniciarCamera = async () => {
        setStatus('carregando');
        // Inicializa áudio no clique do usuário
        if (!audioContextRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextClass();
        }

        setTimeout(() => {
            setStatus('scaneando');
        }, 600);
    };

    useEffect(() => {
        if (status === 'scaneando') {
            const scanner = new Html5Qrcode('leitor-qr');
            scannerRef.current = scanner;
            scanner.start(
                { facingMode: 'environment' },
                { fps: 24, qrbox: { width: 220, height: 220 } },
                (decodedText) => {
                    let token = decodedText;
                    if (decodedText.includes('/auth/qr/')) {
                         token = decodedText.split('/auth/qr/').pop() || decodedText;
                    }
                    if (scannerRef.current) {
                        scannerRef.current.stop().then(async () => {
                            emitirBeep();
                            setTokenSessao(token);
                            setStatus('validando');
                            try { await api.post('/api/auth/qr/identificar', { sessaoId: token }); } catch (e) {}
                        });
                    }
                },
                undefined
            ).catch(() => setStatus('ocioso'));
        }
        return () => { if (scannerRef.current?.isScanning) scannerRef.current.stop(); };
    }, [status]);

    const confirmarAcesso = async () => {
        if (!tokenSessao) return;
        try {
            await api.post('/api/auth/qr/autorizar', { sessaoId: tokenSessao });
            setStatus('sucesso');
            if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
            setTimeout(aoFechar, 1500);
        } catch (err: any) {
            setMensagemErro('Este código já foi usado ou expirou.');
            setStatus('erro');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-0 transition-all duration-500">
            
            {/* 📸 ÁREA DE SCAN / VIEWPORT */}
            <div className="relative w-full aspect-square max-w-[280px] rounded-[3.5rem] overflow-hidden bg-slate-50 border-4 border-slate-50 shadow-inner group transition-all duration-700 ring-8 ring-transparent hover:ring-slate-50">
                
                {/* 📖 ESTADO OCIOSO: TUTORIAL VISUAL */}
                {(status === 'ocioso' || status === 'carregando') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500">
                        {status === 'carregando' ? (
                            <div className="flex flex-col items-center gap-4">
                                <RefreshCw className="w-10 h-10 text-red-600 animate-spin" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Iniciando Sensor...</span>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="flex justify-center -space-x-3 opacity-40">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100">
                                        <QrCode size={20} className="text-slate-400" />
                                    </div>
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 z-10 translate-y-2">
                                        <ClipboardCheck size={20} className="text-emerald-500" />
                                    </div>
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100">
                                        <LayoutDashboard size={20} className="text-slate-400" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-[12px] font-black text-slate-900 tracking-widest uppercase italic">Gateway Rápido</h3>
                                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed px-4">
                                        Apontou pro computador, confirmou no celular, entrou. Simples assim.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div id="leitor-qr" className={`${status === 'scaneando' ? 'block' : 'hidden'} w-full h-full scale-110 object-cover`} />

                {/* Overlays Visuais de Escaneamento Ativo */}
                {status === 'scaneando' && (
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Brilho Central */}
                        <div className="absolute inset-0 bg-white/20" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-[3px] border-white/60 rounded-[2.5rem] shadow-[0_0_0_100vw_rgba(255,255,255,0.7)]" />
                        
                        {/* Linha de Scanner Laser */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-[2px] bg-red-600 shadow-[0_0_20px_#ef4444] animate-scan-line" />
                        
                        {/* Cantos Neon */}
                        <div className="absolute top-[46px] left-[46px] w-8 h-8 border-t-[5px] border-l-[5px] border-red-600 rounded-tl-2xl animate-pulse" />
                        <div className="absolute top-[46px] right-[46px] w-8 h-8 border-t-[5px] border-r-[5px] border-red-600 rounded-tr-2xl animate-pulse" />
                        <div className="absolute bottom-[46px] left-[46px] w-8 h-8 border-b-[5px] border-l-[5px] border-red-600 rounded-bl-2xl animate-pulse" />
                        <div className="absolute bottom-[46px] right-[46px] w-8 h-8 border-b-[5px] border-r-[5px] border-red-600 rounded-br-2xl animate-pulse" />
                    </div>
                )}

                {/* Feedback de Sucesso */}
                {status === 'sucesso' && (
                    <div className="absolute inset-0 bg-emerald-600 flex flex-col items-center justify-center animate-in zoom-in duration-500 z-20 shadow-inner">
                         <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center animate-bounce-short border-4 border-white/20 p-2 shadow-2xl">
                            <Check size={48} className="text-white" strokeWidth={4} />
                         </div>
                         <h3 className="mt-6 text-[11px] font-black text-white uppercase tracking-[0.4em]">Conectado!</h3>
                    </div>
                )}

                {/* Feedback de Erro */}
                {status === 'erro' && (
                    <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-8 text-center z-20 animate-in fade-in">
                        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 border border-red-100 shadow-inner">
                            <AlertCircle size={40} />
                        </div>
                        <span className="text-slate-900 text-[11px] font-black uppercase tracking-tight leading-tight mb-4">{mensagemErro}</span>
                        <button onClick={() => setStatus('scaneando')} className="text-[10px] text-red-600 hover:text-red-700 uppercase font-black underline underline-offset-4 decoration-2">Tentar de novo</button>
                    </div>
                )}
            </div>

            {/* 🏁 AÇÕES / RODAPÉ DINÂMICO */}
            <div className="w-full flex flex-col items-center py-10 min-h-[160px] justify-center relative">
                
                {status === 'ocioso' && (
                    <button
                        onClick={iniciarCamera}
                        className="group relative px-16 py-4.5 bg-red-600 text-white text-[13px] font-black rounded-3xl hover:bg-red-700 shadow-[0_20px_40px_-10px_rgba(239,68,68,0.3)] active:scale-95 transition-all uppercase tracking-[0.25em] animate-in slide-in-from-bottom-5 overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            <Camera size={18} /> Verificar Câmera
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </button>
                )}

                {status === 'carregando' && (
                    <div className="flex flex-col items-center gap-4 text-slate-300 animate-in fade-in">
                         <div className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Preparando Terminal...</span>
                         </div>
                    </div>
                )}

                {status === 'validando' && (
                    <div className="flex flex-col items-center gap-8 animate-in slide-in-from-bottom-8 duration-500 w-full px-8">
                        <div className="text-center">
                            <h3 className="text-[15px] font-black text-slate-900 tracking-[0.2em] uppercase mb-1">Autorizar Acesso?</h3>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">Um computador está solicitando sua entrada.</p>
                        </div>
                        <div className="flex items-center gap-12">
                            <button onClick={aoFechar} className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all border border-slate-100 shadow-xl shadow-slate-200/50">
                                <X size={28} strokeWidth={2.5} />
                            </button>
                            <button onClick={confirmarAcesso} className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(239,68,68,0.4)] active:scale-90 transition-all outline outline-8 outline-red-50">
                                <Check size={36} strokeWidth={4} />
                            </button>
                        </div>
                    </div>
                )}

                {(status === 'scaneando' || status === 'sucesso' || status === 'erro') && (
                    <div className="flex flex-col items-center gap-4 opacity-40 animate-in zoom-in-95 duration-500">
                         <div className="flex items-center gap-3">
                             <ShieldCheck size={20} className="text-red-600" />
                             <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] italic">Protocolo SoftHub</span>
                         </div>
                         <div className="flex items-center gap-2 bg-slate-100 px-4 py-1.5 rounded-full">
                            <Sparkles size={12} className="text-slate-400" />
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Sincronização Ativa</p>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
}
