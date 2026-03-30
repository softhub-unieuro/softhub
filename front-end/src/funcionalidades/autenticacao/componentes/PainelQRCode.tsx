import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, CheckCircle, ShieldCheck } from 'lucide-react';
import { api } from '../../../compartilhado/servicos/api';
import { ambiente } from '../../../configuracoes/ambiente';
import { Avatar } from '../../../compartilhado/componentes/Avatar';

/**
 * Painel de QR Code (Versão Clean - Sem Fundo Preto).
 * Removi o container escuro e mantive apenas a lógica e o status.
 */
export default function PainelQRCode() {
    const [sessao, setSessao] = useState<any>(null);
    const [status, setStatus] = useState<'gerando' | 'pending' | 'scanned' | 'confirmed' | 'expired' | 'erro'>('gerando');
    const [segundosRestantes, setSegundosRestantes] = useState(180);

    const gerarNovoQR = async () => {
        setStatus('gerando');
        try {
            const res = await api.post('/api/auth/qr/gerar');
            if (res.data?.sessaoId) {
                setSessao(res.data);
                setStatus('pending');
                setSegundosRestantes(180);
            }
        } catch (e) {
            setStatus('erro');
        }
    };

    useEffect(() => {
        gerarNovoQR();
    }, []);

    useEffect(() => {
        if (status !== 'pending' && status !== 'scanned') return;
        if (segundosRestantes <= 0) { setStatus('expired'); return; }
        const timer = setInterval(() => setSegundosRestantes(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [status, segundosRestantes]);

    // Polling / Stream de status
    useEffect(() => {
        if (!sessao?.sessaoId || status === 'confirmed' || status === 'expired') return;

        let eventSource: EventSource | null = null;
        const url = `${ambiente.apiUrl}/api/auth/qr/stream/${sessao.sessaoId}`;
        eventSource = new EventSource(url);

        eventSource.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.status === 'scanned') {
                setStatus('scanned');
                setSessao((prev: any) => ({ ...prev, usuario: data.usuario }));
            }
            if (data.status === 'confirmed') {
                setStatus('confirmed');
                localStorage.setItem('softhub_token', data.token);
                if (data.refreshToken) localStorage.setItem('softhub_refresh_token', data.refreshToken);
                if (data.usuario) localStorage.setItem('softhub_usuario', JSON.stringify(data.usuario));
                setTimeout(() => window.location.href = '/app/dashboard', 1000);
            }
            if (data.status === 'expired') setStatus('expired');
        };

        return () => eventSource?.close();
    }, [sessao?.sessaoId, status]);

    return (
        <div className="flex flex-col items-center">
            {/* Header Hub Minimalista */}
            <div className="mb-8 flex items-center gap-4 opacity-50">
                <div className="h-[1px] w-6 bg-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] whitespace-nowrap">
                    Padrão de Segurança
                </span>
                <div className="h-[1px] w-6 bg-slate-400" />
            </div>

            <div className="relative flex flex-col items-center justify-center min-h-[220px]">
                {status === 'gerando' && (
                    <RefreshCw className="w-10 h-10 text-blue-600/40 animate-spin" />
                )}

                {status === 'pending' && sessao?.sessaoId && (
                    <div className="flex flex-col items-center animate-in zoom-in-95 duration-500">
                        {/* QR CODE PURO (Sem bordas pretas ou molduras barulhentas) */}
                        <QRCodeSVG
                            value={`${window.location.origin}/auth/qr/${sessao.sessaoId}`}
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

                {(status === 'expired' || status === 'erro') && (
                    <button 
                        onClick={gerarNovoQR}
                        className="p-8 flex flex-col items-center gap-3 text-blue-600 hover:scale-105 transition-all"
                    >
                        <RefreshCw className="w-10 h-10" />
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Recarregar QR</span>
                    </button>
                )}

                {(status === 'scanned' || status === 'confirmed') && sessao?.usuario && (
                    <div className="w-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-700">
                        <div className="relative mb-6">
                            <Avatar 
                                nome={sessao.usuario.nome} 
                                fotoPerfil={sessao.usuario.foto_perfil} 
                                tamanho="xl"
                                className="ring-8 ring-slate-50 shadow-2xl"
                            />
                            <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-lg ${status === 'confirmed' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-blue-600 animate-pulse shadow-[0_0_10px_#2563eb]'}`}>
                                <CheckCircle className="w-4 h-4 text-white" strokeWidth={3} />
                            </div>
                        </div>
                        <div className="text-center space-y-3">
                            <span className="block text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Identificado</span>
                            <span className="block text-2xl font-black text-slate-900 tracking-tighter truncate max-w-[200px] uppercase italic">
                                {sessao.usuario.nome.split(' ')[0]}
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
