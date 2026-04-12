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
            WHERE g.arquivado = 0
        `).all();

        const equipesResumo = await DB.prepare(`
            SELECT e.id, e.nome, u.nome as lider_nome,
                   (SELECT COUNT(*) FROM usuarios_organizacao WHERE equipe_id = e.id) as total_membros
            FROM equipes e
            LEFT JOIN usuarios u ON u.id = e.lider_id
            WHERE e.arquivado = 0
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
                try { return c.json(JSON.parse(cached)); } catch(e) { /* ignore cache error */ }
            }
        }

        const dataInicio = data_inicio || '2000-01-01';
        const dataFim = data_fim || '2100-12-31';
        const fimComHora = `${dataFim} 23:59:59`;

        // 1. Tendência de Presença (Membros únicos por dia)
        const presencas = await DB.prepare(`
            SELECT date(registrado_em) as data, COUNT(DISTINCT usuario_id) as total_presentes
            FROM ponto_registros 
            WHERE registrado_em BETWEEN ? AND ?
            GROUP BY 1 ORDER BY 1 ASC
        `).bind(dataInicio, fimComHora).all();

        // 2. Status das Justificativas
        const justStatus = await DB.prepare(`
            SELECT status, COUNT(*) as total FROM justificativas_ponto
            WHERE data BETWEEN ? AND ?
            GROUP BY 1
        `).bind(dataInicio, dataFim).all();

        // 3. Tipos das Justificativas
        const justTipos = await DB.prepare(`
            SELECT tipo, COUNT(*) as total FROM justificativas_ponto
            WHERE data BETWEEN ? AND ?
            GROUP BY 1
        `).bind(dataInicio, dataFim).all();

        // 4. Lista para Auditoria
        const justLista = await DB.prepare(`
            SELECT j.id, u.nome as usuario_nome, j.tipo, j.status, j.motivo as descricao, j.criado_em
            FROM justificativas_ponto j
            JOIN usuarios u ON u.id = j.usuario_id
            WHERE j.data BETWEEN ? AND ?
            ORDER BY j.criado_em DESC LIMIT 100
        `).bind(dataInicio, dataFim).all();

        const resposta = {
            tendencia: presencas.results || [],
            statusJustificativas: justStatus.results || [],
            tiposJustificativas: justTipos.results || [],
            justificativasLista: justLista.results || []
        };

        if (softhub_kv) {
            await softhub_kv.put(cacheKey, JSON.stringify(resposta), { expirationTtl: 300 });
        }

        return c.json(resposta);
    } catch (erro: any) {
        log('error', '[RELATORIOS-GERAL] Falha crítica', { erro: erro.message });
        return c.json({ erro: 'Falha técnica no relatório geral' }, 500);
    }
});

/**
 * 👤 RELATÓRIO DE FREQUÊNCIA POR MEMBRO
 */
rotasRelatorios.get('/frequencia/membros', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    const { data_inicio, data_fim } = c.req.query();

    try {
        const dataInicio = data_inicio || '2000-01-01';
        const dataFim = data_fim || '2100-12-31';
        const fimComHora = `${dataFim} 23:59:59`;

        const query = `
            SELECT 
                u.id, u.nome, u.email,
                e.nome as equipe_nome,
                g.nome as grupo_nome,
                (SELECT COUNT(DISTINCT date(registrado_em)) 
                 FROM ponto_registros 
                 WHERE usuario_id = u.id AND registrado_em BETWEEN ? AND ?) as dias_presentes,
                (SELECT MAX(registrado_em) 
                 FROM ponto_registros 
                 WHERE usuario_id = u.id) as ultima_batida,
                (SELECT COUNT(*) 
                 FROM justificativas_ponto 
                 WHERE usuario_id = u.id AND status = 'aprovado' AND data BETWEEN ? AND ?) as justificativas_aprovadas,
                (SELECT 
                    SUM(
                        (julianday(COALESCE(p2.registrado_em, datetime('now'))) - julianday(p1.registrado_em)) * 1440
                    )
                 FROM ponto_registros p1
                 LEFT JOIN ponto_registros p2 ON p2.usuario_id = p1.usuario_id 
                    AND p2.tipo = 'saida'
                    AND p2.registrado_em = (
                        SELECT MIN(registrado_em) 
                        FROM ponto_registros 
                        WHERE usuario_id = p1.usuario_id AND tipo = 'saida' AND registrado_em > p1.registrado_em
                    )
                 WHERE p1.usuario_id = u.id 
                   AND p1.tipo = 'entrada'
                   AND p1.registrado_em BETWEEN ? AND ?
                ) as total_minutos
            FROM usuarios u
            LEFT JOIN usuarios_organizacao uo ON uo.usuario_id = u.id
            LEFT JOIN equipes e ON e.id = uo.equipe_id
            LEFT JOIN grupos g ON g.id = uo.grupo_id
            WHERE u.arquivado = 0
            GROUP BY u.id
            ORDER BY u.nome ASC
        `;

        const membros = await DB.prepare(query)
            .bind(dataInicio, fimComHora, dataInicio, dataFim, dataInicio, fimComHora)
            .all();

        // Converte minutos para horas decimais como o frontend espera
        const resultados = (membros.results || []).map((m: any) => ({
            ...m,
            total_horas: m.total_minutos || 0
        }));

        return c.json({ membros: resultados });
    } catch (erro: any) {
        log('error', '[RELATORIOS-MEMBROS] Falha', { erro: erro.message });
        return c.json({ erro: 'Falha no relatório de membros' }, 500);
    }
});

/**
 * 👤 EXTRATO INDIVIDUAL DETALHADO
 */
rotasRelatorios.get('/membro/:id/frequencia', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    const { id } = c.req.param();
    const { inicio, fim } = c.req.query();

    try {
        const dataInicio = inicio || '2000-01-01';
        const dataFim = fim || '2100-12-31';
        const fimComHora = `${dataFim} 23:59:59`;

        const sessoes = await DB.prepare(`
            SELECT 
                date(registrado_em) as data,
                MIN(CASE WHEN tipo = 'ENTRADA' THEN registrado_em END) as entrada,
                MAX(CASE WHEN tipo = 'SAIDA' THEN registrado_em END) as saida,
                MAX(CASE WHEN tipo = 'ENTRADA' THEN ip_origem END) as ip_entrada,
                MAX(CASE WHEN tipo = 'SAIDA' THEN ip_origem END) as ip_saida
            FROM ponto_registros
            WHERE usuario_id = ? AND registrado_em BETWEEN ? AND ?
            GROUP BY date(registrado_em)
            ORDER BY data DESC
        `).bind(id, dataInicio, fimComHora).all();

        const formatado = (sessoes.results || []).map((s: any) => {
            const tEntrada = s.entrada ? new Date(s.entrada).getTime() : 0;
            const tSaida = s.saida ? new Date(s.saida).getTime() : 0;
            const diffMin = tEntrada && tSaida && tSaida > tEntrada ? Math.round((tSaida - tEntrada) / 60000) : 0;
            
            return {
                data: s.data,
                entrada: s.entrada,
                saida: s.saida,
                ip_entrada: s.ip_entrada,
                ip_saida: s.ip_saida,
                tempo_total: diffMin,
                status: s.saida ? 'completo' : 'aberto'
            };
        });

        return c.json({ registros: formatado });
    } catch (erro: any) {
        log('error', '[RELATORIOS-INDIVIDUAL] Falha', { id, erro: erro.message });
        return c.json({ erro: 'Erro ao processar extrato individual' }, 500);
    }
});

/**
 * 📊 RELATÓRIO DE PROJETOS
 */
rotasRelatorios.get('/projetos', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    try {
        const res = await DB.prepare(`
            SELECT 
                p.id, p.nome, p.publico,
                (SELECT COUNT(*) FROM tarefas WHERE projeto_id = p.id AND arquivado = 0) as total_tarefas,
                (SELECT COUNT(*) FROM tarefas WHERE projeto_id = p.id AND status = 'concluida' AND arquivado = 0) as concluidas,
                (SELECT COUNT(*) FROM tarefas WHERE projeto_id = p.id AND status != 'concluida' AND arquivado = 0) as em_aberto,
                (SELECT COUNT(*) FROM tarefas WHERE projeto_id = p.id AND prioridade = 'urgente' AND status != 'concluida' AND arquivado = 0) as urgentes_pendentes
            FROM projetos p 
            WHERE arquivado = 0
            ORDER BY p.nome ASC
        `).all();
        return c.json({ projetos: res.results || [] });
    } catch (e: any) { 
        return c.json({ erro: 'Falha no relatório de projetos' }, 500); 
    }
});

/**
 * 🚀 RANKING DE DESEMPENHO
 */
rotasRelatorios.get('/desempenho-membros', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    try {
        const res = await DB.prepare(`
            SELECT 
                u.id, u.nome, u.email,
                (SELECT COUNT(*) 
                 FROM tarefas_responsaveis tr 
                 JOIN tarefas t ON t.id = tr.tarefa_id 
                 WHERE tr.usuario_id = u.id AND t.status = 'concluida' AND t.arquivado = 0) as entregas_totais,
                (SELECT COUNT(*) 
                 FROM tarefas_responsaveis tr 
                 JOIN tarefas t ON t.id = tr.tarefa_id 
                 WHERE tr.usuario_id = u.id AND t.status IN ('in_progress', 'em_revisao') AND t.arquivado = 0) as em_andamento,
                (SELECT MAX(t.data_conclusao) 
                 FROM tarefas_responsaveis tr 
                 JOIN tarefas t ON t.id = tr.tarefa_id 
                 WHERE tr.usuario_id = u.id AND t.status = 'concluida') as ultima_entrega
            FROM usuarios u 
            WHERE u.arquivado = 0 
            ORDER BY entregas_totais DESC, em_andamento DESC
            LIMIT 50
        `).all();
        return c.json({ desempenho: res.results || [] });
    } catch (e: any) { 
        return c.json({ erro: 'Falha no ranking de desempenho' }, 500); 
    }
});

/**
 * 📊 EXPORTAÇÕES (CSV/BLOB)
 */
rotasRelatorios.get('/exportar/ponto', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    const { data_inicio, data_fim } = c.req.query();

    try {
        const dataInicio = data_inicio || '2000-01-01';
        const dataFim = data_fim || '2100-12-31';
        const fimComHora = `${dataFim} 23:59:59`;

        const registros = await DB.prepare(`
            SELECT 
                u.nome as Membro, 
                date(p.registrado_em) as Data,
                p.tipo as Tipo,
                strftime('%H:%M', p.registrado_em) as Hora,
                p.ip_origem as IP
            FROM ponto_registros p
            JOIN usuarios u ON u.id = p.usuario_id
            WHERE p.registrado_em BETWEEN ? AND ?
            ORDER BY u.nome ASC, p.registrado_em ASC
        `).bind(dataInicio, fimComHora).all();

        const lista = registros.results || [];
        let csv = '\uFEFFMembro;Data;Tipo;Hora;IP\n';
        lista.forEach((r: any) => {
            csv += `${r.Membro};${r.Data};${r.Tipo};${r.Hora};${r.IP}\n`;
        });

        return new Response(csv, { 
            headers: { 
                'Content-Type': 'text/csv; charset=utf-8', 
                'Content-Disposition': `attachment; filename="ponto_${dataInicio}_${dataFim}.csv"` 
            } 
        });
    } catch (e: any) { return c.json({ erro: 'Falha ao exportar CSV' }, 500); }
});

rotasRelatorios.get('/exportar/mapa-semestral', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    const ini = c.req.query('inicio') || '2025-01-01';
    const fim = c.req.query('fim') || '2025-06-30';

    try {
        const membros = await DB.prepare(`SELECT id, nome FROM usuarios WHERE arquivado = 0 ORDER BY nome`).all();
        const membrosLista = membros.results || [];
        
        const sessoes = await DB.prepare(`
            SELECT 
                p1.usuario_id, 
                date(p1.registrado_em) as dia,
                SUM((julianday(p2.registrado_em) - julianday(p1.registrado_em)) * 1440) as minutos
            FROM ponto_registros p1
            JOIN ponto_registros p2 ON p2.usuario_id = p1.usuario_id 
                AND date(p2.registrado_em) = date(p1.registrado_em)
                AND p2.registrado_em > p1.registrado_em
                AND p2.tipo = 'saida'
            WHERE p1.tipo = 'entrada' 
              AND p1.registrado_em BETWEEN ? AND ?
            GROUP BY p1.usuario_id, date(p1.registrado_em)
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

        return new Response(csv, { 
            headers: { 
                'Content-Type': 'text/csv; charset=utf-8', 
                'Content-Disposition': `attachment; filename="mapa_semestre.csv"` 
            } 
        });
    } catch (e: any) { 
        return c.json({ erro: 'Falha ao exportar matriz semestral' }, 500); 
    }
});

export default rotasRelatorios;
