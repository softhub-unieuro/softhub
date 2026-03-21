import { Hono, Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { registrarLog } from '../servicos/servico-logs';
import { criarNotificacoes, removerNotificacoesPorEntidade } from '../servicos/servico-notificacoes';
const rotasAvisos = new Hono<{ Bindings: Env, Variables: { usuario: any } }>();

/**
 * Lista todos os avisos ativos (dentro do prazo de validade).
 * Utiliza cache nativo do Cloudflare para performance.
 */
rotasAvisos.get('/', autenticacaoRequerida(), verificarPermissao('avisos:visualizar'), async (c: Context) => {
    // Fase 1 - Cacheamento nativo
    const cache = await caches.open('avisos-cache');
    const cacheKey = c.req.url;
    const cachedRes = await cache.match(cacheKey);
    if (cachedRes) return cachedRes;

    const { DB } = c.env;

    try {
        const { results } = await DB.prepare(`
      SELECT a.id, a.titulo, a.conteudo, a.prioridade, a.criado_em, a.expira_em,
             u.id as criador_id, u.nome as criador_nome, u.foto_perfil as criador_foto
      FROM avisos a
      JOIN usuarios u ON a.criado_por = u.id
      WHERE (a.expira_em IS NULL OR datetime(a.expira_em) >= datetime('now')) 
      AND a.arquivado = 0
      ORDER BY a.criado_em DESC
    `).all();

        // Map para o formato esperado pelo frontend
        const formatado = results.map((r: any) => ({
            id: r.id,
            titulo: r.titulo,
            conteudo: r.conteudo,
            prioridade: r.prioridade,
            criado_em: r.criado_em,
            expira_em: r.expira_em,
            criado_por: {
                id: r.criador_id,
                nome: r.criador_nome,
                foto: r.criador_foto
            }
        }));

        const resposta = c.json(formatado);
        // s-maxage: 10 min na borda do Cloudflare, no-cache: navegador deve validar sempre
        resposta.headers.set('Cache-Control', 's-maxage=600, no-cache');
        await cache.put(cacheKey, resposta.clone());

        return resposta;
    } catch (erro) {
        console.error('[ERRO DB] GET /avisos', erro);
        return c.json({ erro: 'Falha ao buscar avisos' }, 500);
    }
});

// Criar aviso (Requer líder ou admin, validado em Etapa Superior ou frontend mock)
const CriarAvisoSchema = z.object({
    titulo: z.string().min(3),
    conteudo: z.string().optional().default(''),
    prioridade: z.enum(['info', 'importante', 'urgente']),
    expira_em: z.string().nullable().optional()
});

/**
 * Cria um novo aviso no mural e notifica os membros.
 * Requer permissão 'avisos:criar'.
 */
rotasAvisos.post('/', autenticacaoRequerida(), verificarPermissao('avisos:criar'), zValidator('json', CriarAvisoSchema), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const usuario = c.get('usuario') as any;
    const { titulo, conteudo, prioridade, expira_em } = (c.req as any).valid('json');

    try {
        const novoId = crypto.randomUUID();

        await DB.prepare(`
            INSERT INTO avisos (id, titulo, conteudo, prioridade, expira_em, criado_por)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(novoId, titulo, conteudo, prioridade, expira_em || null, usuario.id).run();

        // Workflow 12 - Notificações
        // Simplificado para 'todosOsUsuarios' já que backend da tabela Grupos/Equipes precisaria expansão (e schema atual de avisos não suporta)
        await criarNotificacoes(DB, {
            todosOsUsuarios: true,
            titulo: `Novo Aviso: ${titulo}`,
            mensagem: conteudo,
            tipo: 'aviso',
            link: '/app/avisos',
            entidadeId: novoId
        }, softhub_kv);

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'AVISO_CRIADO',
            modulo: 'avisos',
            descricao: `Aviso "${titulo}" criado para todos os membros`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'avisos',
            entidadeId: novoId,
            dadosNovos: { titulo, prioridade, expira_em }
        });

        // Invalida cache de avisos
        const cache = await caches.open('avisos-cache');
        await cache.delete(new URL('/api/avisos', c.req.url).toString());

        return c.json({ sucesso: true, id: novoId });
    } catch (erro) {
        return c.json({ erro: 'Falha ao criar aviso' }, 500);
    }
});

/**
 * Remove um aviso do mural (Hard Delete).
 * Lideranças ou o próprio autor podem remover.
 */
rotasAvisos.delete('/:id', autenticacaoRequerida(), async (c: Context) => {
    const { DB } = c.env;
    const id = c.req.param('id');
    const usuario = c.get('usuario') as any;

    try {
        // Busca o aviso para verificar o autor
        const avisoExistente = await DB.prepare('SELECT criado_por FROM avisos WHERE id = ?').bind(id).first() as { criado_por: string } | null;
        
        if (!avisoExistente) {
            return c.json({ erro: 'Aviso não encontrado' }, 404);
        }

        // Regra: ADMIN, usuários com permissão global OU o próprio criador podem remover
        const ehCriador = avisoExistente.criado_por === usuario.id;
        const ehAdmin = usuario.role === 'ADMIN';
        
        // Se não for admin nem criador, verificamos se tem a permissão global no KV/D1 (opcional mas seguro)
        if (!ehAdmin && !ehCriador) {
             // Aqui poderíamos chamar uma versão interna do verificarPermissao, 
             // mas para simplificar e seguir a regra do projeto solo: 
             // Se não for o criador e não for Admin/Liderança superior (validado via role ou permissão), negamos.
             // Para este caso, vamos considerar que apenas ADMIN ou Criador podem deletar por enquanto, 
             // ou expandir conforme a matriz de permissões se necessário.
             
             // Vamos manter a consistência com os outros módulos:
             const rolesLideranca = ['ADMIN', 'COORDENADOR', 'GESTOR', 'LIDER', 'SUBLIDER'];
             const ehLideranca = rolesLideranca.includes(usuario.role);

             if (!ehLideranca) {
                 return c.json({ erro: 'Você só pode remover seus próprios avisos.' }, 403);
             }
        }

        await DB.prepare('UPDATE avisos SET arquivado = 1 WHERE id = ?').bind(id).run();
        
        // Remove notificações vinculadas
        if (id) await removerNotificacoesPorEntidade(DB, id);
        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'AVISO_REMOVIDO',
            modulo: 'avisos',
            descricao: `Aviso de ${avisoExistente.criado_por} removido do mural`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'avisos',
            entidadeId: id,
            dadosAnteriores: { criado_por: avisoExistente.criado_por }
        });

        // Invalida cache de avisos
        const cache = await caches.open('avisos-cache');
        await cache.delete(new URL('/api/avisos', c.req.url).toString());

        return c.json({ sucesso: true });
    } catch (erro) {
        return c.json({ erro: 'Falha ao remover aviso' }, 500);
    }
});

export default rotasAvisos;
