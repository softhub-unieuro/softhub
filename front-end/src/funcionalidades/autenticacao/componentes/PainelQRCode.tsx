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

            {/* Apenas o QRCode (Remoção total de decorações conforme pedido) */}
            <div className="relative flex items-center justify-center min-h-[180px]">
                {status === 'gerando' && (
                    <RefreshCw className="w-8 h-8 text-red-500 animate-spin opacity-20" />
                )}

                {status === 'pending' && sessao?.id && (
                    <div className="animate-in fade-in duration-300 p-4 bg-white rounded-2xl">
                        <QRCodeSVG
                            value={`${window.location.origin}/auth/qr/${sessao.id}`}
                            size={240}
                            level="M"
                            marginSize={0}
                            fgColor="#000000"
                            bgColor="#ffffff"
                        />
                    </div>
                )}

                {(status === 'expired' || status === 'erro') && (
                    <button 
                        onClick={gerarNovoQR}
                        className="flex flex-col items-center gap-3 text-red-600 hover:text-red-500 transition-colors"
                    >
                        <RefreshCw className="w-8 h-8" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Recarregar</span>
                    </button>
                )}

                {(status === 'scanned' || status === 'confirmed') && sessao?.usuario && (
                    <div className="flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 py-4">
                        <div className="relative mb-6">
                            <Avatar 
                                nome={sessao.usuario.nome} 
                                fotoPerfil={sessao.usuario.foto_perfil} 
                                tamanho="2xl"
                                className="ring-4 ring-white/10 shadow-2xl"
                            />
                            <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-full shadow-lg">
                                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${status === 'confirmed' ? 'bg-emerald-500' : 'bg-red-600 animate-pulse'}`}>
                                    <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <span className="block text-2xl font-black text-white tracking-tight uppercase">
                                {sessao.usuario.nome}
                            </span>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
                                <span className={`w-1.5 h-1.5 rounded-full ${status === 'confirmed' ? 'bg-emerald-500' : 'bg-red-600 animate-pulse'}`} />
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                                    {status === 'confirmed' ? 'Acesso Confirmado!' : 'Aguardando Dispositivo'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4">
                {status === 'pending' && (
                    <span className="text-[10px] font-black text-slate-700 tabular-nums uppercase tracking-widest">
                        Expira em {Math.floor(segundosRestantes / 60)}:{(segundosRestantes % 60).toString().padStart(2, '0')}
                    </span>
                )}
                
                {status === 'scanned' && (
                    <span className="text-[10px] font-black text-red-600 uppercase animate-pulse">
                        Confirme no celular
                    </span>
                )}
            </div>
        </div>
    );
}
