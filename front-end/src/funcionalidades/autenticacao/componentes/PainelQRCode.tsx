import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, CheckCircle, ShieldCheck } from 'lucide-react';
import { api } from '../../../compartilhado/servicos/api';
import { ambiente } from '../../../configuracoes/ambiente';
import { usarDispositivo } from '../../../compartilhado/hooks/usarDispositivo';
import { Avatar } from '../../../compartilhado/componentes/Avatar';

export default function PainelQRCode() {
    const { isMobile } = usarDispositivo();
    const [sessao, setSessao] = useState<any>(null);
    const [status, setStatus] = useState<'gerando' | 'pending' | 'scanned' | 'confirmed' | 'expired' | 'erro'>('gerando');
    const [segundosRestantes, setSegundosRestantes] = useState(120);

    const gerarNovoQR = async () => {
        setStatus('gerando');
        try {
            const res = await api.post('/api/auth/qr/gerar');
            setSessao(res.data);
            setStatus('pending');
            setSegundosRestantes(120);
        } catch (e) {
            setStatus('erro');
        }
    };

    useEffect(() => {
        gerarNovoQR();
    }, []);

    // Timer de expiração
    useEffect(() => {
        if (status !== 'pending' && status !== 'scanned') return;
        
        if (segundosRestantes <= 0) {
            setStatus('expired');
            return;
        }

        const timer = setInterval(() => {
            setSegundosRestantes(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [status, segundosRestantes]);

    // Polling / Stream de status
    useEffect(() => {
        if (!sessao?.id || status === 'confirmed' || status === 'expired') return;

        let eventSource: EventSource | null = null;
        
        const conectarStream = () => {
            const url = `${ambiente.apiUrl}/api/auth/qr/status/${sessao.id}`;
            eventSource = new EventSource(url);

            eventSource.onmessage = (e) => {
                const data = JSON.parse(e.data);
                
                if (data.status === 'scanned') {
                    setStatus('scanned');
                    setSessao((prev: any) => ({ ...prev, usuario: data.usuario }));
                }
                
                if (data.status === 'confirmed') {
                    setStatus('confirmed');
                    // Salva token e redireciona (a lógica de login real aqui)
                    localStorage.setItem('token_acesso', data.token);
                    setTimeout(() => window.location.href = '/app/dashboard', 1000);
                }
            };

            eventSource.onerror = () => {
                eventSource?.close();
            };
        };

        conectarStream();
        return () => eventSource?.close();
    }, [sessao?.id, status]);

    return (
        <div className="flex flex-col items-center text-center">
            {/* Header da Seção */}
            <div className="mb-10 flex items-center gap-4">
                <div className="h-[1px] w-8 bg-slate-200" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">
                    Security Gateway
                </span>
                <div className="h-[1px] w-8 bg-slate-200" />
            </div>

            {/* Centro de Comando QR (Estética Dark Hub) */}
            <div className="relative flex flex-col items-center justify-center p-10 bg-slate-950 border border-white/5 rounded-[3.5rem] min-w-[340px] shadow-2xl overflow-hidden group">
                
                {/* Glow de Background */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-600/10 blur-[80px] pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-600/5 blur-[80px] pointer-events-none" />

                <div className="relative z-10 w-full flex flex-col items-center">
                    {status === 'gerando' && (
                        <div className="flex flex-col items-center justify-center gap-6 py-12">
                            <RefreshCw className="w-10 h-10 text-red-600 animate-spin opacity-40" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse">Iniciando Hub...</span>
                        </div>
                    )}

                    {status === 'pending' && sessao?.id && (
                        <div className="flex flex-col items-center animate-in zoom-in-95 duration-700">
                            <div className="relative p-6 bg-white rounded-[2.8rem] shadow-2xl ring-8 ring-white/5 border border-slate-100 flex items-center justify-center transition-all duration-500 hover:scale-105 active:scale-95">
                                <QRCodeSVG
                                    value={`${window.location.origin}/auth/qr/${sessao.id}`}
                                    size={180}
                                    level="H"
                                    marginSize={0}
                                    fgColor="#000000"
                                    bgColor="#ffffff"
                                />
                                 {/* Mira Laser Decorativa */}
                                <div className="absolute -inset-0 border-2 border-red-600/10 rounded-[2.8rem] pointer-events-none" />
                            </div>
                            
                            <div className="mt-8">
                                <div className="flex items-center gap-3 px-5 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm shadow-inner group-hover:border-red-600/20 transition-colors">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_8px_#ef4444] animate-pulse" />
                                    <span className="text-[10px] font-black text-slate-400 tabular-nums tracking-widest uppercase">
                                        Expira em {Math.floor(segundosRestantes / 60)}:{(segundosRestantes % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {(status === 'expired' || status === 'erro') && (
                        <div className="flex flex-col items-center justify-center gap-6 py-12 animate-in slide-in-from-bottom-5">
                            <div className="w-20 h-20 bg-red-600/10 text-red-500 rounded-full flex items-center justify-center border border-red-600/20">
                                <RefreshCw className="w-8 h-8 opacity-40" />
                            </div>
                            <button 
                                onClick={gerarNovoQR}
                                className="px-10 py-4 bg-red-600 text-white text-[11px] font-black rounded-2xl hover:bg-red-500 hover:scale-105 transition-all active:scale-95 shadow-xl shadow-red-600/30 uppercase tracking-widest"
                            >
                                Recarregar Token
                            </button>
                        </div>
                    )}

                    {(status === 'scanned' || status === 'confirmed') && sessao?.usuario && (
                        <div className="w-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-700 py-6">
                            <div className="relative mb-8">
                                <div className="w-32 h-32 p-1.5 bg-gradient-to-br from-red-600 to-amber-500 rounded-[2.5rem] shadow-2xl overflow-hidden self-center animate-pulse">
                                    <div className="w-full h-full bg-[#000a12] rounded-[2.2rem] p-1 overflow-hidden">
                                        <Avatar 
                                            nome={sessao.usuario.nome} 
                                            fotoPerfil={sessao.usuario.foto_perfil} 
                                            tamanho="full"
                                            className="w-full h-full rounded-[2.2rem]"
                                        />
                                    </div>
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-2xl">
                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${status === 'confirmed' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-600 animate-pulse shadow-[0_0_10px_#ef4444]'}`}>
                                        <CheckCircle className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                            </div>
                            <div className="text-center space-y-4">
                                <div className="space-y-1">
                                    <span className="block text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] leading-none">Identidade Confirmada</span>
                                    <span className="block text-2xl font-black text-white tracking-tighter truncate max-w-[240px] uppercase italic">
                                        {sessao.usuario.nome.split(' ')[0]}
                                    </span>
                                </div>
                                
                                <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-white/5 rounded-full border border-white/10 shadow-inner">
                                    <span className={`w-2 h-2 rounded-full ${status === 'confirmed' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-600 animate-pulse shadow-[0_0_10px_#ef4444]'}`} />
                                    <span className="text-[11px] text-white font-black uppercase tracking-widest whitespace-nowrap">
                                        {status === 'confirmed' ? 'Autorizado!' : 'Confirme no celular'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="mt-8 flex items-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default">
                 <ShieldCheck className="text-red-600" size={14} />
                 <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Conexão Criptografada Ponto-a-Ponto</span>
            </div>
        </div>
    );
}
