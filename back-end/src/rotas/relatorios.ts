import { Hono, Context } from 'hono';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { log } from '../utilitarios/logger';

const rotasRelatorios = new Hono<{ Bindings: Env, Variables: { usuario: any } }>();

/**
 * 📊 RELATÓRIO DE ESTRUTURA DE EQUIPES
 * Retorna contagem de membros por grupo e equipe.
 */
rotasRelatorios.get('/equipes', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB, softhub_kv } = c.env;

    try {
        const cacheKey = 'relatorio:equipes';
        if (softhub_kv) {
            const cached = await softhub_kv.get(cacheKey);
            if (cached) {
                try { return c.json(JSON.parse(cached)); } catch(e) { /* ignore cache error */ }
            }
        }

        const gruposResumo = await DB.prepare(`
            SELECT g.id, g.nome, e.nome as equipe_nome,
                   (SELECT COUNT(*) FROM usuarios_organizacao WHERE grupo_id = g.id) as total_membros
            FROM grupos g
            LEFT JOIN equipes e ON e.id = g.equipe_id
        `).all();

        const equipesResumo = await DB.prepare(`
            SELECT e.id, e.nome, u.nome as lider_nome,
                   (SELECT COUNT(*) FROM usuarios_organizacao WHERE equipe_id = e.id) as total_membros
            FROM equipes e
            LEFT JOIN usuarios u ON u.id = e.lider_id
        `).all();

        const resposta = {
            grupos: gruposResumo.results || [],
            equipes: equipesResumo.results || []
        };

        if (softhub_kv) {
            await softhub_kv.put(cacheKey, JSON.stringify(resposta), { expirationTtl: 900 });
        }

        return c.json(resposta);
    } catch (erro: any) {
        log('error', '[RELATORIOS-EQUIPES] Falha', { erro: erro.message });
        return c.json({ erro: 'Falha ao gerar relatório de equipes' }, 500);
    }
});

/**
 * 📅 RELATÓRIO GERAL DE FREQUÊNCIA
 */
rotasRelatorios.get('/frequencia/geral', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const { data_inicio, data_fim } = c.req.query();

    const cacheKey = `relatorio:freq_geral:${data_inicio || 'all'}_${data_fim || 'all'}`;
    
    try {
        if (softhub_kv) {
            const cached = await softhub_kv.get(cacheKey);
            if (cached) {
                try { return c.json(JSON.parse(cached)); } catch(e) {}
            }
        }

        const dataInicio = data_inicio || '2000-01-01';
        const dataFim = data_fim || '2100-12-31';
        const fimComHora = `${dataFim} 23:59:59`;

        log('debug', '[RELATORIOS-GERAL] Iniciando processamento', { dataInicio, dataFim });

        // 1. Tendência de Presença
        log('debug', '[RELATORIOS-GERAL] Buscando presenças...');
        const presencas = await DB.prepare(`
            SELECT date(registrado_em) as data, COUNT(DISTINCT usuario_id) as total_presentes
            FROM ponto_registros 
            WHERE lower(tipo) = 'entrada' 
            AND registrado_em BETWEEN ? AND ?
            GROUP BY 1 ORDER BY 1 ASC
        `).bind(dataInicio, fimComHora).all();

        // 2. Status das Justificativas (Pendente, Aprovado, etc)
        log('debug', '[RELATORIOS-GERAL] Buscando status de justificativas...');
        const justStatus = await DB.prepare(`
            SELECT status, COUNT(*) as total FROM justificativas_ponto
            WHERE criado_em BETWEEN ? AND ?
            GROUP BY 1
        `).bind(dataInicio, fimComHora).all();

        // 3. Tipos das Justificativas (Saúde, Equipamento, etc)
        log('debug', '[RELATORIOS-GERAL] Buscando tipos de justificativas...');
        const justTipos = await DB.prepare(`
            SELECT tipo, COUNT(*) as total FROM justificativas_ponto
            WHERE criado_em BETWEEN ? AND ?
            GROUP BY 1
        `).bind(dataInicio, fimComHora).all();

        // 4. Lista Recente para Auditoria
        log('debug', '[RELATORIOS-GERAL] Buscando lista de justificativas...');
        const justLista = await DB.prepare(`
            SELECT j.id, u.nome as usuario_nome, j.tipo, j.status, j.motivo as descricao, j.criado_em
            FROM justificativas_ponto j
            JOIN usuarios u ON u.id = j.usuario_id
            WHERE j.criado_em BETWEEN ? AND ?
            ORDER BY j.criado_em DESC LIMIT 100
        `).bind(dataInicio, fimComHora).all();

        const resposta = {
            tendencia: presencas.results || [],
            statusJustificativas: justStatus.results || [],
            tiposJustificativas: justTipos.results || [],
            justificativasLista: justLista.results || []
        };

        if (softhub_kv) {
            await softhub_kv.put(cacheKey, JSON.stringify(resposta), { expirationTtl: 900 });
        }

        return c.json(resposta);
    } catch (erro: any) {
        log('error', '[RELATORIOS-GERAL] Falha crítica', { 
            erro: erro.message, 
            stack: erro.stack,
            params: { data_inicio, data_fim }
        });
        return c.json({ erro: 'Falha técnica no relatório geral', detalhe: erro.message }, 500);
    }
});

/**
 * 👤 RELATÓRIO DE FREQUÊNCIA POR MEMBRO
 */
rotasRelatorios.get('/frequencia/membros', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const { data_inicio, data_fim } = c.req.query();

    try {
        const filtro = data_inicio && data_fim 
            ? `AND registrado_em BETWEEN '${data_inicio}' AND '${data_fim} 23:59:59'`
            : "";

        const membros = await DB.prepare(`
            SELECT u.id, u.nome, u.email,
                (SELECT COUNT(DISTINCT date(registrado_em)) FROM ponto_registros WHERE usuario_id = u.id AND lower(tipo) = 'entrada' ${filtro}) as total_dias,
                (SELECT SUM(tempo) FROM (
                    SELECT usuario_id, registrado_em, 
                           (julianday(LEAD(registrado_em) OVER (PARTITION BY usuario_id, date(registrado_em) ORDER BY registrado_em)) - julianday(registrado_em)) * 1440 as tempo
                    FROM ponto_registros
                    WHERE lower(tipo) IN ('entrada', 'saida') ${filtro}
                ) WHERE usuario_id = u.id AND tempo > 0) as total_horas
            FROM usuarios u
            WHERE u.arquivado = 0
            ORDER BY u.nome ASC
        `).all();

        return c.json({ membros: membros.results || [] });
    } catch (erro: any) {
        log('error', '[RELATORIOS-MEMBROS] Falha', { erro: erro.message });
        return c.json({ erro: 'Falha no relatório de membros' }, 500);
    }
});

/**
 * 👤 EXTRATO INDIVIDUAL DETALHADO
 * Pareia entradas/saídas para calcular tempo.
 */
rotasRelatorios.get('/membro/:id/frequencia', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    const { id } = c.req.param();
    const { inicio, fim } = c.req.query();

    try {
        const filtro = inicio && fim 
            ? `AND registrado_em BETWEEN '${inicio}' AND '${fim} 23:59:59'`
            : "";

        const sessoes = await DB.prepare(`
            SELECT 
                date(registrado_em) as data,
                MIN(CASE WHEN lower(tipo) = 'entrada' THEN registrado_em END) as entrada,
                MAX(CASE WHEN lower(tipo) = 'saida' THEN registrado_em END) as saida,
                ip_origem as ip_entrada
            FROM ponto_registros
            WHERE usuario_id = ? ${filtro}
            GROUP BY date(registrado_em)
            ORDER BY data DESC
        `).bind(id).all();

        const formatado = (sessoes.results || []).map((s: any) => {
            const tEntrada = s.entrada ? new Date(s.entrada).getTime() : 0;
            const tSaida = s.saida ? new Date(s.saida).getTime() : 0;
            const diffMin = tEntrada && tSaida ? Math.round((tSaida - tEntrada) / 60000) : 0;
            
            return {
                data: s.data,
                entrada: s.entrada ? s.entrada.split('T')[1].substring(0, 5) : '--:--',
                saida: s.saida ? s.saida.split('T')[1].substring(0, 5) : '--:--',
                tempo_total: diffMin,
                ip_entrada: s.ip_entrada,
                status: diffMin > 0 ? 'completo' : 'aberto'
            };
        });

        return c.json({ registros: formatado });
    } catch (erro: any) {
        log('error', '[RELATORIOS-INDIVIDUAL] Falha', { id, erro: erro.message });
        return c.json({ erro: 'Erro ao processar extrato individual' }, 500);
    }
});

/**
 * 📊 EXPORTAR MAPA DE PRESENÇA (MATRIZ SEMESTRAL)
 */
rotasRelatorios.get('/exportar/mapa-semestral', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    let ini = c.req.query('inicio') || '2025-01-01';
    let fim = c.req.query('fim') || '2025-06-30';

    try {
        const membros = await DB.prepare(`SELECT id, nome FROM usuarios WHERE arquivado = 0 ORDER BY nome`).all();
        const membrosLista = membros.results || [];
        
        const sessoes = await DB.prepare(`
            SELECT 
                usuario_id, 
                date(registrado_em) as dia,
                (julianday(MAX(CASE WHEN lower(tipo) = 'saida' THEN registrado_em END)) - 
                 julianday(MIN(CASE WHEN lower(tipo) = 'entrada' THEN registrado_em END))) * 1440 as minutos
            FROM ponto_registros
            WHERE registrado_em BETWEEN ? AND ?
            GROUP BY usuario_id, date(registrado_em)
        `).bind(ini, `${fim} 23:59:59`).all();
        const sessoesLista = sessoes.results || [];

        const mapa = new Map();
        sessoesLista.forEach((s: any) => mapa.set(`${s.usuario_id}_${s.dia}`, s.minutos || 0));

        const datas: string[] = [];
        let cur = new Date(ini);
        const end = new Date(fim);
        while (cur <= end) {
            datas.push(cur.toISOString().split('T')[0]);
            cur.setDate(cur.getDate() + 1);
            if (datas.length > 200) break;
        }

        let csv = '\uFEFFMembro;' + datas.join(';') + ';Total Horas\n';
        membrosLista.forEach((m: any) => {
            let total = 0;
            let linha = `${m.nome}`;
            datas.forEach(d => {
                const min = mapa.get(`${m.id}_${d}`) || 0;
                total += min;
                linha += `;${min > 0 ? (min/60).toFixed(1).replace('.', ',') : ''}`;
            });
            linha += `;${(total/60).toFixed(1).replace('.', ',')}\n`;
            csv += linha;
        });

        return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="mapa_frequencia.csv"` } });
    } catch (erro: any) {
        log('error', '[RELATORIOS-MAPA] Falha', { erro: erro.message });
        return c.json({ erro: 'Falha técnica na matriz' }, 500);
    }
});

/**
 * 🚀 DEMAIS RELATÓRIOS (DESEMPENHO E PROJETOS)
 */
rotasRelatorios.get('/projetos', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    try {
        const res = await DB.prepare(`
            SELECT p.id, p.nome, p.publico,
                (SELECT COUNT(*) FROM tarefas WHERE projeto_id = p.id) as total_tasks,
                (SELECT COUNT(*) FROM tarefas WHERE projeto_id = p.id AND status = 'concluida') as done
            FROM projetos p WHERE arquivado = 0
        `).all();
        return c.json({ projetos: res.results || [] });
    } catch (e: any) { return c.json({ erro: e.message }, 500); }
});

rotasRelatorios.get('/desempenho-membros', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    try {
        const res = await DB.prepare(`
            SELECT u.nome, u.email,
                (SELECT COUNT(*) FROM tarefas_responsaveis tr JOIN tarefas t ON t.id = tr.tarefa_id WHERE tr.usuario_id = u.id AND t.status = 'concluida') as entregas
            FROM usuarios u WHERE arquivado = 0 ORDER BY entregas DESC LIMIT 20
        `).all();
        return c.json({ desempenho: res.results || [] });
    } catch (e: any) { return c.json({ erro: e.message }, 500); }
});

export default rotasRelatorios;
