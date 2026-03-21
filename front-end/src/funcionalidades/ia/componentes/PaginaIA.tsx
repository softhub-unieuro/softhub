import { useState } from 'react';
import { Sparkles, Brain, Bot, Send, MessageSquare, Zap, ShieldCheck, History, ArrowRight } from 'lucide-react';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { usarIA } from '../hooks/usarIA';
import { Carregando } from '@/compartilhado/componentes/Carregando';

/**
 * HUB DE INTELIGÊNCIA ARTIFICIAL (Mission Control)
 * Centraliza as ferramentas de LLM do Cloudflare Workers AI.
 */
export default function PaginaIA() {
    const { carregando, aprimorarTarefa, refinarAviso, sugerirPrioridade } = usarIA();
    const [inputTarefa, setInputTarefa] = useState({ titulo: '', descricao: '' });
    const [inputAviso, setInputAviso] = useState('');
    const [resultado, setResultado] = useState<string | null>(null);
    const [ferramentaAtiva, setFerramentaAtiva] = useState<'tarefa' | 'aviso' | 'prioridade'>('tarefa');

    const handleAprimorar = async () => {
        if (!inputTarefa.titulo || !inputTarefa.descricao) return;
        const res = await aprimorarTarefa(inputTarefa.titulo, inputTarefa.descricao);
        setResultado(res.descricao);
    };

    const handleRefinarAviso = async () => {
        if (!inputAviso) return;
        const res = await refinarAviso(inputAviso);
        setResultado(res.conteudo);
    };

    const handleSugerirPrioridade = async () => {
        const texto = inputTarefa.titulo + ' ' + inputTarefa.descricao;
        if (!texto.trim()) return;
        const res = await sugerirPrioridade(texto);
        setResultado(`Sugestão de Prioridade: ${res.prioridade.toUpperCase()}\n\nMotivo: ${res.motivo}`);
    };

    return (
        <div className="flex flex-col h-full space-y-8 animar-entrada pb-10 max-w-7xl mx-auto w-full">
            <CabecalhoFuncionalidade
                titulo="Assistente de Inteligência"
                subtitulo="Superpoderes de linguagem natural para acelerar a gestão da Fábrica."
                icone={Sparkles}
            >
                <div className="flex items-center gap-4 bg-primary/5 px-4 py-2 rounded-full border border-primary/20">
                    <Zap size={14} className="text-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Cota: 50 / Dia</span>
                </div>
            </CabecalhoFuncionalidade>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Menu de Ferramentas (Esquerda) */}
                <div className="lg:col-span-4 space-y-4">
                    <button 
                        onClick={() => { setFerramentaAtiva('tarefa'); setResultado(null); }}
                        className={`w-full text-left p-5 rounded-[28px] border transition-all duration-500 overflow-hidden relative group ${ferramentaAtiva === 'tarefa' ? 'bg-primary border-primary shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-card/40 border-border/40 hover:bg-card/60 hover:border-primary/30'}`}
                    >
                        <div className={`flex items-center gap-4 ${ferramentaAtiva === 'tarefa' ? 'text-primary-foreground' : 'text-foreground'}`}>
                            <div className={`p-2.5 rounded-2xl ${ferramentaAtiva === 'tarefa' ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                                <Brain size={20} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest">Refinar Tarefa</h4>
                                <p className={`text-[10px] mt-0.5 font-medium opacity-60`}>Aprimora títulos e descrições técnicas.</p>
                            </div>
                        </div>
                    </button>

                    <button 
                        onClick={() => { setFerramentaAtiva('aviso'); setResultado(null); }}
                        className={`w-full text-left p-5 rounded-[28px] border transition-all duration-500 overflow-hidden relative group ${ferramentaAtiva === 'aviso' ? 'bg-primary border-primary shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-card/40 border-border/40 hover:bg-card/60 hover:border-primary/30'}`}
                    >
                        <div className={`flex items-center gap-4 ${ferramentaAtiva === 'aviso' ? 'text-primary-foreground' : 'text-foreground'}`}>
                            <div className={`p-2.5 rounded-2xl ${ferramentaAtiva === 'aviso' ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                                <MessageSquare size={20} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest">Profissionalizar Aviso</h4>
                                <p className={`text-[10px] mt-0.5 font-medium opacity-60`}>Transforma rascunhos em alertas oficiais.</p>
                            </div>
                        </div>
                    </button>

                    <button 
                        onClick={() => { setFerramentaAtiva('prioridade'); setResultado(null); }}
                        className={`w-full text-left p-5 rounded-[28px] border transition-all duration-500 overflow-hidden relative group ${ferramentaAtiva === 'prioridade' ? 'bg-primary border-primary shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-card/40 border-border/40 hover:bg-card/60 hover:border-primary/30'}`}
                    >
                        <div className={`flex items-center gap-4 ${ferramentaAtiva === 'prioridade' ? 'text-primary-foreground' : 'text-foreground'}`}>
                            <div className={`p-2.5 rounded-2xl ${ferramentaAtiva === 'prioridade' ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest">Sugerir Prioridade</h4>
                                <p className={`text-[10px] mt-0.5 font-medium opacity-60`}>Análise de impacto e urgência automática.</p>
                            </div>
                        </div>
                    </button>

                    <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-[32px] mt-8">
                        <div className="flex items-center gap-2 mb-2 text-emerald-500">
                            <Bot size={14} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sustentabilidade</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 leading-relaxed font-medium">
                            O uso da IA é processado localmente no Cloudflare da Fábrica. Sua cota é renovada a cada 24h para garantir acesso a todos.
                        </p>
                    </div>
                </div>

                {/* Área de Trabalho (Direita) */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="card-glass p-8 min-h-[400px] flex flex-col">
                        <div className="flex-1">
                            {ferramentaAtiva === 'tarefa' && (
                                <div className="space-y-6 animar-entrada">
                                    <h3 className="text-lg font-black text-foreground uppercase tracking-tighter">Aprimoramento de Card</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-muted-foreground/40 uppercase ml-1">Título Provisório</label>
                                            <input 
                                                value={inputTarefa.titulo}
                                                onChange={e => setInputTarefa(prev => ({ ...prev, titulo: e.target.value }))}
                                                placeholder="Ex: Criar login novo"
                                                className="w-full bg-muted/20 border border-border/40 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-primary/50 transition-all font-medium"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-muted-foreground/40 uppercase ml-1">Descrição do Requisito</label>
                                            <textarea 
                                                rows={5}
                                                value={inputTarefa.descricao}
                                                onChange={e => setInputTarefa(prev => ({ ...prev, descricao: e.target.value }))}
                                                placeholder="Descreva o que deve ser feito com suas palavras..."
                                                className="w-full bg-muted/20 border border-border/40 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-primary/50 transition-all font-medium resize-none"
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleAprimorar}
                                        disabled={carregando || !inputTarefa.titulo}
                                        className="mt-4 px-8 py-3.5 bg-primary text-primary-foreground rounded-2xl flex items-center gap-3 text-[11px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 transition-all disabled:opacity-50"
                                    >
                                        {carregando ? <Carregando Centralizar={false} tamanho="sm" /> : <Sparkles size={16} />}
                                        <span>Processar com IA</span>
                                    </button>
                                </div>
                            )}

                            {ferramentaAtiva === 'aviso' && (
                                <div className="space-y-6 animar-entrada">
                                    <h3 className="text-lg font-black text-foreground uppercase tracking-tighter">Refino de Comunicação</h3>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-muted-foreground/40 uppercase ml-1">Rascunho do Comunicado</label>
                                        <textarea 
                                            rows={8}
                                            value={inputAviso}
                                            onChange={e => setInputAviso(e.target.value)}
                                            placeholder="Ex: Galera, amanhã o sistema vai cair das 14h às 15h pra manutenção geral..."
                                            className="w-full bg-muted/20 border border-border/40 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-primary/50 transition-all font-medium resize-none"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleRefinarAviso}
                                        disabled={carregando || !inputAviso}
                                        className="mt-4 px-8 py-3.5 bg-primary text-primary-foreground rounded-2xl flex items-center gap-3 text-[11px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 transition-all disabled:opacity-50"
                                    >
                                        {carregando ? <Carregando Centralizar={false} tamanho="sm" /> : <MessageSquare size={16} />}
                                        <span>Transformar em Aviso Profissional</span>
                                    </button>
                                </div>
                            )}

                            {ferramentaAtiva === 'prioridade' && (
                                <div className="space-y-6 animar-entrada">
                                    <h3 className="text-lg font-black text-foreground uppercase tracking-tighter">Motor de Priorização</h3>
                                    <p className="text-xs text-muted-foreground/60">Utilize o campo de tarefa acima para carregar os dados primeiro.</p>
                                    <button 
                                        onClick={handleSugerirPrioridade}
                                        disabled={carregando || !inputTarefa.titulo}
                                        className="mt-4 px-8 py-3.5 bg-primary text-primary-foreground rounded-2xl flex items-center gap-3 text-[11px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 transition-all disabled:opacity-50"
                                    >
                                        {carregando ? <Carregando Centralizar={false} tamanho="sm" /> : <ShieldCheck size={16} />}
                                        <span>Analisar Gravidade</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Resultado */}
                        {resultado && (
                            <div className="mt-8 border-t border-border/40 pt-8 animar-entrada animate-in fade-in zoom-in-95 duration-500">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                        <ShieldCheck size={14} />
                                    </div>
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Resultado Sugerido</h5>
                                </div>
                                <div className="bg-muted/10 border border-border/40 rounded-2xl p-6 font-medium text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap select-all selection:bg-primary/20">
                                    {resultado}
                                </div>
                                <div className="mt-4 flex gap-3 text-[9px] font-black uppercase text-muted-foreground/40">
                                    <span>Pressione CTRL+C para copiar</span>
                                    <span>•</span>
                                    <button onClick={() => setResultado(null)} className="hover:text-primary transition-colors uppercase">Limpar</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer / Info */}
                    <div className="flex items-center justify-between px-4 text-muted-foreground/30">
                        <div className="flex items-center gap-1.5">
                            <History size={12} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Registrado nos Logs de Auditoria</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
