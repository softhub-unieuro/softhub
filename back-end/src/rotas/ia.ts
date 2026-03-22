import { Hono, Context } from 'hono';
import { Octokit } from '@octokit/rest';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { sugerirPrioridade, resumirTarefa, analisarJustificativa, formatarAviso, aprimorarDescricao, gerarInfra } from '../servicos/servico-ai';

const rotasIA = new Hono<{ Bindings: Env; Variables: { usuario: any } }>();

// Todas as rotas de IA exigem autenticação e permissão de consulta
rotasIA.use('*', autenticacaoRequerida(), verificarPermissao('ia:consultar'));

/**
 * Middleware para verificar cota diária de IA no KV
 * Cada usuário tem 50 chamadas/dia (totalizando ~1000 chamadas para 20 pessoas)
 */
rotasIA.use('*', async (c, next) => {
    const { softhub_kv } = c.env;
    const usuario = c.get('usuario');
    
    if (!usuario?.id) return c.json({ erro: 'Usuário não identificado.' }, 401);

    const hoje = new Date().toISOString().split('T')[0];
    const chaveCota = `cota_ia:${hoje}:${usuario.id}`;

    const usos = Number(await softhub_kv?.get(chaveCota) || 0);

    if (usos >= 50) {
        return c.json({ 
            erro: 'Cota diária de "neurônios" atingida.', 
            detalhe: 'Você já utilizou suas 50 sugestões automáticas de hoje. Tente novamente amanhã para manter o sistema sustentável.' 
        }, 429);
    }

    await next();

    // Se a requisição foi bem sucedida (status 2xx), incrementa o uso
    if (c.res.status >= 200 && c.res.status < 300 && softhub_kv) {
        try {
            await softhub_kv.put(chaveCota, String(usos + 1), { expirationTtl: 86400 });
        } catch (kvError: any) {
            // Se exceder a cota de KV, apenas logamos e deixamos o usuário usar (prioriza UX)
            // log('warn', '[IA-KV] Falha ao atualizar cota', { erro: kvError.message });
        }
    }
});

/**
 * POST /api/ia/prioridade
 * Sugere prioridade com base no texto
 */
rotasIA.post('/prioridade', async (c) => {
    const { AI } = c.env;
    const { texto } = await c.req.json();
    
    if (!texto) return c.json({ erro: 'Texto é necessário.' }, 400);

    try {
        const sugestao = await sugerirPrioridade(AI, texto);
        return c.json(sugestao);
    } catch (e: any) {
        return c.json({ erro: 'IA temporariamente indisponível.', detalhe: e.message }, 500);
    }
});

/**
 * POST /api/ia/justificativa
 * Analisa justificativa de ponto
 */
rotasIA.post('/analisar-justificativa', async (c) => {
    const { AI } = c.env;
    const { motivo } = await c.req.json();

    if (!motivo) return c.json({ erro: 'Motivo é necessário.' }, 400);

    try {
        const analise = await analisarJustificativa(AI, motivo);
        return c.json(analise);
    } catch (e: any) {
        return c.json({ erro: 'IA temporariamente indisponível.' }, 500);
    }
});

/**
 * POST /api/ia/refinar-aviso
 * Transforma rascunho em aviso oficial
 */
rotasIA.post('/refinar-aviso', async (c) => {
    const { AI } = c.env;
    const { rascunho } = await c.req.json();

    if (!rascunho) return c.json({ erro: 'Rascunho é necessário.' }, 400);

    try {
        const aviso = await formatarAviso(AI, rascunho);
        return c.json(aviso);
    } catch (e: any) {
        return c.json({ erro: 'IA temporariamente indisponível.' }, 500);
    }
});

/**
 * POST /api/ia/aprimorar-descricao
 * Melhora a descrição atual da tarefa
 */
rotasIA.post('/aprimorar-descricao', async (c) => {
    const { AI } = c.env;
    const { titulo, descricao } = await c.req.json();

    if (!titulo || !descricao) return c.json({ erro: 'Título e descrição são necessários.' }, 400);

    try {
        const descricaoMelhorada = await aprimorarDescricao(AI, titulo, descricao);
        return c.json({ descricao: descricaoMelhorada });
    } catch (e: any) {
        return c.json({ erro: 'IA temporariamente indisponível.' }, 500);
    }
});

/**
 * POST /api/ia/sugerir-infra
 * Sugere GitHub Actions / Docker configs
 */
rotasIA.post('/sugerir-infra', async (c) => {
    const { AI } = c.env;
    const { nome, descricao } = await c.req.json();

    if (!nome) return c.json({ erro: 'Nome do projeto é necessário.' }, 400);

    try {
        const sugestao = await gerarInfra(AI, nome, descricao || '');
        return c.json({ sugestao });
    } catch (e: any) {
        return c.json({ erro: 'IA temporariamente indisponível.' }, 500);
    }
});

/**
 * POST /api/ia/github/criar-repo
 * Cria um repositório real no GitHub usando o token do servidor
 */
rotasIA.post('/github/criar-repo', async (c) => {
    const { GITHUB_TOKEN } = c.env;
    const { nome, descricao, publico } = await c.req.json();

    if (!GITHUB_TOKEN) {
        return c.json({ 
            erro: 'Token do GitHub não configurado.', 
            detalhe: 'O administrador deve configurar o GITHUB_TOKEN nas secrets da Worker.' 
        }, 500);
    }

    if (!nome) return c.json({ erro: 'Nome do repositório é necessário.' }, 400);

    try {
        const octokit = new Octokit({ auth: GITHUB_TOKEN });
        
        const { data } = await octokit.repos.createForAuthenticatedUser({
            name: nome.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
            description: (descricao || 'Projeto criado pelo SoftHub IA').slice(0, 500),
            private: !publico,
            auto_init: true
        });

        return c.json({
            sucesso: true,
            repo: data.name.toLowerCase(),
            url: data.html_url
        });
    } catch (e: any) {
        return c.json({ 
            erro: 'GitHub recusou a criação.', 
            detalhe: e.response?.data?.message || e.message 
        }, 500);
    }
});

export default rotasIA;
