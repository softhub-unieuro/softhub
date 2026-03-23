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
                        localStorage.setItem('token_acesso', data.token);
                        
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

            {/* Container Central */}
            <div className="relative group transition-all duration-700">
                <div className="relative flex items-center justify-center p-4 bg-white rounded-[2rem] border-4 border-slate-50 shadow-sm overflow-hidden min-h-[240px]">
                    
                    {status === 'gerando' && (
                        <div className="w-[200px] h-[200px] flex flex-col items-center justify-center gap-4">
                            <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando</span>
                        </div>
                    )}

                    {status === 'pending' && sessao?.id && (
                        <div className="relative animate-in zoom-in duration-700">
                            <QRCodeSVG
                                value={`${window.location.origin}/auth/qr/${sessao.id}`}
                                size={200}
                                level="H"
                                marginSize={0}
                                fgColor="#0f172a"
                            />
                            <div className="absolute inset-0 border border-slate-100 opacity-20 pointer-events-none" />
                        </div>
                    )}

                    {(status === 'expired' || status === 'erro') && (
                        <div className="w-[200px] h-[200px] flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in">
                            <div className="p-4 bg-red-50 text-red-600 rounded-full">
                                <RefreshCw className="w-8 h-8" />
                            </div>
                            <button 
                                onClick={gerarNovoQR}
                                className="px-5 py-2.5 bg-red-600 text-white text-[11px] font-black rounded-xl hover:bg-red-700 transition-all active:scale-95 shadow-md shadow-red-200"
                            >
                                RECARREGAR QR
                            </button>
                        </div>
                    )}

                    {(status === 'scanned' || status === 'confirmed') && sessao?.usuario && (
                        <div className="w-[200px] h-auto flex flex-col items-center justify-center animate-in zoom-in duration-500 py-4">
                            <div className="relative mb-4">
                                <Avatar 
                                    nome={sessao.usuario.nome} 
                                    fotoPerfil={sessao.usuario.foto_perfil} 
                                    tamanho="2xl"
                                />
                                <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm">
                                    <div className={`h-4 w-4 rounded-full flex items-center justify-center ${status === 'confirmed' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}>
                                        <CheckCircle className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                            </div>
                            <div className="text-center">
                                <span className="block text-sm font-black text-slate-900 truncate max-w-[180px]">
                                    {sessao.usuario.nome}
                                </span>
                                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                                    {status === 'confirmed' ? 'Conectado!' : 'Escaneado! Confirme no app'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex flex-col items-center gap-3">
                    {status === 'pending' && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-600 tabular-nums">
                                EXPIRA EM {Math.floor(segundosRestantes / 60)}:{(segundosRestantes % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    )}
                    
                    {status === 'scanned' && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 animate-bounce">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase">Confirmar no celular agora</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

