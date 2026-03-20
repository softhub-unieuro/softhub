import { Hono, Context } from 'hono';
import { Env } from '../index';
import { autenticacaoRequerida } from '../middleware/auth';
import { registrarLog } from '../servicos/servico-logs';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const rotasPerfil = new Hono<{ Bindings: Env; Variables: { usuario: any } }>();

// ─── GET /me ──────────────────────────────────────────────────────────────────
rotasPerfil.get('/me', autenticacaoRequerida(), async (c: Context) => {
    const { DB } = c.env;
    const usuarioLogado = c.get('usuario');

    try {
        // OTIMIZAÇÃO: Batch de todas as consultas do perfil em uma única ida ao banco
        const [resUsuario, resOrg, resStatsTarefas, resStatsPonto, resUltimoPonto] = await DB.batch([
            DB.prepare(`SELECT id, nome, email, role, foto_perfil, foto_banner, bio, criado_em, github_url, linkedin_url, website_url FROM usuarios WHERE id = ?`).bind(usuarioLogado.id),
            DB.prepare(`
                SELECT 
                    GROUP_CONCAT(e.nome, ', ') as equipe_nome, 
                    GROUP_CONCAT(g.nome, ', ') as grupo_nome 
                FROM usuarios_organizacao uo 
                LEFT JOIN equipes e ON e.id = uo.equipe_id 
                LEFT JOIN grupos g ON g.id = uo.grupo_id 
                WHERE uo.usuario_id = ?
            `).bind(usuarioLogado.id),
            DB.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN t.status = 'concluida' THEN 1 ELSE 0 END) as concluidas FROM tarefas t JOIN tarefas_responsaveis tr ON tr.tarefa_id = t.id WHERE tr.usuario_id = ?`).bind(usuarioLogado.id),
            DB.prepare(`SELECT COUNT(DISTINCT DATE(registrado_em, '-3 hours')) as batidas FROM ponto_registros WHERE usuario_id = ? AND strftime('%m', registrado_em) = strftime('%m', 'now')`).bind(usuarioLogado.id),
            DB.prepare(`SELECT tipo FROM ponto_registros WHERE usuario_id = ? AND DATE(registrado_em, '-3 hours') = DATE('now', '-3 hours') ORDER BY registrado_em DESC LIMIT 1`).bind(usuarioLogado.id)
        ]);

        const usuario = resUsuario.results[0] as any;
        const organizacao = resOrg.results[0] as any;
        const statsTarefas = resStatsTarefas.results[0] as any;
        const statsPonto = resStatsPonto.results[0] as any;
        const ultimoPonto = resUltimoPonto.results[0] as any;

        if (!usuario) {
            console.error(`[PERFIL] Usuário não encontrado no banco: ${usuarioLogado.id}`);
            return c.json({ erro: 'Perfil não mapeado no sistema (ERR_D1_NOT_FOUND).' }, 404);
        }

        const total = Number(statsTarefas?.total || 0);
        const concluidas = Number(statsTarefas?.concluidas || 0);

        return c.json({
            perfil: {
                ...usuario,
                role: usuarioLogado.role, // 🛡️ USA A ROLE DO MIDDLEWARE (QUE POSSUI OVERRIDE DE BOOTSTRAP)
                is_bootstrap: usuarioLogado.ehDonoSistema, // Informa se é um admin de segurança
                equipe_nome: organizacao?.equipe_nome || 'S/ Equipe',
                grupo_nome: organizacao?.grupo_nome || 'S/ Grupo',
                esta_em_expediente: ultimoPonto?.tipo === 'entrada'
            },
            stats: {
                tarefas: {
                    total,
                    concluidas,
                    pendentes: total - concluidas,
                    aproveitamento: total > 0 ? Math.round((concluidas / total) * 100) : 0
                },
                ponto: {
                    batidasMes: Number(statsPonto?.batidas || 0),
                    estimativaHoras: Math.floor(Number(statsPonto?.batidas || 0) * 4)
                }
            }
        });
    } catch (e: any) {
        console.error('[PERFIL] Erro crítico ao buscar dados:', e);
        return c.json({ erro: 'Erro interno ao carregar seus dados.' }, 500);
    }
});

// ─── PATCH /me ────────────────────────────────────────────────────────────────
const UpdatePerfilSchema = z.object({
    nome: z.string().min(3).optional(),
    bio: z.string().max(500).optional(),
    foto_perfil: z.string().url().optional().or(z.literal('')),
    foto_banner: z.string().url().optional().or(z.literal('')),
    github_url: z.string().url().optional().or(z.literal('')),
    linkedin_url: z.string().url().optional().or(z.literal('')),
    website_url: z.string().url().optional().or(z.literal(''))
});

rotasPerfil.patch('/me', autenticacaoRequerida(), zValidator('json', UpdatePerfilSchema), async (c: Context) => {
    const { DB } = c.env;
    const usuarioLogado = c.get('usuario');
    const dados = await c.req.json();

    try {
        const sets: string[] = [];
        const values: any[] = [];

        if (dados.nome) { sets.push('nome = ?'); values.push(dados.nome); }
        if (dados.bio !== undefined) { sets.push('bio = ?'); values.push(dados.bio); }
        if (dados.foto_perfil !== undefined) { sets.push('foto_perfil = ?'); values.push(dados.foto_perfil || null); }
        if (dados.foto_banner !== undefined) { sets.push('foto_banner = ?'); values.push(dados.foto_banner || null); }
        if (dados.github_url !== undefined) { sets.push('github_url = ?'); values.push(dados.github_url || null); }
        if (dados.linkedin_url !== undefined) { sets.push('linkedin_url = ?'); values.push(dados.linkedin_url || null); }
        if (dados.website_url !== undefined) { sets.push('website_url = ?'); values.push(dados.website_url || null); }

        if (sets.length === 0) return c.json({ erro: 'Nenhum dado para atualizar.' }, 400);

        values.push(usuarioLogado.id);
        const query = `UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`;
        
        await DB.prepare(query).bind(...values).run();

        // Invalida cache de sessão
        const { softhub_kv } = c.env;
        if (softhub_kv) await softhub_kv.delete(`sessao:${usuarioLogado.id}`);

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'PERFIL_ATUALIZADO',
            modulo: 'perfil',
            descricao: `Usuário atualizou seus próprios dados de perfil.`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'usuarios',
            entidadeId: usuarioLogado.id
        });

        return c.json({ sucesso: true });
    } catch (e: any) {
        return c.json({ erro: 'Falha ao atualizar perfil.' }, 500);
    }
});


// ─── GET /:id ──────────────────────────────────────────────────────────────────
rotasPerfil.get('/:id', autenticacaoRequerida(), async (c: Context) => {
    const { DB } = c.env;
    const id = c.req.param('id');

    try {
        // OTIMIZAÇÃO: Batch de todas as consultas do perfil em uma única ida ao banco
        const [resUsuario, resOrg, resStatsTarefas, resStatsPonto, resUltimoPonto] = await DB.batch([
            DB.prepare(`SELECT id, nome, email, role, foto_perfil, foto_banner, bio, criado_em, github_url, linkedin_url, website_url FROM usuarios WHERE id = ?`).bind(id),
            DB.prepare(`
                SELECT 
                    GROUP_CONCAT(e.nome, ', ') as equipe_nome, 
                    GROUP_CONCAT(g.nome, ', ') as grupo_nome 
                FROM usuarios_organizacao uo 
                LEFT JOIN equipes e ON e.id = uo.equipe_id 
                LEFT JOIN grupos g ON g.id = uo.grupo_id 
                WHERE uo.usuario_id = ?
            `).bind(id),
            DB.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN t.status = 'concluida' THEN 1 ELSE 0 END) as concluidas FROM tarefas t JOIN tarefas_responsaveis tr ON tr.tarefa_id = t.id WHERE tr.usuario_id = ?`).bind(id),
            DB.prepare(`SELECT COUNT(DISTINCT DATE(registrado_em, '-3 hours')) as batidas FROM ponto_registros WHERE usuario_id = ? AND strftime('%m', registrado_em) = strftime('%m', 'now')`).bind(id),
            DB.prepare(`SELECT tipo FROM ponto_registros WHERE usuario_id = ? AND DATE(registrado_em, '-3 hours') = DATE('now', '-3 hours') ORDER BY registrado_em DESC LIMIT 1`).bind(id)
        ]);

        const usuario = resUsuario.results[0] as any;
        const organizacao = resOrg.results[0] as any;
        const statsTarefas = resStatsTarefas.results[0] as any;
        const statsPonto = resStatsPonto.results[0] as any;
        const ultimoPonto = resUltimoPonto.results[0] as any;

        if (!usuario) return c.json({ erro: 'Usuário não encontrado.' }, 404);

        const total = Number(statsTarefas?.total || 0);
        const concluidas = Number(statsTarefas?.concluidas || 0);

        return c.json({
            perfil: {
                ...usuario,
                equipe_nome: organizacao?.equipe_nome || 'S/ Equipe',
                grupo_nome: organizacao?.grupo_nome || 'S/ Grupo',
                esta_em_expediente: ultimoPonto?.tipo === 'entrada'
            },
            stats: {
                tarefas: {
                    total,
                    concluidas,
                    pendentes: total - concluidas,
                    aproveitamento: total > 0 ? Math.round((concluidas / total) * 100) : 0
                },
                ponto: {
                    batidasMes: Number(statsPonto?.batidas || 0),
                    estimativaHoras: Math.floor(Number(statsPonto?.batidas || 0) * 4)
                }
            }
        });
    } catch (e: any) {
        return c.json({ erro: 'Erro ao carregar perfil.' }, 500);
    }
});

// ─── GET /:id/radar ──────────────────────────────────────────────────────────── (Fase 3)
rotasPerfil.get('/:id/radar', autenticacaoRequerida(), async (c: Context) => {
    const { DB } = c.env;
    const usuarioLogado = c.get('usuario');
    let id = c.req.param('id');

    if (id === 'me') {
        id = usuarioLogado.id;
    }

    try {
        const query = `
            SELECT 
                COALESCE(t.modulo, 'Geral') as area,
                AVG(t.nota_aprendizado) as nota,
                COUNT(*) as entregas
            FROM tarefas t
            JOIN tarefas_responsaveis tr ON tr.tarefa_id = t.id
            WHERE tr.usuario_id = ? AND t.status = 'concluida' AND t.nota_aprendizado > 0
            GROUP BY t.modulo
            ORDER BY nota DESC
        `;
        const { results } = await DB.prepare(query).bind(id).all();

        if (!results || results.length === 0) {
            return c.json([
                { area: 'Back-end', nota: 0, entregas: 0 },
                { area: 'Front-end', nota: 0, entregas: 0 },
                { area: 'DevOps', nota: 0, entregas: 0 },
                { area: 'UX/UI', nota: 0, entregas: 0 },
                { area: 'Lógica', nota: 0, entregas: 0 }
            ]);
        }

        return c.json(results);
    } catch (e) {
        console.error('[ERRO Radar]', e);
        return c.json({ erro: 'Falha ao gerar radar de competências' }, 500);
    }
});

export default rotasPerfil;
