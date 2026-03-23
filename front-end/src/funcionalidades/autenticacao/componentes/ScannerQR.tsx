import { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../../compartilhado/servicos/api';

/**
 * Scanner de QR Code para transferência de sessão (Audit Checklist Frontend).
 */
export default function ScannerQR({ aoFechar }: { aoFechar: () => void }) {
    const [status, setStatus] = useState<'ocioso' | 'scaneando' | 'validando' | 'confirmacao' | 'autorizando' | 'sucesso' | 'erro'>('ocioso');
    const [tokenSessao, setTokenSessao] = useState<string | null>(null);
    const [mensagemErro, setMensagemErro] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // ── Ciclo de Vida do Scanner ──────────────────────────────────────────────
    useEffect(() => {
        if (status === 'scaneando') {
            const scanner = new Html5Qrcode('leitor-qr');
            scannerRef.current = scanner;

            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            scanner.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    // Extração flexível do token (URL ou raw)
                    let token = decodedText;
                    if (decodedText.includes('/auth/qr/')) {
                         token = decodedText.split('/auth/qr/').pop() || decodedText;
                    }
                    
                    if (scannerRef.current) {
                        scannerRef.current.stop().then(() => {
                            setTokenSessao(token);
                            setStatus('validando');
                        });
                    }
                },
                undefined
            ).catch(err => {
                console.error('[SCAN] Erro ao iniciar câmera:', err);
                setMensagemErro('Câmera não permitida.');
                setStatus('erro');
            });
        }

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop();
            }
        };
    }, [status]);

    // ── Fluxo de Autorização ──────────────────────────────────────────────────
    const confirmarAcesso = async () => {
        if (!tokenSessao) return;
        setStatus('autorizando');
        try {
            // Notificamos o backend que identificamos o dispositivo (Checklist Part 2)
            await api.post('/api/auth/qr/identificar', { sessaoId: tokenSessao });
            
            // Autorizamos a entrada definitiva (Checklist Part 1)
            await api.post('/api/auth/qr/autorizar', { sessaoId: tokenSessao });
            
            setStatus('sucesso');
            setTimeout(aoFechar, 2000);
        } catch (err: any) {
            setMensagemErro(err.response?.data?.erro || 'Autorização falhou');
            setStatus('erro');
        }
    };

    return (
        <div className="flex flex-col items-center p-6 space-y-6">
            <div className="relative w-full aspect-square max-w-[300px] bg-slate-900 rounded-3xl overflow-hidden border-4 border-slate-100 shadow-inner group">
                {status === 'ocioso' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 p-8">
                        <Camera className="w-12 h-12 text-slate-500 opacity-20" />
                        <button
                            onClick={() => setStatus('scaneando')}
                            className="px-6 py-3 bg-red-600 text-white text-xs font-black rounded-2xl hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-200 uppercase tracking-widest"
                        >
                            Abrir Câmera
                        </button>
                    </div>
                )}

                <div id="leitor-qr" className={`${status === 'scaneando' ? 'block' : 'hidden'} w-full h-full`} />

                {(status === 'validando' || status === 'autorizando') && (
                    <div className="absolute inset-0 bg-white flex flex-col items-center justify-center space-y-4">
                        <RefreshCw className="w-8 h-8 text-red-600 animate-spin" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando...</span>
                    </div>
                )}

                {status === 'sucesso' && (
                    <div className="absolute inset-0 bg-green-500 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
                        <CheckCircle className="w-16 h-16 text-white animate-bounce-short" />
                        <span className="text-white font-black uppercase tracking-widest text-xs">Conectado com Sucesso!</span>
                    </div>
                )}

                {status === 'erro' && (
                    <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-8 text-center space-y-4">
                        <div className="p-3 bg-red-50 text-red-500 rounded-full">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <p className="text-xs font-bold text-slate-900">{mensagemErro}</p>
                        <button
                            onClick={() => setStatus('ocioso')}
                            className="text-[10px] font-black text-red-600 uppercase tracking-tighter hover:underline"
                        >
                            Tentar Novamente
                        </button>
                    </div>
                )}
            </div>

            {status === 'validando' && (
                <div className="w-full space-y-6 animate-in slide-in-from-bottom duration-500">
                    <div className="text-center space-y-2">
                        <h3 className="text-lg font-black text-slate-900">Autorizar Acesso?</h3>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            Você está prestes a entrar em um novo dispositivo. Certifique-se de que é o seu computador.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStatus('ocioso')}
                            className="flex-1 py-4 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all border border-slate-200"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmarAcesso}
                            className="flex-1 py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <ShieldCheck size={14} /> Sim, Autorizar
                        </button>
                    </div>
                </div>
            )}

            {status === 'scaneando' && (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
                    Aponte para o QR Code no Desktop
                </p>
            )}
        </div>
    );
}
