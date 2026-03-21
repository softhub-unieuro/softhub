import { Hono, Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao, verificarPermissaoManual } from '../middleware/auth';
import { registrarLog } from '../servicos/servico-logs';

const rotasProjetos = new Hono<{ Bindings: Env; Variables: { usuario: any } }>({ strict: false });

// Schema para criação/edição de projetos
const ProjetoSchema = z.object({
    nome: z.string().min(3).max(100),
    descricao: z.string().optional(),
    publico: z.boolean().default(false),
    github_repo: z.string().optional(),
    documentacao_url: z.string().optional(),
    figma_url: z.string().optional(),
    setup_url: z.string().optional(),
    equipes: z.array(z.object({
        equipe_id: z.string(),
        acesso: z.enum(['LEITURA', 'EDICAO', 'GESTAO'])
    })).optional(),
});

/**
 * GET /api/projetos/publico/:id
 * Detalhes completos de um projeto público (incluindo equipe).
 */
rotasProjetos.get('/publico/:id', async (c) => {
    const { DB } = c.env;
    const id = c.req.param('id');
    try {
        // 1. Dados Básicos do Projeto
        const projeto = await DB.prepare(`
            SELECT id, nome, descricao, github_repo, figma_url, documentacao_url, criado_em 
            FROM projetos 
            WHERE id = ? AND publico = 1 AND arquivado = 0
        `).bind(id).first() as any;

        if (!projeto) return c.json({ erro: 'Projeto não localizado ou privado.' }, 404);

        // 2. Membros da Equipe (União de todas as equipes vinculadas ao projeto)
        const { results: membros } = await DB.prepare(`
            SELECT DISTINCT u.id, u.nome, u.email, u.foto_perfil, u.role
            FROM usuarios u
            JOIN usuarios_organizacao uo ON u.id = uo.usuario_id
            JOIN projetos_equipes pe ON uo.equipe_id = pe.equipe_id
            WHERE pe.projeto_id = ?
            ORDER BY u.nome ASC
        `).bind(id).all();

        return c.json({ ...projeto, membros });
    } catch (e: any) {
        return c.json({ erro: 'Falha ao buscar detalhes do projeto público.' }, 500);
    }
});

/**
 * GET /api/projetos/publicos
 * Rota pública para o portfólio (Lista resumida).
 */
rotasProjetos.get('/publicos', async (c) => {
    const { DB, softhub_kv } = c.env;
    try {
        const cacheKey = 'portfolio:publicos';
        const cached = await softhub_kv?.get(cacheKey);
        if (cached) return c.json(JSON.parse(cached));

        const { results } = await DB.prepare(`
            SELECT id, nome, descricao, github_repo, documentacao_url, figma_url, criado_em 
            FROM projetos 
            WHERE publico = 1 AND arquivado = 0
            ORDER BY criado_em DESC
        `).all();

        await softhub_kv?.put(cacheKey, JSON.stringify(results), { expirationTtl: 86400 }); // 24h (invalidado na escrita)

        return c.json(results);
    } catch (e: any) {
        return c.json({ erro: 'Falha ao buscar projetos públicos' }, 500);
    }
});

/**
 * Lista todos os projetos disponíveis para o usuário autenticado.
 * Filtra por permissão de Admin, projetos públicos ou projetos onde a equipe do usuário está vinculada.
 */
rotasProjetos.get('/', autenticacaoRequerida(), verificarPermissao(['projetos:visualizar', 'projetos:visualizar_detalhes']), async (c) => {
    const { DB, softhub_kv } = c.env;
    const usuario = c.get('usuario');

    try {
        const query = `
            SELECT p.*, 
                   (SELECT COUNT(*) FROM tarefas WHERE projeto_id = p.id) as total_tarefas
            FROM projetos p 
            WHERE p.arquivado = 0 AND (? = 'ADMIN' OR p.publico = 1 OR EXISTS (
                SELECT 1 FROM projetos_equipes pe
                JOIN usuarios_organizacao uo ON uo.equipe_id = pe.equipe_id
                WHERE pe.projeto_id = p.id AND uo.usuario_id = ?
            ))
            ORDER BY criado_em DESC
        `;
        const { results } = await DB.prepare(query).bind(usuario.role, usuario.id).all();

        // Buscar equipes de cada projeto
        for (const projeto of (results as any[])) {
            const equipesData = await DB.prepare(`
                SELECT equipe_id, acesso FROM projetos_equipes WHERE projeto_id = ?
            `).bind(projeto.id).all();
            projeto.equipes = equipesData.results || [];
        }

        return c.json(results);
    } catch (e: any) {
        return c.json({ erro: 'Falha ao buscar projetos' }, 500);
    }
});

/**
 * Cria um novo projeto e vincula as equipes especificadas.
 * Requer permissão 'projetos:criar'.
 */
rotasProjetos.post('/', 
    autenticacaoRequerida(), 
    verificarPermissao('projetos:criar'), 
    zValidator('json', ProjetoSchema), 
    async (c) => {
    const { DB, softhub_kv } = c.env;
    const body = c.req.valid('json');
    const usuario = c.get('usuario');
    const id = crypto.randomUUID();

    try {
        await DB.prepare(`
            INSERT INTO projetos (id, nome, descricao, publico, github_repo, documentacao_url, figma_url, setup_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id, 
            body.nome, 
            body.descricao || null, 
            body.publico ? 1 : 0, 
            body.github_repo || null,
            body.documentacao_url || null,
            body.figma_url || null,
            body.setup_url || null
        ).run();

        // Salva as equipes vinculadas, se houver
        if (body.equipes && Array.isArray(body.equipes)) {
            for (const item of body.equipes) {
                await DB.prepare(`
                    INSERT INTO projetos_equipes (projeto_id, equipe_id, acesso) VALUES (?, ?, ?)
                `).bind(id, item.equipe_id, item.acesso).run();
            }
        }

        // 🚀 Invalida cache do portfólio
        if (body.publico) await softhub_kv?.delete('portfolio:publicos');

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'PROJETO_CRIADO',
            modulo: 'projetos',
            descricao: `Projeto "${body.nome}" criado com ID ${id}`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'projetos',
            entidadeId: id
        });

        return c.json({ id, sucesso: true }, 201);
    } catch (e: any) {
        console.error('[ERRO DB] POST /api/projetos', e);
        return c.json({ erro: 'Falha ao criar projeto', detalhe: e.message }, 500);
    }
});

/**
 * Atualiza os dados de um projeto existente.
 * Requer permissão 'projetos:editar'.
 */
rotasProjetos.patch('/:id', 
    autenticacaoRequerida(), 
    verificarPermissao('projetos:editar'), 
    zValidator('json', ProjetoSchema.partial()), 
    async (c) => {
    const { DB, softhub_kv } = c.env;
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const usuario = c.get('usuario');

    try {
        const atual = await DB.prepare('SELECT * FROM projetos WHERE id = ?').bind(id).first() as any;
        if (!atual) return c.json({ erro: 'Projeto não encontrado' }, 404);

        // 🛡️ NOVO: Verificação de Permissões Granulares
        const mudancaPublico = body.publico !== undefined && (body.publico ? 1 : 0) !== atual.publico;
        const mudancaLinks = (body.github_repo !== undefined && body.github_repo !== atual.github_repo) ||
                            (body.documentacao_url !== undefined && body.documentacao_url !== atual.documentacao_url) ||
                            (body.figma_url !== undefined && body.figma_url !== atual.figma_url) ||
                            (body.setup_url !== undefined && body.setup_url !== atual.setup_url);

        // Se mudou o status de portfólio, exige permissão específica
        if (mudancaPublico) {
            const podePublicar = await verificarPermissaoManual(c, 'projetos:publicar_portfolio');
            if (!podePublicar) return c.json({ erro: 'Sem permissão para alterar visibilidade do portfólio.' }, 403);
        }

        // Se mudou links críticos, exige permissão específica (ou ser o criador/gestor)
        if (mudancaLinks) {
            const podeGerenciarLinks = await verificarPermissaoManual(c, 'projetos:gerenciar_links');
            if (!podeGerenciarLinks) return c.json({ erro: 'Sem permissão para gerenciar links técnicos.' }, 403);
        }

        const campos = [];
        const valores = [];
        if (body.nome !== undefined) { campos.push('nome = ?'); valores.push(body.nome); }
        if (body.descricao !== undefined) { campos.push('descricao = ?'); valores.push(body.descricao); }
        if (body.publico !== undefined) { campos.push('publico = ?'); valores.push(body.publico ? 1 : 0); }
        if (body.github_repo !== undefined) { campos.push('github_repo = ?'); valores.push(body.github_repo); }
        if (body.documentacao_url !== undefined) { campos.push('documentacao_url = ?'); valores.push(body.documentacao_url); }
        if (body.figma_url !== undefined) { campos.push('figma_url = ?'); valores.push(body.figma_url); }
        if (body.setup_url !== undefined) { campos.push('setup_url = ?'); valores.push(body.setup_url); }

        if (campos.length > 0) {
            valores.push(id);
            await DB.prepare(`UPDATE projetos SET ${campos.join(', ')} WHERE id = ?`).bind(...valores).run();
        }

        // Atualizar equipes vinculadas
        if (body.equipes && Array.isArray(body.equipes)) {
            await DB.prepare('DELETE FROM projetos_equipes WHERE projeto_id = ?').bind(id).run();
            for (const item of body.equipes) {
                await DB.prepare(`
                    INSERT INTO projetos_equipes (projeto_id, equipe_id, acesso) VALUES (?, ?, ?)
                `).bind(id, item.equipe_id, item.acesso).run();
            }
        }

        // 🚀 Invalida cache do portfólio
        await softhub_kv?.delete('portfolio:publicos');

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'PROJETO_EDITADO',
            modulo: 'projetos',
            descricao: `Projeto ${id} editado`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'projetos',
            entidadeId: id
        });

        return c.json({ sucesso: true });
    } catch (e: any) {
        return c.json({ erro: 'Falha ao editar projeto' }, 500);
    }
});

/**
 * Remove permanentemente um projeto (Hard Delete).
 * Requer permissão 'projetos:excluir'.
 */
rotasProjetos.delete('/:id', autenticacaoRequerida(), verificarPermissao('projetos:excluir'), async (c) => {
    const { DB, softhub_kv } = c.env;
    const id = c.req.param('id');
    const usuario = c.get('usuario');

    try {
        const projeto = await DB.prepare('SELECT nome FROM projetos WHERE id = ?').bind(id).first() as any;
        if (!projeto) return c.json({ erro: 'Projeto não encontrado' }, 404);

        await DB.prepare('UPDATE projetos SET arquivado = 1 WHERE id = ?').bind(id).run();

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'PROJETO_REMOVIDO_HARD',
            modulo: 'projetos',
            descricao: `Projeto "${projeto.nome}" removido permanentemente`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'projetos',
            entidadeId: id
        });

        // 🚀 Invalida cache do portfólio
        if (softhub_kv) await softhub_kv.delete('portfolio:publicos');

        return c.json({ sucesso: true });
    } catch (e: any) {
        return c.json({ erro: 'Falha ao deletar projeto' }, 500);
    }
});

export default rotasProjetos;
