import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, CheckCircle, ShieldCheck, Camera } from 'lucide-react';
import { api } from '@/compartilhado/servicos/api';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { useNavigate } from 'react-router';
import { usarDispositivo } from '../../../compartilhado/hooks/usarDispositivo';
import { Avatar } from '../../../compartilhado/componentes/Avatar';

import { ambiente } from '@/configuracoes/ambiente';

/**
 * Painel de Login QR Code (Refatorado para SSE + Real-time Status).
 * Fluxo inspirado no Discord, com feedback instantâneo e contagem regressiva.
 */
export default function PainelQRCode() {
    const [sessao, setSessao] = useState<{ id: string; expiraEm: string; usuario?: any } | null>(null);
    const [status, setStatus] = useState<'gerando' | 'pending' | 'scanned' | 'confirmed' | 'expired' | 'erro'>('gerando');
    const [segundosRestantes, setSegundosRestantes] = useState(120);
    const { entrar } = usarAutenticacao();
    const { isMobile } = usarDispositivo();
    const navigate = useNavigate();
    const streamRef = useRef<EventSource | null>(null);

    // ── Geração de Sessão ────────────────────────────────────────────────────────
    const gerarNovoQR = useCallback(async () => {
        if (isMobile) return;
        try {
            setStatus('gerando');
            const res = await api.post('/api/auth/qr/gerar');
            setSessao({ id: res.data.sessaoId, expiraEm: res.data.expiraEm });
            setSegundosRestantes(120); 
            setStatus('pending');
        } catch (erro) {
            setStatus('erro');
        }
    }, [isMobile]);

    // ── Conexão em Tempo Real (SSE) ──────────────────────────────────────────────
    useEffect(() => {
        if (status === 'gerando' || !sessao?.id || isMobile) return;

        if (streamRef.current) streamRef.current.close();

        const baseUrl = sessao.id.startsWith('http') ? '' : ambiente.apiUrl;
        const url = `${baseUrl}/api/auth/qr/stream/${sessao.id}`;
        const es = new EventSource(url);
        streamRef.current = es;

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.status === 'scanned') {
                    setSessao(s => s ? ({ ...s, usuario: data.usuario }) : null);
                    setStatus('scanned');
                } else if (data.status === 'confirmed') {
                    setSessao(s => s ? ({ ...s, usuario: data.usuario }) : null);
                    setStatus('confirmed');
                    
                    if (data.usuario && data.token) {
                        if (data.refreshToken) localStorage.setItem('softhub_refresh_token', data.refreshToken);
                        localStorage.setItem('softhub_token', data.token);
                        
                        entrar(data.usuario, data.token);
                        navigate('/app/dashboard', { replace: true });
                    }
                    es.close();
                } else if (data.status === 'expired') {
                    setStatus('expired');
                    es.close();
                }
            } catch (e) {
                console.error('[QR-SSE] Erro ao processar:', e);
            }
        };

        es.onerror = () => {
            if (status !== 'confirmed' && status !== 'expired') {
                 // Reconectamos ou mostramos erro se necessário
            }
        };

        return () => {
            if (streamRef.current) streamRef.current.close();
        };
    }, [sessao?.id, status, isMobile, entrar, navigate]);

    // ── Cronômetro de Expiração ──────────────────────────────────────────────────
    useEffect(() => {
        if (status !== 'pending' && status !== 'scanned') return;
        if (segundosRestantes <= 0) {
            setStatus('expired');
            return;
        }

        const timer = setInterval(() => {
            setSegundosRestantes(s => s - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [status, segundosRestantes]);

    // Inicialização
    useEffect(() => {
        if (!isMobile) gerarNovoQR();
    }, [isMobile, gerarNovoQR]);

    if (isMobile) return null;

    return (
        <div className="flex flex-col items-center text-center">
            {/* Header da Seção */}
            <div className="mb-8 flex items-center gap-4">
                <div className="h-[1px] w-8 bg-slate-200" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
                    ACESSO SEGURO QR
                </span>
                <div className="h-[1px] w-8 bg-slate-200" />
            </div>

            {/* Container Central - Estética Premium (Audit v4) */}
            <div className="relative flex items-center justify-center p-6 bg-white/[0.03] backdrop-blur-xl border border-white/5 rounded-[3rem] min-w-[280px] min-h-[280px] shadow-2xl shadow-black/40">
                {status === 'gerando' && (
                    <div className="flex flex-col items-center justify-center gap-5 p-12">
                        <div className="w-12 h-12 border-2 border-red-600/10 border-t-red-600 rounded-full animate-spin" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Sincronizando</span>
                    </div>
                )}

                {status === 'pending' && sessao?.id && (
                    <div className="relative animate-in zoom-in-95 fade-in duration-1000 p-6 bg-white rounded-[2.5rem] shadow-2xl ring-8 ring-white/5 border border-slate-100">
                        <QRCodeSVG
                            value={`${window.location.origin}/auth/qr/${sessao.id}`}
                            size={180}
                            level="H"
                            marginSize={0}
                            fgColor="#000000"
                            bgColor="#ffffff"
                            imageSettings={{
                                src: "/logo-red.png", // Suposição de caminho da logo dark para fundo branco
                                x: undefined,
                                y: undefined,
                                height: 40,
                                width: 40,
                                excavate: true,
                            }}
                        />
                         {/* Foco Visual Neon */}
                        <div className="absolute -inset-1 border-2 border-red-600/10 rounded-[2.7rem] pointer-events-none" />
                    </div>
                )}

                {(status === 'expired' || status === 'erro') && (
                    <div className="flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in-95 p-10">
                        <div className="w-20 h-20 bg-red-600/5 text-red-600 rounded-full flex items-center justify-center border border-red-600/10">
                            <RefreshCw className="w-8 h-8 opacity-50" />
                        </div>
                        <button 
                            onClick={gerarNovoQR}
                            className="px-8 py-3.5 bg-red-600 text-white text-[11px] font-black rounded-2xl hover:bg-red-500 hover:scale-[1.02] transition-all active:scale-95 shadow-lg shadow-red-600/20 uppercase tracking-widest"
                        >
                            Recarregar QR
                        </button>
                    </div>
                )}

                {(status === 'scanned' || status === 'confirmed') && sessao?.usuario && (
                    <div className="w-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-700 py-6">
                        <div className="relative mb-6">
                            <div className="w-28 h-28 p-1 bg-gradient-to-br from-red-600 to-amber-500 rounded-full animate-entry">
                                <div className="w-full h-full bg-[#000a12] rounded-full p-1.5 overflow-hidden">
                                     <Avatar 
                                        nome={sessao.usuario.nome} 
                                        fotoPerfil={sessao.usuario.foto_perfil} 
                                        tamanho="lg"
                                        className="w-full h-full rounded-full"
                                    />
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-lg">
                                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${status === 'confirmed' ? 'bg-emerald-500' : 'bg-red-600 shadow-[0_0_10px_#ef4444] animate-pulse'}`}>
                                    <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <span className="block text-xl font-black text-white tracking-tighter italic uppercase leading-none">
                                {sessao.usuario.nome.split(' ')[0]}
                            </span>
                            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] leading-none">
                                {status === 'confirmed' ? 'Conectado!' : 'Aguardando Aprovação'}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-8 flex flex-col items-center gap-4">
                {status === 'pending' && (
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-3 px-5 py-2.5 bg-white/[0.03] rounded-full border border-white/5 backdrop-blur-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_8px_#ef4444] animate-pulse" />
                            <span className="text-[10px] font-black text-slate-400 tabular-nums uppercase tracking-[0.2em]">
                                Expira em {Math.floor(segundosRestantes / 60)}:{(segundosRestantes % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2">{isMobile ? 'Use o app desktop' : 'Escaneie com o app no celular'}</p>
                    </div>
                )}
                
                {status === 'scanned' && (
                    <div className="flex items-center gap-3 px-6 py-3 bg-red-600/10 text-red-500 rounded-full border border-red-600/20 animate-bounce-slow">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Confirme agora no seu celular</span>
                    </div>
                )}
            </div>
        </div>
    );
}
