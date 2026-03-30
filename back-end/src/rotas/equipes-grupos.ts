import { Hono, Context } from 'hono';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { registrarLog } from '../servicos/servico-logs';
import { log } from '../utilitarios/logger';
import { removerNotificacoesPorEntidade } from '../servicos/servico-notificacoes';

const rotasGrupos = new Hono<{ Bindings: Env; Variables: { usuario: any } }>();

/**
 * Lista todos os grupos cadastrados.
 * Inclui informações da equipe vinculada e totais de membros.
 */
rotasGrupos.get('/', autenticacaoRequerida(), verificarPermissao('equipes:visualizar'), async (c: Context) => {
    const { DB } = c.env;

    try {
        const grupos = await DB.prepare(`
            SELECT
                g.id, g.nome, g.descricao, g.criado_em,
                g.equipe_id, g.escala_tipo, g.escala_dias,
                e.nome AS equipe_nome,
                ul.nome AS lider_nome,
                us.nome AS sub_lider_nome,
                COUNT(uo.usuario_id) AS total_membros
            FROM grupos g
            LEFT JOIN equipes e ON g.equipe_id = e.id
            LEFT JOIN usuarios ul ON e.lider_id = ul.id
            LEFT JOIN usuarios us ON e.sub_lider_id = us.id
            LEFT JOIN usuarios_organizacao uo ON uo.grupo_id = g.id
            WHERE g.arquivado = 0
            GROUP BY g.id
            ORDER BY e.nome ASC, g.nome ASC
        `).all();

        return c.json({ grupos: grupos.results ?? [] });
    } catch (erro: any) {
        log('error', '[EQUIPES-GRUPOS] Falha ao listar grupos', { erro: erro.message, stack: erro.stack });
        return c.json({ erro: 'Falha ao listar grupos.' }, 500);
    }
});

/**
 * Cria um novo grupo.
 * Regra: equipe_id agora é OPCIONAL para permitir Grupos Globais.
 */
rotasGrupos.post('/', autenticacaoRequerida(), verificarPermissao('equipes:criar_grupo'), async (c: Context) => {
    const { DB } = c.env;
    const usuarioLogado = c.get('usuario') as any;

    let nome: string, descricao: string | null, equipe_id: string | null, escala_tipo: string, escala_dias: string | null;
    try {
        const json = await c.req.json();
        ({ nome, descricao = null, equipe_id = null, escala_tipo = 'fixa', escala_dias = '' } = json);
    } catch (e: any) {
        return c.json({ erro: 'Corpo da requisição inválido.', detalhe: e.message }, 400);
    }

    if (!nome?.trim()) return c.json({ erro: 'O nome do grupo é obrigatório.' }, 400);

    try {
        const id = crypto.randomUUID();
        await DB.prepare(
            'INSERT INTO grupos (id, nome, descricao, equipe_id, escala_tipo, escala_dias) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(id, nome.trim(), descricao, equipe_id, escala_tipo, escala_dias).run();

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'GRUPO_CRIADO',
            modulo: 'equipes',
            descricao: `Grupo "${nome}" criado`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'grupos',
            entidadeId: id,
            dadosNovos: { nome, descricao, equipe_id, escala_tipo, escala_dias },
        });

        return c.json({ sucesso: true, id }, 201);
    } catch (erro: any) {
        log('error', '[EQUIPES-GRUPOS] Falha ao criar grupo', { erro: erro.message, nome, stack: erro.stack });
        return c.json({ erro: 'Falha ao criar grupo.', detalhe: erro.message }, 500);
    }
});

rotasGrupos.patch('/:id', autenticacaoRequerida(), verificarPermissao('equipes:editar_grupo'), async (c: Context) => {
    const { DB } = c.env;
    const usuarioLogado = c.get('usuario') as any;
    const id = c.req.param('id');

    let corpo: any;
    try {
        corpo = await c.req.json();
    } catch {
        return c.json({ erro: 'Corpo da requisição inválido.' }, 400);
    }

    try {
        const atual = await DB.prepare('SELECT nome, descricao, equipe_id, escala_tipo, escala_dias FROM grupos WHERE id = ?').bind(id).first() as any;
        if (!atual) return c.json({ erro: 'Grupo não encontrado.' }, 404);

        const nome = (corpo.nome !== undefined ? corpo.nome : atual.nome)?.trim();
        const descricao = corpo.descricao !== undefined ? corpo.descricao : atual.descricao;
        const equipe_id = corpo.equipe_id !== undefined ? corpo.equipe_id : atual.equipe_id;
        const escala_tipo = corpo.escala_tipo !== undefined ? corpo.escala_tipo : atual.escala_tipo;
        const escala_dias = corpo.escala_dias !== undefined ? corpo.escala_dias : atual.escala_dias;

        if (!nome) return c.json({ erro: 'O nome do grupo é obrigatório.' }, 400);

        await DB.prepare(
            'UPDATE grupos SET nome = ?, descricao = ?, equipe_id = ?, escala_tipo = ?, escala_dias = ? WHERE id = ?'
        ).bind(nome, descricao, equipe_id, escala_tipo, escala_dias, id).run();

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'GRUPO_EDITADO',
            modulo: 'equipes',
            descricao: `Grupo "${nome}" atualizado`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'grupos',
            entidadeId: id,
            dadosAnteriores: { nome: atual.nome, descricao: atual.descricao, equipe_id: atual.equipe_id, escala_tipo: atual.escala_tipo, escala_dias: atual.escala_dias },
            dadosNovos: { nome, descricao, equipe_id, escala_tipo, escala_dias },
        });

        return c.json({ sucesso: true });
    } catch (erro: any) {
        log('error', '[EQUIPES-GRUPOS] Falha ao editar grupo', { erro: erro.message, id, stack: erro.stack });
        return c.json({ erro: 'Falha ao editar grupo.', detalhe: erro.message }, 500);
    }
});

rotasGrupos.delete('/:id', autenticacaoRequerida(), verificarPermissao('equipes:editar_grupo'), async (c: Context) => {
    const { DB } = c.env;
    const usuarioLogado = c.get('usuario') as any;
    const id = c.req.param('id');

    try {
        await DB.prepare('UPDATE grupos SET arquivado = 1 WHERE id = ?').bind(id).run();

        if (id) await removerNotificacoesPorEntidade(DB, id);

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'GRUPO_REMOVIDO_HARD',
            modulo: 'equipes',
            descricao: `Grupo ${id} removido permanentemente`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'grupos',
            entidadeId: id,
        });

        return c.json({ sucesso: true });
    } catch (erro: any) {
        log('error', '[EQUIPES-GRUPOS] Falha ao remover grupo', { erro: erro.message, id, stack: erro.stack });
        return c.json({ erro: 'Falha ao remover grupo.', detalhe: erro.message }, 500);
    }
});

export default rotasGrupos;
