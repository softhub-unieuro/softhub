import { Hono } from 'hono';
import { Env } from '../index';
import { registrarLog } from '../servicos/servico-logs';
import { autenticacaoRequerida } from '../middleware/auth';
import { log } from '../utilitarios/logger';
import { QrAuthService } from '../servicos/qr-auth.service';

/**
 * Rota de Autenticação via QR Code (Auditoria Part 2).
 * Permite transferência de sessão segura entre dispositivos.
 */
const rotasAuthQr = new Hono<{ Bindings: Env }>();

// ── 1. Gerar Novo QR (Público, Rate Limited) ───────────────────────────────────────────
rotasAuthQr.post('/qr/gerar', async (c) => {
    try {
        const { token, expiresAt } = await QrAuthService.generateQrToken(c);
        return c.json({ sessaoId: token, expiraEm: expiresAt });
    } catch (err: any) {
        log('error', '[QR-AUTH] Falha ao gerar token', { erro: err?.message });
        return c.json({ erro: 'Não foi possível gerar o código de acesso.', detalhe: err.message }, 500);
    }
});

// ── 2. Fluxo SSE: Monitoramento de Status (Checklist Part 2) ───────────────────────────
rotasAuthQr.get('/qr/stream/:token', async (c) => {
    const token = c.req.param('token');
    const { DB } = c.env;

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const enviar = (dados: any) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(dados)}\n\n`));
                } catch { /* Ignora se stream fechado */ }
            };

            let encerrar = false;
            let ultimaStatus = '';

            // Heartbeat para manter conexão viva (Audit Checklist)
            const heartbeat = setInterval(() => {
                if (!encerrar) controller.enqueue(encoder.encode(': heartbeat\n\n'));
            }, 30000);

            const interval = setInterval(async () => {
                if (encerrar) {
                    clearInterval(interval);
                    clearInterval(heartbeat);
                    return;
                }

                try {
                    const sessao = await QrAuthService.getQrTokenStatus(c, token);
                    
                    if (!sessao) {
                        enviar({ status: 'expired' });
                        encerrar = true;
                        controller.close();
                        return;
                    }

                    if (sessao.status !== ultimaStatus) {
                        ultimaStatus = sessao.status;
                        
                        if (sessao.status === 'confirmed') {
                            const usuario = await DB.prepare('SELECT id, nome, email, role, foto_perfil FROM usuarios WHERE id = ?').bind(sessao.user_id).first();
                            
                            enviar({ 
                                status: 'confirmed', 
                                token: sessao.jwt_token, 
                                refreshToken: sessao.refresh_token,
                                usuario 
                            });
                            
                            await QrAuthService.markAsUsed(c, token);
                            encerrar = true;
                            controller.close();
                        } else if (sessao.status === 'scanned') {
                            const usuario = await DB.prepare('SELECT id, nome, email, role, foto_perfil FROM usuarios WHERE id = ?').bind(sessao.user_id).first();
                            enviar({ status: 'scanned', usuario });
                        } else {
                            enviar({ status: sessao.status });
                        }
                    }
                } catch (e) {
                    encerrar = true;
                    clearInterval(interval);
                    clearInterval(heartbeat);
                    try { controller.error(e); } catch {}
                }
            }, 1000);

            c.req.raw.signal.addEventListener('abort', () => {
                encerrar = true;
                clearInterval(interval);
                clearInterval(heartbeat);
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        }
    });
});

// ── 3. Confirmar Scanneamento (Mobile Logado) ─────────────────────────────────────────
rotasAuthQr.post('/qr/identificar', autenticacaoRequerida(), async (c) => {
    const { sessaoId } = await c.req.json();
    const usuario = c.get('usuario' as any) as any;

    try {
        const sucesso = await QrAuthService.identifyQrScan(c, sessaoId, usuario.id);
        
        if (sucesso) return c.json({ sucesso: true });
        return c.json({ erro: 'QR Code expirado ou inválido.' }, 404);
    } catch {
        return c.json({ erro: 'Falha na identificação do dispositivo.' }, 500);
    }
});

// ── 4. Autorizar Login (Mobile Logado) ────────────────────────────────────────────────
rotasAuthQr.post('/qr/autorizar', autenticacaoRequerida(), async (c) => {
    const { DB } = c.env;
    const { sessaoId } = await c.req.json();
    const usuario = c.get('usuario' as any) as any;

    try {
        const sucesso = await QrAuthService.confirmQrLogin(c, sessaoId, usuario);
        
        if (sucesso) {
            await registrarLog(DB, {
                usuarioId: usuario.id,
                acao: 'LOGIN_QR_CONFIRMADO',
                modulo: 'auth',
                descricao: `Sessão via QR Code autorizada e transmitida com sucesso`,
                ip: c.req.header('CF-Connecting-IP') ?? 'unknown'
            });
            return c.json({ sucesso: true });
        }
        
        return c.json({ erro: 'Não foi possível confirmar o login. O QR Code pode ter expirado.' }, 400);
    } catch (err: any) {
        return c.json({ erro: 'Erro interno ao processar autorização.' }, 500);
    }
});

export default rotasAuthQr;