import { Hono, Context } from 'hono';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { registrarLog } from '../servicos/servico-logs';
import { log } from '../utilitarios/logger';

const rotasConvites = new Hono<{ Bindings: Env; Variables: { usuario: any } }>();

/**
 * Gera um novo link de convite.
 * Requer permissão 'membros:gerenciar' ou similar.
 */
rotasConvites.post('/', autenticacaoRequerida(), verificarPermissao('membros:gerenciar'), async (c: Context) => {
    const { DB } = c.env;
    const usuarioLogado = c.get('usuario');

    try {
        const { limite_usos = 1, validade_horas = 24 } = await c.req.json();
        
        const id = crypto.randomUUID();
        const token = crypto.randomUUID().replace(/-/g, ''); // Token curto e limpo
        const expiraEm = new Date(Date.now() + (validade_horas * 60 * 60 * 1000)).toISOString();

        await DB.prepare(`
            INSERT INTO convites (id, token, criado_por_id, limite_usos, expira_em)
            VALUES (?, ?, ?, ?, ?)
        `).bind(id, token, usuarioLogado.id, limite_usos, expiraEm).run();

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'CONVITE_GERADO',
            modulo: 'membros',
            descricao: `Link de convite gerado com ${limite_usos} usos`,
            ip: c.req.header('CF-Connecting-IP') ?? 'unknown',
            entidadeTipo: 'convites',
            entidadeId: id
        });

        return c.json({ sucesso: true, token, expira_em: expiraEm });
    } catch (erro: any) {
        log('error', '[CONVITES] Falha ao gerar convite', { erro: erro.message });
        return c.json({ erro: 'Falha ao gerar convite.' }, 500);
    }
});

/**
 * Valida um token de convite (Rota pública para o frontend verificar antes do login).
 */
rotasConvites.get('/validar/:token', async (c: Context) => {
    const { DB } = c.env;
    const token = c.req.param('token');

    try {
        const convite = await DB.prepare(`
            SELECT c.*, u.nome as criador_nome
            FROM convites c
            JOIN usuarios u ON u.id = c.criado_por_id
            WHERE c.token = ? AND c.usos_atuais < c.limite_usos
        `).bind(token).first() as any;

        if (!convite) return c.json({ valido: false, erro: 'Convite inexistente ou esgotado.' });

        if (convite.expira_em && new Date(convite.expira_em).getTime() < Date.now()) {
            return c.json({ valido: false, erro: 'Convite expirado.' });
        }

        return c.json({ valido: true, criador: convite.criador_nome });
    } catch (erro: any) {
        return c.json({ valido: false, erro: 'Erro ao validar convite.' });
    }
});

/**
 * Aceita o convite e aloca o usuário logado à equipe/grupo.
 */
rotasConvites.post('/aceitar', autenticacaoRequerida(), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const usuarioLogado = c.get('usuario');

    try {
        const { token, equipe_id, grupo_id } = await c.req.json();

        if (!token || !equipe_id || !grupo_id) {
            return c.json({ erro: 'Dados incompletos para aceitar convite.' }, 400);
        }

        // 1. Validar convite novamente (para evitar Race Condition)
        const convite = await DB.prepare('SELECT id, usos_atuais, limite_usos, expira_em FROM convites WHERE token = ?').bind(token).first() as any;

        if (!convite || convite.usos_atuais >= convite.limite_usos) {
            return c.json({ erro: 'Convite inválido ou esgotado.' }, 403);
        }

        if (convite.expira_em && new Date(convite.expira_em).getTime() < Date.now()) {
            return c.json({ erro: 'Convite expirado.' }, 403);
        }

        // 2. Alocar usuário (Remove alocações anteriores para manter a regra de 1 alocação)
        const statements = [
            DB.prepare('DELETE FROM usuarios_organizacao WHERE usuario_id = ?').bind(usuarioLogado.id),
            DB.prepare(`
                INSERT INTO usuarios_organizacao (id, usuario_id, equipe_id, grupo_id)
                VALUES (?, ?, ?, ?)
            `).bind(crypto.randomUUID(), usuarioLogado.id, equipe_id, grupo_id),
            DB.prepare('UPDATE convites SET usos_atuais = usos_atuais + 1 WHERE id = ?').bind(convite.id)
        ];

        await DB.batch(statements);

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'CONVITE_ACEITO',
            modulo: 'membros',
            descricao: `Usuário aceitou convite e se alocou na equipe ${equipe_id}`,
            ip: c.req.header('CF-Connecting-IP') ?? 'unknown',
            entidadeTipo: 'convites',
            entidadeId: convite.id
        });

        return c.json({ sucesso: true });
    } catch (erro: any) {
        log('error', '[CONVITES] Falha ao aceitar convite', { erro: erro.message });
        return c.json({ erro: 'Falha ao processar alocação por convite.' }, 500);
    }
});

export default rotasConvites;
