import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, CheckCircle, ShieldCheck } from 'lucide-react';
import { api } from '../../../compartilhado/servicos/api';
import { ambiente } from '../../../configuracoes/ambiente';
import { Avatar } from '../../../compartilhado/componentes/Avatar';
import { usarAutenticacao } from '../../../contexto/ContextoAutenticacao';

/**
 * Painel de QR Code para autenticação rápida (Checklist Part 2).
 * Permite que usuários já autenticados no celular entrem no computador instantaneamente.
 */
export default function PainelQRCode() {
    const { entrar } = usarAutenticacao();
    const [sessaoAtiva, setSessaoAtiva] = useState<any>(null);
    const [estado, setEstado] = useState<'gerando' | 'pendente' | 'scaneado' | 'confirmado' | 'expirado' | 'erro'>('gerando');
    const [segundosRestantes, setSegundosRestantes] = useState(180);

    /**
     * Gera um novo token de QR Code no backend.
     */
    const gerarNovoQR = useCallback(async () => {
        setEstado('gerando');
        try {
            const resposta = await api.post('/api/auth/qr/gerar');
            if (resposta.data?.sessaoId) {
                setSessaoAtiva(resposta.data);
                setEstado('pendente');
                setSegundosRestantes(180);
            }
        } catch (erro) {
            setEstado('erro');
        }
    }, []);

    useEffect(() => {
        gerarNovoQR();
    }, [gerarNovoQR]);

    // Timer de expiração do QR Code
    useEffect(() => {
        const precisaDeTimer = estado === 'pendente' || estado === 'scaneado';
        if (!precisaDeTimer) return;
        
        if (segundosRestantes <= 0) {
            setEstado('expirado');
            return;
        }

        const cronometro = setInterval(() => {
            setSegundosRestantes(prev => prev - 1);
        }, 1000);

        return () => clearInterval(cronometro);
    }, [estado, segundosRestantes]);

    /**
     * Canal SSE para monitorar o status do QR Code em tempo real.
     */
    useEffect(() => {
        if (!sessaoAtiva?.sessaoId || estado === 'confirmado' || estado === 'expirado') return;

        let fonteEventos: EventSource | null = null;
        const url = `${ambiente.apiUrl}/api/auth/qr/stream/${sessaoAtiva.sessaoId}`;
        
        try {
            fonteEventos = new EventSource(url);

            fonteEventos.onmessage = (evento) => {
                const dados = JSON.parse(evento.data);
                
                if (dados.status === 'scanned') {
                    setEstado('scaneado');
                    setSessaoAtiva((prev: any) => ({ ...prev, usuario: dados.usuario }));
                }
                
                if (dados.status === 'confirmed') {
                    setEstado('confirmado');
                    
                    // Armazena tokens para garantir persistência após o reload
                    if (dados.refreshToken) localStorage.setItem('softhub_refresh_token', dados.refreshToken);
                    localStorage.setItem('softhub_token', dados.token);
                    if (dados.usuario) localStorage.setItem('softhub_usuario', JSON.stringify(dados.usuario));
                    
                    // Sincroniza com o contexto global
                    entrar(dados.usuario, dados.token);
                    
                    // Redirecionamento suave após 1 segundo
                    setTimeout(() => {
                        window.location.href = '/app/dashboard';
                    }, 1000);
                }
                
                if (dados.status === 'expired') {
                    setEstado('expirado');
                }
            };

            fonteEventos.onerror = () => {
                fonteEventos?.close();
            };
        } catch (erro) {
            console.error('[QR] Erro na conexão de stream:', erro);
        }

        return () => {
            if (fonteEventos) fonteEventos.close();
        };
    }, [sessaoAtiva?.sessaoId, estado, entrar]);

    return (
        <div className="flex flex-col items-center">
            {/* Divisor de Estilo */}
            <div className="mb-8 flex items-center gap-4 opacity-50">
                <div className="h-[1px] w-6 bg-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] whitespace-nowrap">
                    Padrão de Segurança
                </span>
                <div className="h-[1px] w-6 bg-slate-400" />
            </div>

            <div className="relative flex flex-col items-center justify-center min-h-[220px]">
                {estado === 'gerando' && (
                    <RefreshCw className="w-10 h-10 text-blue-600/40 animate-spin" />
                )}

                {estado === 'pendente' && sessaoAtiva?.sessaoId && (
                    <div className="flex flex-col items-center animate-in zoom-in-95 duration-500">
                        <QRCodeSVG
                            value={`${window.location.origin}/auth/qr/${sessaoAtiva.sessaoId}`}
                            size={220}
                            level="H"
                            marginSize={0}
                            fgColor="#000000"
                            bgColor="transparent"
                        />
                        
                        <div className="mt-8">
                            <span className="px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200 text-[10px] font-black text-slate-500 tabular-nums tracking-widest uppercase italic">
                                Expira em {Math.floor(segundosRestantes / 60)}:{(segundosRestantes % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    </div>
                )}

                {(estado === 'expirado' || estado === 'erro') && (
                    <button 
                        onClick={gerarNovoQR}
                        className="p-8 flex flex-col items-center gap-3 text-blue-600 hover:scale-105 transition-all"
                    >
                        <RefreshCw className="w-10 h-10" />
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Recarregar QR</span>
                    </button>
                )}

                {(estado === 'scaneado' || estado === 'confirmado') && sessaoAtiva?.usuario && (
                    <div className="w-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-700">
                        <div className="relative mb-6">
                            <Avatar 
                                nome={sessaoAtiva.usuario.nome} 
                                fotoPerfil={sessaoAtiva.usuario.foto_perfil} 
                                tamanho="xl"
                                className="ring-8 ring-slate-50 shadow-2xl"
                            />
                            <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-lg ${estado === 'confirmado' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-blue-600 animate-pulse shadow-[0_0_10px_#2563eb]'}`}>
                                <CheckCircle className="w-4 h-4 text-white" strokeWidth={3} />
                            </div>
                        </div>
                        <div className="text-center space-y-3">
                            <span className="block text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Identificado</span>
                            <span className="block text-2xl font-black text-slate-900 tracking-tighter truncate max-w-[200px] uppercase italic">
                                {sessaoAtiva.usuario.nome.split(' ')[0]}
                            </span>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="mt-10 flex items-center gap-2 opacity-30">
                 <ShieldCheck className="text-blue-600" size={14} />
                 <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Gateway UNIEURO de Auditoria Ativo</span>
            </div>
        </div>
    );
}

