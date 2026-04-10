import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { Env } from '../index';
import { createSessionForUser } from '../servicos/servico-auth-base';
import { log } from '../utilitarios/logger';

const rotasSessoes = new Hono<{ Bindings: Env }>();

/**
 * Rota para renovar Access Token usando Refresh Token (SEC-013).
 * Implementa rotação obrigatória: o refresh token antigo é invalidado.
 */
rotasSessoes.post('/refresh', async (c) => {
    const { DB, JWT_SECRET, softhub_kv } = c.env;
    const { refreshToken } = await c.req.json();

    if (!refreshToken) return c.json({ erro: 'Refresh token ausente.' }, 400);

    // Hash do token recebido para busca no banco
    const msgUint8 = new TextEncoder().encode(refreshToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const refreshTokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    try {
        // Busca a sessão no banco
        const sessao = await DB.prepare(
            'SELECT * FROM usuarios_sessoes WHERE refresh_token_hash = ?'
        ).bind(refreshTokenHash).first() as any;

        if (!sessao) {
            log('warn', '[AUTH-REFRESH] Refresh token inválido ou já usado', { ip: c.req.header('CF-Connecting-IP') });
            return c.json({ erro: 'Sessão inválida ou expirada.' }, 401);
        }

        const agora = new Date().toISOString();
        if (sessao.expira_em < agora) {
            await DB.prepare('DELETE FROM usuarios_sessoes WHERE id = ?').bind(sessao.id).run();
            return c.json({ erro: 'Sessão expirada.' }, 401);
        }

        // Busca o usuário
        const usuario = await DB.prepare(
            'SELECT id, nome, email, role, versao_token, azure_oid FROM usuarios WHERE id = ?'
        ).bind(sessao.usuario_id).first() as any;

        if (!usuario) return c.json({ erro: 'Usuário não encontrado.' }, 404);

        // Invalida a sessão atual (CHECKLIST: Refresh Token Rotation)
        await DB.prepare('DELETE FROM usuarios_sessoes WHERE id = ?').bind(sessao.id).run();

        // Cria uma nova sessão (Novo Access Token + Novo Refresh Token)
        const novaSessao = await createSessionForUser(c, usuario, sessao.device_info);

        return c.json(novaSessao);
    } catch (e: any) {
        log('error', '[AUTH-REFRESH] Erro crítico ao renovar', { erro: e.message });
        return c.json({ erro: 'Erro ao processar renovação de token.' }, 500);
    }
});

export default rotasSessoes;
