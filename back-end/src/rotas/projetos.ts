import { Hono, Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao, verificarPermissaoManual } from '../middleware/auth';
import * as servico from '../servicos/servico-projetos';
import * as repo from '../repositorios/repo-projetos';
import { log } from '../utilitarios/logger';

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
    const id = c.req.param('id');
    try {
        const projeto = await repo.buscarDetalhesPublicos(c.env.DB, id);
        if (!projeto) return c.json({ erro: 'Projeto não localizado ou privado.' }, 404);
        return c.json(projeto);
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

        if (softhub_kv) {
            try {
                await softhub_kv.put(cacheKey, JSON.stringify(results), { expirationTtl: 86400 }); // 24h
            } catch (kvError: any) {
                log('warn', '[PROJETOS-KV] Falha ao salvar portfolio no cache', { erro: kvError.message });
            }
        }

        return c.json(results);
    } catch (e: any) {
        return c.json({ erro: 'Falha ao buscar projetos públicos' }, 500);
    }
});

/**
 * GET /api/projetos/equipe-publica
 * Rota pública que retorna a contagem real de alunos e seus dados básicos (nome, foto, role).
 */
rotasProjetos.get('/equipe-publica', async (c) => {
    const { DB, softhub_kv } = c.env;
    try {
        const cacheKey = 'portfolio:equipe';
        const cached = await softhub_kv?.get(cacheKey);
        if (cached) return c.json(JSON.parse(cached));

        const query = `
            SELECT id, nome, role, foto_perfil
            FROM usuarios 
            WHERE arquivado = 0
            ORDER BY nome ASC
        `;
        const { results } = await DB.prepare(query).all();

        const response = {
            total: results.length,
            membros: results
        };

        if (softhub_kv) {
            try {
                await softhub_kv.put(cacheKey, JSON.stringify(response), { expirationTtl: 3600 }); // 1h de cache
            } catch (kvError: any) { /* Silencioso: falha no cache não deve quebrar a request */ }
        }

        return c.json(response);
    } catch (e: any) {
        log('error', '[PORTFOLIO] Falha ao buscar equipe pública', { erro: e.message });
        return c.json({ erro: 'Falha ao sincronizar equipe' }, 500);
    }
});

/**
 * Lista todos os projetos disponíveis para o usuário autenticado.
 * Filtra por permissão de Admin, projetos públicos ou projetos onde a equipe do usuário está vinculada.
 */
rotasProjetos.get('/', autenticacaoRequerida(), async (c) => {
    try {
        const projetos = await servico.listarProjetos(c.env, c.get('usuario'), c);
        return c.json(projetos);
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
    try {
        const res = await servico.criarProjeto(
            c.env, 
            c.get('usuario'), 
            c.req.valid('json' as any), 
            c.req.header('CF-Connecting-IP') ?? ''
        );
        return c.json(res, 201);
    } catch (e: any) {
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
    try {
        const id = c.req.param('id');
        const res = await servico.editarProjeto(c.env, c.get('usuario'), id!, c.req.valid('json' as any), c);
        return c.json(res);
    } catch (e: any) {
        const status = e.message.includes('permissão') ? 403 : (e.message.includes('encontrado') ? 404 : 500);
        return c.json({ erro: e.message }, status);
    }
});

/**
 * Remove permanentemente um projeto (Hard Delete).
 * Requer permissão 'projetos:excluir'.
 */
rotasProjetos.delete('/:id', autenticacaoRequerida(), verificarPermissao('projetos:excluir'), async (c) => {
    try {
        const id = c.req.param('id');
        const res = await servico.deletarProjeto(c.env, c.get('usuario'), id!, c);
        return c.json(res);
    } catch (e: any) {
        return c.json({ erro: e.message || 'Falha ao deletar projeto' }, 500);
    }
});



/**
 * DELETE /api/projetos/:id/repositorio
 * Remove permanentemente o repositório vinculado no GitHub.
 */
rotasProjetos.delete('/:id/repositorio', autenticacaoRequerida(), verificarPermissao('projetos:excluir'), async (c) => {
    try {
        const id = c.req.param('id');
        const res = await servico.deletarRepositorioGitHub(c.env, id!);
        return c.json(res);
    } catch (e: any) {
        return c.json({ erro: e.message || 'Falha ao deletar repositório no GitHub.' }, 500);
    }
});

export default rotasProjetos;
