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

        if (softhub_kv) {
            try {
                await softhub_kv.put(cacheKey, JSON.stringify(resposta), { expirationTtl: 900 }); // 15 min
            } catch (kvError: any) {
                log('warn', '[RELATORIO-KV] Falha ao salvar cache (quota?)', { erro: kvError.message });
            }
        }

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
            } catch (kvError: any) {
                log('warn', '[RELATORIO-KV] Falha ao salvar cache consolidado', { erro: kvError.message });
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
            } catch (kvError: any) {
                log('warn', '[RELATORIO-KV] Falha ao salvar cache dashboard', { erro: kvError.message });
            }
        }

        return c.json(resposta);
    } catch (erro: any) {
        log('error', '[RELATORIOS] Falha ao gerar relatório de frequência por membro', { erro: erro.message });
        return c.json({ erro: 'Falha ao gerar relatório de frequência por membro' }, 500);
    }
});

/**
 * 🚀 RELATÓRIO DE DESEMPENHO DE PROJETOS
 * Métricas de entrega, backlog e saúde dos projetos ativos.
 */
rotasRelatorios.get('/projetos', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB } = c.env;

    try {
        const projetosProgresso = await DB.prepare(`
            SELECT 
                p.id,
                p.nome,
                p.publico,
                (SELECT COUNT(*) FROM tarefas WHERE projeto_id = p.id) as total_tarefas,
                (SELECT COUNT(*) FROM tarefas WHERE projeto_id = p.id AND status = 'concluida') as concluidas,
                (SELECT COUNT(*) FROM tarefas WHERE projeto_id = p.id AND status != 'concluida' AND status != 'arquivado') as em_aberto,
                (SELECT COUNT(*) FROM tarefas WHERE projeto_id = p.id AND prioridade = 'urgente' AND status != 'concluida') as urgentes_pendentes
            FROM projetos p
            WHERE p.arquivado = 0
            ORDER BY total_tarefas DESC
        `).all();

        return c.json({ projetos: projetosProgresso.results });
    } catch (erro: any) {
        log('error', '[RELATORIOS] Falha ao gerar relatório de projetos', { erro: erro.message });
        return c.json({ erro: 'Falha ao gerar relatório de desempenho de projetos' }, 500);
    }
});

/**
 * 🏆 RELATÓRIO DE PRODUTIVIDADE (DESEMPENHO POR MEMBRO)
 * Ranking de entregas e engajamento técnico.
 */
rotasRelatorios.get('/desempenho-membros', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB } = c.env;

    try {
        // Busca o ranking de membros com base nas tarefas onde são responsáveis
        const desempenho = await DB.prepare(`
            SELECT 
                u.id,
                u.nome,
                u.email,
                (SELECT COUNT(*) FROM tarefas t JOIN tarefas_responsaveis tr ON t.id = tr.tarefa_id WHERE tr.usuario_id = u.id AND t.status = 'concluida') as entregas_totais,
                (SELECT COUNT(*) FROM tarefas t JOIN tarefas_responsaveis tr ON t.id = tr.tarefa_id WHERE tr.usuario_id = u.id AND t.status IN ('in_progress', 'em_revisao')) as em_andamento,
                (SELECT MAX(t.data_conclusao) FROM tarefas t JOIN tarefas_responsaveis tr ON t.id = tr.tarefa_id WHERE tr.usuario_id = u.id AND t.status = 'concluida') as ultima_entrega
            FROM usuarios u
            WHERE u.id IN (SELECT DISTINCT usuario_id FROM tarefas_responsaveis)
            ORDER BY entregas_totais DESC
            LIMIT 50
        `).all();

        return c.json({ desempenho: desempenho.results });
    } catch (erro: any) {
        log('error', '[RELATORIOS] Falha ao gerar relatório de desempenho de membros', { erro: erro.message });
        return c.json({ erro: 'Falha ao gerar relatório de desempenho de membros' }, 500);
    }
});

/**
 * 📥 EXPORTAÇÃO CSV DE PONTO (OFICIAL)
 * Gera o arquivo para auditoria externa ou RH.
 */
rotasRelatorios.get('/exportar/ponto', autenticacaoRequerida(), verificarPermissao('ponto:exportar'), async (c: Context) => {
    const { DB } = c.env;
    const { data_inicio, data_fim } = c.req.query();

    const filtro = data_inicio && data_fim 
        ? `AND p.registrado_em BETWEEN '${data_inicio}' AND '${data_fim}'`
        : `AND p.registrado_em >= date('now', '-30 days')`;

    try {
        const { results } = await DB.prepare(`
            SELECT 
                u.nome as Membro,
                p.tipo as Ação,
                p.registrado_em as Momento,
                p.ip_origem as IP,
                (SELECT nome FROM equipes WHERE id = (SELECT equipe_id FROM usuarios_organizacao WHERE usuario_id = u.id LIMIT 1)) as Equipe
            FROM ponto_registros p
            JOIN usuarios u ON u.id = p.usuario_id
            WHERE 1=1
            ${filtro}
            ORDER BY p.registrado_em DESC
        `).all();

        const csvContent = [
            "Membro;Equipe;Ação;Data;Hora;IP",
            ...(results || []).map((r: any) => {
                const d = new Date(r.Momento);
                return `"${r.Membro}";"${r.Equipe || 'N/A'}";"${r.Ação}";"${d.toLocaleDateString('pt-BR')}";"${d.toLocaleTimeString('pt-BR')}";"${r.IP}"`;
            })
        ].join("\n");

        return c.text(csvContent, 200, {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="auditoria_ponto_${new Date().toISOString().split('T')[0]}.csv"`
        });
    } catch (erro: any) {
        return c.json({ erro: 'Falha ao exportar CSV' }, 500);
    }
});


/**
 * 👤 RELATÓRIO INDIVIDUAL DE FREQUÊNCIA
 * Extrato detalhado de todas as batidas de um membro em um período.
 */
rotasRelatorios.get('/membro/:id/frequencia', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    const id = c.req.param('id');
    const ini = c.req.query('inicio');
    const fim = c.req.query('fim');

    try {
        let query = `
            SELECT 
                data,
                entrada,
                saida,
                tempo_total,
                ip_entrada,
                ip_saida,
                status
            FROM ponto_registros
            WHERE usuario_id = ?
        `;
        const params: any[] = [id];

        if (ini) { query += ` AND data >= ?`; params.push(ini); }
        if (fim) { query += ` AND data <= ?`; params.push(fim); }

        query += ` ORDER BY data DESC`;

        const registros = await DB.prepare(query).bind(...params).all();

        return c.json({ registros: registros.results });
    } catch (erro: any) {
        log('error', '[RELATORIOS] Falha ao buscar frequência individual', { id, erro: erro.message });
        return c.json({ erro: 'Falha ao buscar frequência individual' }, 500);
    }
});

/**
 * 📄 EXPORTAR CSV INDIVIDUAL
 */
rotasRelatorios.get('/exportar/ponto/membro/:id', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    const id = c.req.param('id');
    const ini = c.req.query('inicio');
    const fim = c.req.query('fim');

    try {
        let query = `
            SELECT 
                data, entrada, saida, tempo_total 
            FROM ponto_registros 
            WHERE usuario_id = ?
        `;
        const params: any[] = [id];
        if (ini) { query += ` AND data >= ?`; params.push(ini); }
        if (fim) { query += ` AND data <= ?`; params.push(fim); }
        query += ` ORDER BY data DESC`;

        const { results } = await DB.prepare(query).bind(...params).all();

        let csv = 'Data;Entrada;Saida;Duracao(min)\n';
        results.forEach((r: any) => {
            csv += `${r.data};${r.entrada || ''};${r.saida || ''};${r.tempo_total || 0}\n`;
        });

        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="extrato_membro_${id}.csv"`
            }
        });
    } catch (erro: any) {
        return c.json({ erro: 'Falha ao exportar CSV' }, 500);
    }
});

/**
 * 📊 EXPORTAR MAPA DE PRESENÇA (MATRIZ SEMESTRAL)
 * Gera um CSV estilo grade: [Membro | Dia 1 | Dia 2 | ... | Dia N | Total]
 */
rotasRelatorios.get('/exportar/mapa-semestral', autenticacaoRequerida(), verificarPermissao('relatorios:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    
    // Pegar parâmetros e tratar string vazia
    let iniRaw = c.req.query('inicio');
    let fimRaw = c.req.query('fim');
    if (!iniRaw || iniRaw === '') iniRaw = '2025-01-01';
    if (!fimRaw || fimRaw === '') fimRaw = '2025-06-30';

    try {
        // Validação básica de Datas
        const dataInicioObj = new Date(iniRaw);
        const dataFimObj = new Date(fimRaw);

        if (isNaN(dataInicioObj.getTime()) || isNaN(dataFimObj.getTime())) {
            return c.json({ erro: 'Datas inválidas fornecidas' }, 400);
        }

        // 1. Pegar todos os membros
        const membros = await DB.prepare(`SELECT id, nome FROM usuarios ORDER BY nome`).all();
        const membrosLista = membros.results || [];
        
        // 2. Pegar todas as batidas no período
        const batidas = await DB.prepare(`
            SELECT usuario_id, data, SUM(tempo_total) as horas 
            FROM ponto_registros 
            WHERE data >= ? AND data <= ?
            GROUP BY usuario_id, data
        `).bind(iniRaw, fimRaw).all();
        const batidasLista = batidas.results || [];

        // 3. Gerar lista de dias no intervalo
        const datas: string[] = [];
        let atual = new Date(dataInicioObj);
        while (atual <= dataFimObj) {
            datas.push(atual.toISOString().split('T')[0]);
            atual.setDate(atual.getDate() + 1);
            
            // Segurança contra loop infinito por datas malucas
            if (datas.length > 200) break; 
        }

        // 4. Indexar batidas para performance O(1)
        const mapaBatidas = new Map();
        batidasLista.forEach((b: any) => {
            mapaBatidas.set(`${b.usuario_id}_${b.data}`, b.horas || 0);
        });

        // 5. Montar o CSV
        let csv = 'Membro;' + datas.join(';') + ';Total Horas\n';
        
        membrosLista.forEach((m: any) => {
            let linha = `${m.nome}`;
            let totalMembro = 0;
            datas.forEach(d => {
                const horas = mapaBatidas.get(`${m.id}_${d}`) || 0;
                totalMembro += horas;
                linha += `;${horas > 0 ? (horas / 60).toFixed(1).replace('.', ',') : ''}`;
            });
            linha += `;${(totalMembro / 60).toFixed(1).replace('.', ',')}\n`;
            csv += linha;
        });

        // Converter para latin1 ou garantir UTF-8 com BOM para Excel identificar
        const bom = '\uFEFF';
        return new Response(bom + csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="mapa_frequencia_${iniRaw}_${fimRaw}.csv"`
            }
        });
    } catch (erro: any) {
        log('error', '[RELATORIOS] Falha ao exportar mapa semestral', { 
            erro: erro.message,
            stack: erro.stack,
            params: { ini: iniRaw, fim: fimRaw }
        });
        return c.json({ erro: 'Falha técnica ao gerar matriz semestral' }, 500);
    }
});

export default rotasRelatorios;
