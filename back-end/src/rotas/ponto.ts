import { Hono, Context } from 'hono';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { validarRedeLocal } from '../middleware/rede';
import * as servico from '../servicos/servico-ponto';
import * as repo from '../repositorios/repo-ponto';
import { gerarLinhaCsv } from '../utilitarios/csv';
import { kvRateLimit } from '../middleware/rate-limit';

const rotasPonto = new Hono<{ Bindings: Env }>();

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

export default rotasPonto;