import { Hono, Context } from 'hono';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { validarRedeLocal } from '../middleware/rede';
import * as servico from '../servicos/servico-ponto';
import * as repo from '../repositorios/repo-ponto';
import { gerarLinhaCsv } from '../utilitarios/csv';
import { kvRateLimit } from '../middleware/rate-limit';
import { log } from '../utilitarios/logger';

const rotasPonto = new Hono<{ Bindings: Env, Variables: { usuario: any } }>({ strict: false });

/**
 * Retorna todos os dados de ponto necessários para o dashboard inicial.
 */
rotasPonto.get('/', autenticacaoRequerida(), async (c: Context) => {
    const usuario = c.get('usuario');
    try {
        const [hojeRes, historicoRes] = await Promise.all([
            repo.buscarRegistrosHoje(c.env.DB, usuario.id),
            repo.buscarHistoricoPonto(c.env.DB, usuario.id)
        ]);
        
        return c.json({ 
            hoje: hojeRes.results || [], 
            historico: historicoRes.results || [] 
        });
    } catch (e: any) {
        return c.json({ erro: 'Falha ao buscar dados de ponto', detalhe: e.message }, 500);
    }
});

/**
 * Registra uma entrada ou saída de ponto (Alias para /registrar).
 */
rotasPonto.post('/', 
    autenticacaoRequerida(), 
    validarRedeLocal, 
    kvRateLimit({ windowMs: 15 * 1000, limit: 1, identifier: 'user', keyPrefix: 'ponto_registrar' }),
    async (c: Context) => {
        const { tipo } = await c.req.json();
        const usuario = c.get('usuario');
        const ipOrigem = c.req.header('CF-Connecting-IP') ?? '0.0.0.0';

        if (!['entrada', 'saida'].includes(tipo)) {
            return c.json({ erro: 'Tipo de registro inválido.' }, 400);
        }

        try {
            const resultado = await servico.registrarPonto(
                { DB: c.env.DB, KV: c.env.softhub_kv }, 
                usuario, 
                tipo, 
                ipOrigem
            );
            return c.json(resultado);
        } catch (e: any) {
            return c.json({ erro: e.message }, 400);
        }
    }
);

/**
 * Registra uma entrada ou saída de ponto.
 * Requer estar na rede da UNIEURO e autenticação válida.
 */
rotasPonto.post('/registrar', 
    autenticacaoRequerida(), 
    validarRedeLocal, 
    kvRateLimit({ windowMs: 15 * 1000, limit: 1, identifier: 'user', keyPrefix: 'ponto_registrar' }),
    async (c: Context) => {
        const { tipo } = await c.req.json();
        const usuario = c.get('usuario');
        const ipOrigem = c.req.header('CF-Connecting-IP') ?? '0.0.0.0';

        if (!['entrada', 'saida'].includes(tipo)) {
            return c.json({ erro: 'Tipo de registro inválido.' }, 400);
        }

        try {
            const resultado = await servico.registrarPonto(
                { DB: c.env.DB, KV: c.env.softhub_kv }, 
                usuario, 
                tipo, 
                ipOrigem
            );
            return c.json(resultado);
        } catch (e: any) {
            return c.json({ erro: e.message }, 400);
        }
    }
);

/**
 * Retorna os registros do usuário autenticado no dia de hoje.
 */
rotasPonto.get('/hoje', autenticacaoRequerida(), async (c: Context) => {
    const usuario = c.get('usuario');
    try {
        const { results } = await repo.buscarRegistrosHoje(c.env.DB, usuario.id);
        return c.json({ registros: results });
    } catch (e: any) {
        return c.json({ erro: 'Falha ao buscar registros de hoje', detalhe: e.message }, 500);
    }
});

/**
 * Retorna o histórico recente de pontos do usuário.
 */
rotasPonto.get('/historico', autenticacaoRequerida(), async (c: Context) => {
    const usuario = c.get('usuario');
    try {
        const { results } = await repo.buscarHistoricoPonto(c.env.DB, usuario.id);
        return c.json({ historico: results });
    } catch (e: any) {
        return c.json({ erro: 'Falha ao buscar histórico', detalhe: e.message }, 500);
    }
});

/**
 * Exporta registros de ponto em formato CSV.
 * Requer permissão 'ponto:exportar'.
 */
rotasPonto.get('/exportar', 
    autenticacaoRequerida(), 
    verificarPermissao('ponto:exportar'), 
    async (c: Context) => {
        const { usuarioId, mes, ano } = c.req.query();

        try {
            const { results } = await repo.buscarParaExportacao(c.env.DB, usuarioId, mes, ano);

            const cabecalho = gerarLinhaCsv(["Nome", "Tipo", "Data", "Hora", "IP"]) + "\n";
            const linhas = (results || []).map((r: any) => {
                const data = new Date(r.registrado_em || Date.now());
                return gerarLinhaCsv([
                    r.nome,
                    r.tipo,
                    data.toLocaleDateString('pt-BR'),
                    data.toLocaleTimeString('pt-BR'),
                    r.ip_origem
                ]);
            }).join("\n");

            return c.text(cabecalho + linhas, 200, {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="relatorio_ponto_${mes || 'geral'}.csv"`
            });
        } catch (e: any) {
            return c.json({ erro: 'Falha ao exportar CSV', detalhe: e.message }, 500);
        }
    }
);

/**
 * Retorna os membros que estão atualmente com o ponto aberto.
 */
rotasPonto.get('/online', autenticacaoRequerida(), async (c: Context) => {
    const { softhub_kv } = c.env;
    if (!softhub_kv) return c.json({ online: [] });

    try {
        const { keys } = await softhub_kv.list({ prefix: 'presenca:', limit: 100 });
        const membros = [];

        for (const key of keys) {
            const val = await softhub_kv.get(key.name);
            if (val) {
                try {
                    membros.push(JSON.parse(val));
                } catch (e) {}
            }
        }
        return c.json({ online: membros });
    } catch (e: any) {
        log('error', '[PONTO-ONLINE] Falha ao listar membros online', { erro: e.message });
        return c.json({ online: [] });
    }
});

/**
 * Heartbeat de presença para manter o usuário online no sistema.
 */
rotasPonto.post('/presenca', autenticacaoRequerida(), async (c: Context) => {
    const { softhub_kv } = c.env;
    const usuario = c.get('usuario');
    
    if (!softhub_kv) return c.json({ ok: true });

    try {
        const chave = `presenca:${usuario.id}`;
        const data = await softhub_kv.get(chave);
        
        // Se já houver registro de presença (ponto aberto), renovamos o TTL
        if (data) {
            await softhub_kv.put(chave, data, { expirationTtl: 28800 }); // 8 horas
        }
        
        // Heartbeat genérico (opcional, para saber quem está no app mesmo sem ponto)
        await softhub_kv.put(`heartbeat:${usuario.id}`, 'true', { expirationTtl: 600 }); // 10 minutos
        
        return c.json({ ok: true });
    } catch (e: any) {
        // Heartbeat não deve falhar a experiência do usuário
        return c.json({ ok: true });
    }
});

export default rotasPonto;