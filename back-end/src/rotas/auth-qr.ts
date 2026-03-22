import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { Env } from '../index';
import { registrarLog } from '../servicos/servico-logs';
import { autenticacaoRequerida } from '../middleware/auth';
import { log } from '../utilitarios/logger';

const rotasAuthQr = new Hono<{ Bindings: Env }>();

// Interface para os dados no KV
interface SessaoQrKV {
    status: 'pendente' | 'identificado' | 'autorizado' | 'consumido' | 'expirado';
    usuario_id?: string;
    token_acesso?: string;
    ip_origem: string;
    user_agent: string;
    criado_em: string;
}

const chaveQr = (id: string) => `qr_sessao:${id}`;

// ── QR Code: Gerar Sessão (KV) ─────────────────────────────────────────────────────
rotasAuthQr.post('/qr/gerar', async (c) => {
    const { softhub_kv } = c.env;
    
    if (!softhub_kv) {
        log('error', '[QR-AUTH] Erro crítico: Binding softhub_kv não encontrado no ambiente.');
        return c.json({ erro: 'O servidor de cache (KV) não está configurado corretamente.' }, 500);
    }

    const sessaoId = crypto.randomUUID();
    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + 1000 * 60).toISOString(); // 60 segundos (mínimo KV)

    const dados: SessaoQrKV = {
        status: 'pendente',
        ip_origem: c.req.header('CF-Connecting-IP') ?? 'desconhecido',
        user_agent: c.req.header('User-Agent') ?? 'desconhecido',
        criado_em: agora.toISOString()
    };

    try {
        // Salva no KV com TTL de 60 segundos (mínimo exigido pelo Cloudflare KV)
        await softhub_kv.put(chaveQr(sessaoId), JSON.stringify(dados), { expirationTtl: 60 });
        return c.json({ sessaoId, expiraEm });
    } catch (err: any) {
        log('error', '[QR-AUTH] Erro ao gerar sessão', { erro: err.message, stack: err.stack });
        return c.json({ 
            erro: 'Erro ao gerar sessão de login.', 
            detalhe: err.message 
        }, 500);
    }
});

// ── QR Code: Verificar Status (KV + D1 para dados do usuário) ─────────────────────────────────────────────────
rotasAuthQr.get('/qr/verificar/:id', async (c) => {
    const { softhub_kv, DB } = c.env;
    const id = c.req.param('id');

    try {
        const resSessao = await softhub_kv.get(chaveQr(id));
        if (!resSessao) {
            return c.json({ status: 'expirado' });
        }

        const sessao = JSON.parse(resSessao) as SessaoQrKV;

        if (sessao.status === 'identificado' && sessao.usuario_id) {
            const usuario = await DB.prepare(
                'SELECT id, nome, email, role, foto_perfil FROM usuarios WHERE id = ?'
            )
                .bind(sessao.usuario_id)
                .first();

            return c.json({
                status: 'identificado',
                usuario
            });
        }

        if (sessao.status === 'autorizado' && sessao.usuario_id) {
            const usuario = await DB.prepare(
                'SELECT id, nome, email, role, foto_perfil FROM usuarios WHERE id = ?'
            )
                .bind(sessao.usuario_id)
                .first();

            // Consome a sessão no KV para não permitir reuso
            sessao.status = 'consumido';
            await softhub_kv.put(chaveQr(id), JSON.stringify(sessao), { expirationTtl: 60 });

            return c.json({
                status: 'autorizado',
                token: sessao.token_acesso,
                usuario
            });
        }

        return c.json({ status: sessao.status });
    } catch (err: any) {
        log('error', '[QR-AUTH] Erro ao verificar status', { erro: err.message, sessaoId: id });
        return c.json({ erro: 'Erro ao verificar status da sessão.' }, 500);
    }
});

// ── QR Code: Identificar (KV) ───────────────────────────────
rotasAuthQr.post('/qr/identificar', autenticacaoRequerida(), async (c) => {
    const { softhub_kv } = c.env;
    const usuario = c.get('usuario' as any) as any;

    try {
        const { sessaoId } = await c.req.json();
        if (!sessaoId) return c.json({ erro: 'ID da sessão ausente.' }, 400);

        const resSessao = await softhub_kv.get(chaveQr(sessaoId));
        if (!resSessao) return c.json({ erro: 'Sessão expirada ou não encontrada.' }, 404);

        const sessao = JSON.parse(resSessao) as SessaoQrKV;
        if (sessao.status !== 'pendente') return c.json({ erro: 'Sessão não está mais disponível.' }, 400);

        // Atualiza para identificado
        sessao.status = 'identificado';
        sessao.usuario_id = usuario.id;
        
        await softhub_kv.put(chaveQr(sessaoId), JSON.stringify(sessao), { expirationTtl: 60 });

        return c.json({ sucesso: true });
    } catch (err: any) {
        return c.json({ erro: 'Erro ao identificar.' }, 500);
    }
});

// ── QR Code: Autorizar (KV + D1 para versão do token) ────────────────────────────────
rotasAuthQr.post('/qr/autorizar', autenticacaoRequerida(), async (c) => {
    const { softhub_kv, DB, JWT_SECRET } = c.env;
    const usuario = c.get('usuario' as any) as any;

    let sessaoId: string | undefined;
    try {
        const body = await c.req.json();
        sessaoId = body.sessaoId;
        if (!sessaoId) return c.json({ erro: 'ID da sessão ausente.' }, 400);

        const resSessao = await softhub_kv.get(chaveQr(sessaoId));
        if (!resSessao) return c.json({ erro: 'Sessão expirada ou não encontrada.' }, 404);

        const sessao = JSON.parse(resSessao) as SessaoQrKV;
        
        if (sessao.status !== 'pendente' && sessao.status !== 'identificado') {
            return c.json({ erro: 'Sessão inválida.' }, 400);
        }

        // Incrementa a versão do token no D1
        const resVersaoRaw = await DB.prepare(
            'UPDATE usuarios SET versao_token = versao_token + 1 WHERE id = ? RETURNING versao_token'
        ).bind(usuario.id).first();
        const resVersao = resVersaoRaw as any;
        const novaVersao = resVersao?.versao_token || 1;

        // Gera novo token
        const tokenDesktop = await sign(
            {
                id: usuario.id,
                role: usuario.role,
                email: usuario.email,
                versao_token: novaVersao,
                exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 dias (Igual experiência mobile)
            },
            JWT_SECRET,
        );

        // Atualiza KV para autorizado
        sessao.status = 'autorizado';
        sessao.usuario_id = usuario.id;
        sessao.token_acesso = tokenDesktop;

        await softhub_kv.put(chaveQr(sessaoId), JSON.stringify(sessao), { expirationTtl: 60 });

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'LOGIN_QR_AUTORIZADO',
            modulo: 'auth',
            descricao: `Login via QR Code autorizado pelo celular para o ID: ${sessaoId}`,
            ip: c.req.header('CF-Connecting-IP') ?? ''
        });

        return c.json({ sucesso: true });
    } catch (err: any) {
        log('error', '[QR-AUTH] Erro ao autenticar', { erro: err.message, sessaoId });
        return c.json({ erro: 'Erro ao processar autenticação QR.' }, 500);
    }
});

export default rotasAuthQr;