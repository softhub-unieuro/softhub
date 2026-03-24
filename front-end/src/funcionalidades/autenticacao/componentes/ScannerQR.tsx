import { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle, AlertCircle, RefreshCw, X, Check, Sparkles, ShieldCheck, QrCode, Scan, Smartphone } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../../compartilhado/servicos/api';

/**
 * Scanner de Login "SoftHub Premium Modern".
 * Design Minimalista, Feedback Tátil e Estética High-Tech.
 */
export default function ScannerQR({ aoFechar }: { aoFechar: () => void }) {
    const [status, setStatus] = useState<'ocioso' | 'carregando' | 'scaneando' | 'validando' | 'sucesso' | 'erro'>('ocioso');
    const [tokenSessao, setTokenSessao] = useState<string | null>(null);
    const [mensagemErro, setMensagemErro] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Contexto de áudio para feedback sonoro
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
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            gain.gain.setValueAtTime(0.02, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        } catch (e) {}
    };

    const iniciarCamera = async () => {
        setStatus('carregando');
        localStorage.setItem('camera_autorizada', 'true'); // Salva para auto-start futuro
        if (!audioContextRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextClass();
        }

        setTimeout(() => {
            setStatus('scaneando');
        }, 800);
    };

    useEffect(() => {
        const tentarAutoStart = async () => {
             try {
                // Tenta verificar via Permissions API (Chrome/Edge/Android)
                const statusPermissao = await navigator.permissions.query({ name: 'camera' as any });
                if (statusPermissao.state === 'granted') {
                    iniciarCamera();
                } else if (localStorage.getItem('camera_autorizada') === 'true') {
                    // Fallback para Safari ou se a API falhar mas temos o hint no storage
                    iniciarCamera();
                }
            } catch (e) {
                // Caso a API de permissões não exista, usamos o localStorage como dica
                if (localStorage.getItem('camera_autorizada') === 'true') {
                    iniciarCamera();
                }
            }
        };
        tentarAutoStart();
    }, []);

    useEffect(() => {
        if (status === 'scaneando') {
            const scanner = new Html5Qrcode('leitor-qr');
            scannerRef.current = scanner;
            scanner.start(
                { facingMode: 'environment' },
                { fps: 30, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    let token = decodedText;
                    if (decodedText.includes('/auth/qr/')) {
                         token = decodedText.split('/auth/qr/').pop() || decodedText;
                    }
                    if (scannerRef.current) {
                        scannerRef.current.stop().then(async () => {
                            emitirBeep();
                            if (navigator.vibrate) navigator.vibrate(40);
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
            if (navigator.vibrate) navigator.vibrate([10, 30, 10, 30, 50]);
            setTimeout(aoFechar, 2000);
        } catch (err: any) {
            setMensagemErro('Este código já foi usado ou expirou.');
            setStatus('erro');
        }
    };

    return (
        <div className="flex flex-col items-center p-2 mb-4 animate-in fade-in duration-700">
            
            {/* 📸 ÁREA DE SCAN / VIEWPORT */}
            <div className="relative w-full aspect-square max-w-[300px] rounded-[2.5rem] overflow-hidden bg-slate-950 border border-slate-200/50 shadow-2xl flex items-center justify-center group">
                
                {/* 📖 ESTADO OCIOSO / CARREGANDO */}
                {(status === 'ocioso' || status === 'carregando') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white z-10">
                        {status === 'carregando' ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-slate-100 rounded-full animate-pulse" />
                                    <RefreshCw className="absolute inset-0 m-auto w-8 h-8 text-primary animate-spin" />
                                </div>
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sincronizando...</span>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex justify-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center relative group-hover:scale-110 transition-transform duration-500">
                                        <div className="absolute inset-0 bg-primary/5 rounded-3xl animate-ping" />
                                        <QrCode size={40} className="text-primary relative z-10" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-black text-slate-900 tracking-tight">Acesso Instantâneo</h3>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-[180px] mx-auto">
                                        Escaneie o QR Code no seu computador para entrar sem digitar nada.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* AREA DA CAMERA HTML5-QRCODE */}
                <div id="leitor-qr" className={`${status === 'scaneando' ? 'block' : 'hidden'} w-full h-full scale-[1.15] object-cover`} />

                {/* Overlays Visuais de Escaneamento Ativo */}
                {status === 'scaneando' && (
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Escurecimento das bordas para focar no centro */}
                        <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
                        
                        {/* Frame central dinâmico */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px]">
                            {/* Cantos Estilo Tech */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
                            
                            {/* Linha de Scanner Laser Suave */}
                            <div className="absolute left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-scan-line" />
                        </div>

                        {/* Badge de Status */}
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">Scanner Ativo</span>
                        </div>
                    </div>
                )}

                {/* Feedback de Sucesso Premium */}
                {status === 'sucesso' && (
                    <div className="absolute inset-0 bg-emerald-600 flex flex-col items-center justify-center animate-in zoom-in duration-500 z-20">
                         <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center animate-bounce border border-white/20">
                            <Check size={48} className="text-white" strokeWidth={3} />
                         </div>
                         <h3 className="mt-6 text-xs font-black text-white uppercase tracking-[0.4em]">Autorizado</h3>
                         <p className="text-[10px] text-white/60 font-medium mt-2">Sincronizando terminal...</p>
                    </div>
                )}

                {/* Feedback de Erro Premium */}
                {status === 'erro' && (
                    <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-8 text-center z-20 animate-in fade-in">
                        <div className="w-20 h-20 bg-slate-50 text-red-500 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                            <AlertCircle size={40} />
                        </div>
                        <span className="text-slate-900 text-sm font-black tracking-tight mb-2">Ops! Ocorreu um erro</span>
                        <p className="text-[11px] text-slate-500 mb-6 leading-tight">{mensagemErro}</p>
                        <button 
                            onClick={() => setStatus('scaneando')} 
                            className="bg-slate-900 text-white text-[10px] px-6 py-2.5 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-transform"
                        >
                            Tentar Novamente
                        </button>
                    </div>
                )}
            </div>

            {/* 🏁 AÇÕES / CONTROLES */}
            <div className="w-full mt-8 flex flex-col items-center min-h-[140px]">
                
                {status === 'ocioso' && (
                    <button
                        onClick={iniciarCamera}
                        className="group flex items-center gap-3 px-10 py-4 bg-primary text-white text-xs font-black rounded-2xl hover:brightness-110 shadow-lg shadow-primary/20 active:scale-95 transition-all uppercase tracking-[0.2em]"
                    >
                        <Camera size={18} />
                        Abrir Scanner
                    </button>
                )}

                {status === 'scaneando' && (
                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="flex items-center gap-3 bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-100">
                            <Scan size={16} className="text-primary" />
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Aponte para o código</span>
                        </div>
                        <button 
                            onClick={() => setStatus('ocioso')}
                            className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900"
                        >
                            Cancelar
                        </button>
                    </div>
                )}

                {status === 'validando' && (
                    <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-8 duration-500 w-full px-4">
                        <div className="text-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full mb-3">
                                <Smartphone size={12} strokeWidth={3} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Confirmação de Identidade</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-2">Autorizar Login?</h3>
                            <p className="text-[11px] text-slate-500 font-medium">Um novo terminal está solicitando acesso à sua conta.</p>
                        </div>
                        
                        <div className="flex items-center gap-6 w-full">
                            <button 
                                onClick={aoFechar} 
                                className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200"
                            >
                                Recusar
                            </button>
                            <button 
                                onClick={confirmarAcesso} 
                                className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Check size={16} strokeWidth={3} /> Permitir Acesso
                            </button>
                        </div>
                    </div>
                )}

                {(status === 'sucesso' || status === 'carregando') && (
                    <div className="flex flex-col items-center gap-3 opacity-60">
                         <div className="flex items-center gap-2">
                             <ShieldCheck size={16} className="text-emerald-500" />
                             <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Conexão Segura Ativa</span>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
}
