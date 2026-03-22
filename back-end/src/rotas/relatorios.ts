import { Hono, Context } from 'hono';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { log } from '../utilitarios/logger';

const rotasRelatorios = new Hono<{ Bindings: Env, Variables: { usuario: any } }>();

/**
 * 📊 RELATÓRIO DE ESTRUTURA DE EQUIPES
 * Retorna contagem de membros por grupo e equipe, além de lideranças.
 */
rotasRelatorios.get('/equipes', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB, softhub_kv } = c.env;

    try {
        const cacheKey = 'relatorio:equipes';
        const cached = await softhub_kv?.get(cacheKey);
        if (cached) return c.json(JSON.parse(cached));

        // 1. Resumo de Grupos
        const gruposResumo = await DB.prepare(`
            SELECT
                g.id,
                g.nome,
                (SELECT nome FROM equipes WHERE id = g.equipe_id) as equipe_nome,
                (SELECT COUNT(*) FROM usuarios_organizacao WHERE grupo_id = g.id) as total_membros
            FROM grupos g
        `).all();

        // 2. Resumo de Equipes
        const equipesResumo = await DB.prepare(`
            SELECT 
                e.id,
                e.nome,
                (SELECT nome FROM usuarios WHERE id = e.lider_id) as lider_nome,
                (SELECT COUNT(*) FROM usuarios_organizacao WHERE equipe_id = e.id) as total_membros
            FROM equipes e
        `).all();

        const resposta = {
            grupos: gruposResumo.results,
            equipes: equipesResumo.results
        };

        await softhub_kv?.put(cacheKey, JSON.stringify(resposta), { expirationTtl: 900 }); // 15 min

        return c.json(resposta);
    } catch (erro: any) {
        log('error', '[RELATORIOS] Falha ao gerar relatório de equipes', { erro: erro.message });
        return c.json({ erro: 'Falha ao gerar relatório de equipes' }, 500);
    }
});

/**
 * 📅 RELATÓRIO GERAL DE FREQUÊNCIA
 * Retorna métricas agregadas de presença e justificativas.
 */
rotasRelatorios.get('/frequencia/geral', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const { data_inicio, data_fim } = c.req.query();

    const cacheKey = `relatorio:frequencia_geral:${data_inicio || 'auto'}_${data_fim || 'auto'}`;
    const cached = await softhub_kv?.get(cacheKey);
    if (cached) return c.json(JSON.parse(cached));

    const filtroData = data_inicio && data_fim 
        ? `AND registrado_em BETWEEN '${data_inicio}' AND '${data_fim}'`
        : `AND registrado_em >= date('now', '-30 days')`;

    const filtroDataJustificativa = data_inicio && data_fim 
        ? `AND criado_em BETWEEN '${data_inicio}' AND '${data_fim}'`
        : '';

    try {
        // Presenças diárias no período
        const presencasDiarias = await DB.prepare(`
            SELECT 
                date(registrado_em) as data,
                COUNT(DISTINCT usuario_id) as total_presentes
            FROM ponto_registros
            WHERE lower(tipo) = 'entrada'
            ${filtroData}
            GROUP BY date(registrado_em)
            ORDER BY data ASC
        `).all();

        // Status das justificativas no período
        const justificativasStatus = await DB.prepare(`
            SELECT 
                status,
                COUNT(*) as total
            FROM justificativas_ponto
            WHERE 1=1
            ${filtroDataJustificativa}
            GROUP BY status
        `).all();

        // Tipos de justificativas mais comuns no período
        const justificativasTipos = await DB.prepare(`
            SELECT 
                tipo,
                COUNT(*) as total
            FROM justificativas_ponto
            WHERE status = 'aprovada'
            ${filtroDataJustificativa}
            GROUP BY tipo
        `).all();

        // Lista detalhada de justificativas no período para auditoria
        const justificativasLista = await DB.prepare(`
            SELECT 
                j.id,
                u.nome as usuario_nome,
                j.tipo,
                j.status,
                j.motivo as descricao,
                j.criado_em
            FROM justificativas_ponto j
            JOIN usuarios u ON u.id = j.usuario_id
            WHERE 1=1
            ${filtroDataJustificativa}
            ORDER BY j.criado_em DESC
        `).all();

        const resposta = {
            tendencia: presencasDiarias.results,
            statusJustificativas: justificativasStatus.results,
            tiposJustificativas: justificativasTipos.results,
            justificativasLista: justificativasLista.results
        };

        if (softhub_kv) {
            try {
                await softhub_kv.put(cacheKey, JSON.stringify(resposta), { expirationTtl: 900 });
            } catch (e: any) {
                log('warn', '[RELATORIOS] Falha no cache KV', { erro: e.message, cacheKey });
            }
        }

        return c.json(resposta);
    } catch (erro: any) {
        log('error', '[RELATORIOS] Falha ao gerar relatório de frequência geral', { erro: erro.message });
        return c.json({ erro: 'Falha ao gerar relatório de frequência geral' }, 500);
    }
});

/**
 * 👤 RELATÓRIO DE FREQUÊNCIA POR MEMBRO
 * Retorna o histórico resumido de cada membro com base no período.
 */
rotasRelatorios.get('/frequencia/membros', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const { data_inicio, data_fim } = c.req.query();

    try {
        const cacheKey = `relatorio:frequencia_membros:${data_inicio || 'auto'}_${data_fim || 'auto'}`;
        const cached = await softhub_kv?.get(cacheKey);
        if (cached) return c.json(JSON.parse(cached));

        const subFiltroPonto = data_inicio && data_fim 
            ? `AND registrado_em BETWEEN '${data_inicio}' AND '${data_fim}'`
            : "";

        const subFiltroJustificativa = data_inicio && data_fim 
            ? `AND criado_em BETWEEN '${data_inicio}' AND '${data_fim}'`
            : "";

        const membrosFrequencia = await DB.prepare(`
            SELECT 
                u.id, 
                u.nome,
                u.email,
                (SELECT GROUP_CONCAT(e.nome) FROM usuarios_organizacao uo JOIN equipes e ON e.id = uo.equipe_id WHERE uo.usuario_id = u.id) as equipe_nome,
                (SELECT GROUP_CONCAT(g.nome) FROM usuarios_organizacao uo JOIN grupos g ON g.id = uo.grupo_id WHERE uo.usuario_id = u.id) as grupo_nome,
                (SELECT COUNT(DISTINCT date(registrado_em)) FROM ponto_registros WHERE usuario_id = u.id AND lower(tipo) = 'entrada' ${subFiltroPonto}) as dias_presentes,
                (SELECT GROUP_CONCAT(DISTINCT date(registrado_em)) FROM ponto_registros WHERE usuario_id = u.id AND lower(tipo) = 'entrada' ${subFiltroPonto}) as datas_presenca,
                (SELECT COUNT(*) FROM justificativas_ponto WHERE usuario_id = u.id AND status = 'aprovada' ${subFiltroJustificativa}) as justificativas_aprovadas,
                (SELECT MAX(registrado_em) FROM ponto_registros WHERE usuario_id = u.id) as ultima_batida
            FROM usuarios u
            ORDER BY u.nome ASC
        `).all();

        const resposta = {
            membros: membrosFrequencia.results
        };

        if (softhub_kv) {
            try {
                await softhub_kv.put(cacheKey, JSON.stringify(resposta), { expirationTtl: 900 });
            } catch (e: any) {
                log('warn', '[RELATORIOS] Falha no cache KV', { erro: e.message, cacheKey });
            }
        }

        return c.json(resposta);
    } catch (erro: any) {
        log('error', '[RELATORIOS] Falha ao gerar relatório de frequência por membro', { erro: erro.message });
        return c.json({ erro: 'Falha ao gerar relatório de frequência por membro' }, 500);
    }
});


export default rotasRelatorios;
