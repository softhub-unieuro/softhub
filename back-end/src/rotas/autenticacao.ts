import { Hono } from 'hono';
import { verify, sign } from 'hono/jwt';
import { Env } from '../index';
import { registrarLog } from '../servicos/servico-logs';
import { log } from '../utilitarios/logger';
import { MsalAuthService } from '../servicos/msal-auth.service';
import { kvRateLimit } from '../middleware/rate-limit';
import { createSessionForUser } from '../servicos/servico-auth-base';

/**
 * Rota de Autenticação - Fluxo MSAL Exclusivo (Auditoria Part 1)
 * Não existe login por email/senha neste sistema.
 */
const rotasAuth = new Hono<{ Bindings: Env }>();

// Proteção Brute Force: 5 tentativas por minuto por IP
rotasAuth.post('/msal', kvRateLimit({ windowMs: 60 * 1000, limit: 5, keyPrefix: 'auth_msal' }), async (c) => {
    const { MSAL_TENANT_ID, MSAL_CLIENT_ID, DB } = c.env;
    const ip = c.req.header('CF-Connecting-IP') ?? 'desconhecido';

    try {
        const body = await c.req.json();
        const idToken = body.idToken;

        if (!idToken) {
            return c.json({ erro: 'idToken ausente.' }, 400);
        }

        if (!MSAL_TENANT_ID || !MSAL_CLIENT_ID) {
            log('error', '[AUTH-MSAL] MSAL Tenant ou Client ID não configurado');
            return c.json({ erro: 'Configuração do servidor de autenticação incompleta.' }, 500);
        }

        // 1. Validar assinatura e claims do token Microsoft (JWKS Check)
        const payload = await MsalAuthService.validateMsalIdToken(idToken, MSAL_TENANT_ID, MSAL_CLIENT_ID);
        
        // 2. Convergência de Usuário (Lookup por OID - Auditoria Checklist)
        const usuario = await MsalAuthService.findOrCreateUserFromMsal(c, payload);
        
        // 3. Gerar Sessão Interna Própria (JWT Independente da Microsoft)
        const sessao = await createSessionForUser(c, usuario, 'Login Microsoft');

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: usuario.isNew ? 'CADASTRO_MSAL' : 'LOGIN_MSAL',
            modulo: 'auth',
            descricao: `Login via Microsoft: ${usuario.email}`,
            ip,
            dadosNovos: { oid: usuario.azure_oid, role: usuario.role }
        });

        return c.json({ 
            token: sessao.accessToken, 
            refreshToken: sessao.refreshToken,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                role: usuario.role,
                foto_perfil: usuario.foto_perfil
            }
        });

    } catch (e: any) {
        log('error', '[AUTH-MSAL] Erro na autenticação Microsoft', { erro: e.message, ip });
        // Retornamos 401 com o erro real obtido do MsalAuthService para facilitar o debug pelo desenvolvedor
        return c.json({ erro: e.message || 'Autenticação falhou.' }, 401);
    }
});
rotasAuth.post('/logout', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return c.json({ sucesso: true });

    const token = authHeader.slice(7);
    const { DB, JWT_SECRET, softhub_kv } = c.env;

    try {
        const payload = await verify(token, JWT_SECRET, 'HS256') as any;
        if (payload.jti && softhub_kv) {
            const timeLeft = (payload.exp * 1000) - Date.now();
            if (timeLeft > 0) {
                // 1. Adiciona JTI na blacklist até o token expirar naturalmente
                await softhub_kv.put(`revoked:${payload.jti}`, '1', {
                    expirationTtl: Math.ceil(timeLeft / 1000)
                });
            }

            // 2. Deleta a sessão física do banco D1 (Evita duplicatas e limpa histórico)
            await DB.prepare('DELETE FROM usuarios_sessoes WHERE id = ?').bind(payload.jti).run();
        }
        return c.json({ sucesso: true });
    } catch {
        return c.json({ sucesso: true });
    }
});

/**
 * Realiza logout de todos os dispositivos (Incrementa versão).
 */
rotasAuth.post('/logout-all', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return c.json({ erro: 'Não autorizado' }, 401);

    const token = authHeader.slice(7);
    const { DB, JWT_SECRET, softhub_kv } = c.env;

    try {
        const payload = await verify(token, JWT_SECRET, 'HS256') as any;
        const usuarioId = payload.id;

        // 1. Invalidar todas as sessões do usuário no D1
        await DB.prepare('DELETE FROM usuarios_sessoes WHERE usuario_id = ?').bind(usuarioId).run();

        // 2. Incrementar a versão do token no banco para invalidar access tokens antigos
        await DB.prepare('UPDATE usuarios SET versao_token = versao_token + 1 WHERE id = ?').bind(usuarioId).run();

        // 3. Cache de logout total no KV
        if (softhub_kv) {
            await softhub_kv.delete(`sessao:${usuarioId}`);
        }

        await registrarLog(DB, {
            usuarioId,
            acao: 'LOGOUT_TOTAL',
            modulo: 'auth',
            descricao: 'Encerramento global de sessões',
            ip: c.req.header('CF-Connecting-IP') ?? 'unknown'
        });

        return c.json({ sucesso: true, mensagem: 'Todas as sessões foram encerradas.' });
    } catch {
        return c.json({ erro: 'Token inválido' }, 401);
    }
});

/**
 * Verifica se o acesso atual vem da rede interna.
 */
rotasAuth.get('/verificar-rede', async (c) => {
    const { DB, softhub_kv } = c.env;
    const ipAtual = c.req.header('CF-Connecting-IP') || '127.0.0.1';

    try {
        let redePonto: string[] = [];
        const cached = await softhub_kv?.get('rede_ponto');

        if (cached) {
            redePonto = JSON.parse(cached);
        } else {
            const row = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = "rede_ponto"').first() as any;
            if (row?.valor) {
                redePonto = JSON.parse(row.valor);
                if (softhub_kv) await softhub_kv.put('rede_ponto', row.valor, { expirationTtl: 3600 });
            }
        }

        return c.json({ ehRedeInterna: redePonto.includes(ipAtual), ip: ipAtual });
    } catch (e) {
        return c.json({ ehRedeInterna: false });
    }
});

/**
 * Endpoint de Refresh Token Rotation (Checklist Part 3 - SEG-012)
 * Troca um refresh token válido por um novo par de tokens (Access + Refresh).
 */
rotasAuth.post('/refresh', kvRateLimit({ windowMs: 60 * 1000, limit: 10, keyPrefix: 'auth_refresh' }), async (c) => {
    const { refreshToken, usuarioId } = await c.req.json();
    const { DB, softhub_kv, JWT_SECRET } = c.env as Env;

    if (!refreshToken || !usuarioId) return c.json({ erro: 'Tokens ausentes' }, 400);

    try {
        // 1. Hash do token recebido para busca
        const msgUint8 = new TextEncoder().encode(refreshToken);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const refreshHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // 2. Buscar sessão no banco
        const sessao = await DB.prepare(
            'SELECT id, expira_em FROM usuarios_sessoes WHERE usuario_id = ? AND refresh_token_hash = ?'
        ).bind(usuarioId, refreshHash).first<any>();

        if (!sessao) {
            log('warn', '[AUTH-REFRESH] Tentativa de refresh com token inexistente ou já usado (Possível Replay Attack)', { usuarioId });
            return c.json({ erro: 'Sessão inválida ou expirada.' }, 401);
        }

        // 3. Verificar expiração
        if (new Date(sessao.expira_em).getTime() < Date.now()) {
            await DB.prepare('DELETE FROM usuarios_sessoes WHERE id = ?').bind(sessao.id).run();
            return c.json({ erro: 'Sessão expirada.' }, 401);
        }

        // 4. Buscar dados atuais do usuário para emitir novo token com claims atualizadas
        const usuario = await DB.prepare('SELECT id, nome, email, role, versao_token, foto_perfil FROM usuarios WHERE id = ?')
            .bind(usuarioId)
            .first<any>();

        if (!usuario || usuario.arquivado) return c.json({ erro: 'Usuário não encontrado ou inativo.' }, 401);

        // 5. Gerar NOVA sessão e DELETAR a antiga (Rotação de Refresh Token)
        const novaSessao = await createSessionForUser(c, usuario, 'Token Refresh', sessao.id);

        return c.json({
            token: novaSessao.accessToken,
            refreshToken: novaSessao.refreshToken,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                role: usuario.role,
                foto_perfil: usuario.foto_perfil
            }
        });

    } catch (e: any) {
        log('error', '[AUTH-REFRESH] Erro interno no refresh', { erro: e.message });
        return c.json({ erro: 'Falha ao renovar sessão.' }, 500);
    }
});

export default rotasAuth;