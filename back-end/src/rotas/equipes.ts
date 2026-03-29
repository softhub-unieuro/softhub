import { Hono, Context } from 'hono';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { log } from '../utilitarios/logger';
import { registrarLog } from '../servicos/servico-logs';
import { criarNotificacoes, removerNotificacoesPorEntidade } from '../servicos/servico-notificacoes';
import { sincronizarLiderancaUsuario } from '../servicos/servico-liderancas';
import { extrairPaginacao, formatarRespostaPaginada } from '../utilitarios/paginacao';

const rotasEquipes = new Hono<{ Bindings: Env; Variables: { usuario: any } }>();

/**
 * Lista todas as equipes cadastradas.
 * Inclui líderes e total de membros por equipe.
 */
rotasEquipes.get('/', autenticacaoRequerida(), verificarPermissao('equipes:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    const pag = extrairPaginacao(c);

    try {
        const totalReq = await DB.prepare('SELECT COUNT(*) as total FROM equipes WHERE arquivado = 0').first() as { total: number };

        const equipes = await DB.prepare(`
            SELECT
                e.id, e.nome, e.descricao, e.criado_em,
                e.lider_id, e.sub_lider_id,
                ul.nome AS lider_nome,
                us.nome AS sub_lider_nome,
                COUNT(DISTINCT uo.usuario_id) AS total_membros,
                (SELECT GROUP_CONCAT(nome, ', ') FROM grupos WHERE equipe_id = e.id) AS grupos_nomes
            FROM equipes e
            LEFT JOIN usuarios ul ON e.lider_id = ul.id
            LEFT JOIN usuarios us ON e.sub_lider_id = us.id
            LEFT JOIN usuarios_organizacao uo ON uo.equipe_id = e.id
            WHERE e.arquivado = 0
            GROUP BY e.id
            ORDER BY e.nome ASC
            LIMIT ? OFFSET ?
        `).bind(pag.limit, pag.offset).all();

        return c.json(formatarRespostaPaginada(equipes.results ?? [], totalReq.total, pag));
    } catch (erro: any) {
        log('error', '[EQUIPES] Falha ao listar equipes', { erro: erro.message, stack: erro.stack });
        return c.json({ erro: 'Falha ao listar equipes.' }, 500);
    }
});

rotasEquipes.post('/', autenticacaoRequerida(), verificarPermissao('equipes:criar_equipe'), async (c: Context) => {
    const { DB } = c.env;
    const usuarioLogado = c.get('usuario') as any;

    let nome: string, descricao: string | null, lider_id: string | null, sub_lider_id: string | null, grupos: any[] | null;
    try {
        const json = await c.req.json();
        ({ nome, descricao = null, lider_id = null, sub_lider_id = null, grupos = null } = json);
    } catch (e: any) {
        return c.json({ erro: 'Corpo da requisição inválido.', detalhe: e.message }, 400);
    }

    if (!nome?.trim()) return c.json({ erro: 'O nome da equipe é obrigatório.' }, 400);

    try {
        const id = crypto.randomUUID();
        
        const commands = [
            DB.prepare('INSERT INTO equipes (id, nome, descricao, lider_id, sub_lider_id) VALUES (?, ?, ?, ?, ?)')
              .bind(id, nome.trim(), descricao, lider_id, sub_lider_id)
        ];

        if (grupos && Array.isArray(grupos)) {
            grupos.forEach(grupo => {
                const gNome = typeof grupo === 'string' ? grupo : grupo.nome;
                const gEscalaTipo = typeof grupo === 'object' && grupo.escala_tipo ? grupo.escala_tipo : 'fixa';
                const gEscalaDias = typeof grupo === 'object' && grupo.escala_dias ? grupo.escala_dias : '';

                if (gNome && gNome.trim()) {
                    commands.push(
                        DB.prepare('INSERT INTO grupos (id, nome, equipe_id, escala_tipo, escala_dias) VALUES (?, ?, ?, ?, ?)')
                          .bind(crypto.randomUUID(), gNome.trim(), id, gEscalaTipo, gEscalaDias)
                    );
                }
            });
        }

        await DB.batch(commands);

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'EQUIPE_CRIADA',
            modulo: 'equipes',
            descricao: `Equipe "${nome}" criada ${grupos?.length ? `com ${grupos.length} grupos` : ''}`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'equipes',
            entidadeId: id,
            dadosNovos: { nome, descricao, lider_id, sub_lider_id, gruposCount: grupos?.length || 0 },
        });

        // Sincronizar roles de liderança (Regra: Auto-cargo ao designar Líder/Sublíder)
        if (lider_id) await sincronizarLiderancaUsuario(c.env, lider_id);
        if (sub_lider_id) await sincronizarLiderancaUsuario(c.env, sub_lider_id);

        return c.json({ sucesso: true, id }, 201);
    } catch (erro: any) {
        log('error', '[EQUIPES] Falha ao criar equipe', { erro: erro.message, nome, stack: erro.stack });
        return c.json({ erro: 'Falha ao criar equipe.', detalhe: erro.message }, 500);
    }
});

/**
 * Edita dados da equipe e atualiza líderes.
 */
rotasEquipes.patch('/:id', autenticacaoRequerida(), verificarPermissao('equipes:editar_equipe'), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const usuarioLogado = c.get('usuario') as any;
    const id = c.req.param('id');

    let corpo: any;
    try {
        corpo = await c.req.json();
    } catch {
        return c.json({ erro: 'Corpo da requisição inválido.' }, 400);
    }

    try {
        const atual = await DB.prepare('SELECT nome, descricao, lider_id, sub_lider_id FROM equipes WHERE id = ?').bind(id).first() as any;
        if (!atual) return c.json({ erro: 'Equipe não encontrada.' }, 404);

        const nome = (corpo.nome !== undefined ? corpo.nome : atual.nome)?.trim();
        const descricao = corpo.descricao !== undefined ? corpo.descricao : atual.descricao;
        const lider_id = corpo.lider_id !== undefined ? corpo.lider_id : atual.lider_id;
        const sub_lider_id = corpo.sub_lider_id !== undefined ? corpo.sub_lider_id : atual.sub_lider_id;

        if (!nome) return c.json({ erro: 'O nome da equipe é obrigatório.' }, 400);

        await DB.prepare(
            'UPDATE equipes SET nome = ?, descricao = ?, lider_id = ?, sub_lider_id = ? WHERE id = ?'
        ).bind(nome, descricao, lider_id, sub_lider_id, id).run();

        // Notificar novos líderes se mudaram (Regra 10: Notificações sempre no backend)
        if (lider_id && lider_id !== atual.lider_id) {
            await criarNotificacoes(DB, {
                usuarioId: lider_id,
                tipo: 'sistema',
                titulo: 'Nova Liderança',
                mensagem: `Você foi designado como Líder da equipe "${nome}".`,
                link: '/app/admin/equipes',
                entidadeId: id
            }, softhub_kv);
        }
        if (sub_lider_id && sub_lider_id !== atual.sub_lider_id) {
            await criarNotificacoes(DB, {
                usuarioId: sub_lider_id,
                tipo: 'sistema',
                titulo: 'Nova Liderança',
                mensagem: `Você foi designado como Sublíder da equipe "${nome}".`,
                link: '/app/admin/equipes',
                entidadeId: id
            }, softhub_kv);
        }

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'EQUIPE_EDITADA',
            modulo: 'equipes',
            descricao: `Equipe "${nome}" atualizada`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'equipes',
            entidadeId: id,
            dadosAnteriores: { nome: atual.nome, descricao: atual.descricao, lider_id: atual.lider_id, sub_lider_id: atual.sub_lider_id },
            dadosNovos: { nome, descricao, lider_id, sub_lider_id },
        });

        // Sincronizar roles de liderança (Regra: Auto-cargo ao designar Líder/Sublíder)
        const usuariosParaSincronizar = new Set<string>();
        if (atual.lider_id) usuariosParaSincronizar.add(atual.lider_id);
        if (lider_id) usuariosParaSincronizar.add(lider_id);
        if (atual.sub_lider_id) usuariosParaSincronizar.add(atual.sub_lider_id);
        if (sub_lider_id) usuariosParaSincronizar.add(sub_lider_id);

        for (const uid of usuariosParaSincronizar) {
            await sincronizarLiderancaUsuario(c.env, uid);
        }

        return c.json({ sucesso: true });
    } catch (erro: any) {
        log('error', '[EQUIPES] Falha ao editar equipe', { erro: erro.message, id, stack: erro.stack });
        return c.json({ erro: 'Falha ao editar equipe.', detalhe: erro.message }, 500);
    }
});

rotasEquipes.delete('/:id', autenticacaoRequerida(), verificarPermissao('equipes:editar_equipe'), async (c: Context) => {
    const { DB } = c.env;
    const usuarioLogado = c.get('usuario') as any;
    const id = c.req.param('id');

    try {
        const atual = await DB.prepare('SELECT lider_id, sub_lider_id FROM equipes WHERE id = ?').bind(id).first() as any;
        
        await DB.prepare('UPDATE equipes SET arquivado = 1 WHERE id = ?').bind(id).run();

        if (id) await removerNotificacoesPorEntidade(DB, id);

        // Sincronizar roles após remoção
        if (atual?.lider_id) await sincronizarLiderancaUsuario(c.env, atual.lider_id);
        if (atual?.sub_lider_id) await sincronizarLiderancaUsuario(c.env, atual.sub_lider_id);

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'EQUIPE_REMOVIDA_HARD',
            modulo: 'equipes',
            descricao: `Equipe ${id} removida permanentemente do sistema.`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'equipes',
            entidadeId: id,
            dadosAnteriores: { lider_id: atual.lider_id, sub_lider_id: atual.sub_lider_id }
        });

        return c.json({ sucesso: true });
    } catch (erro: any) {
        log('error', '[EQUIPES] Falha ao remover equipe', { erro: erro.message, id, stack: erro.stack });
        return c.json({ erro: 'Falha ao remover equipe.', detalhe: erro.message }, 500);
    }
});

export default rotasEquipes;
