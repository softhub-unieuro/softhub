import { Hono, Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { validarRedeLocal } from '../middleware/rede'; // Importando o middleware de rede
import { registrarLog } from '../servicos/servico-logs';
import { criarNotificacoes } from '../servicos/servico-notificacoes';

const rotasPonto = new Hono<{ Bindings: Env, Variables: { usuario: any } }>({ strict: false });

/**
 * Lista os registros de ponto do usuário autenticado.
 * Retorna os registros de hoje e os últimos 50 do histórico.
 */
rotasPonto.get('/', autenticacaoRequerida(), verificarPermissao('ponto:visualizar'), async (c: Context) => {
    const { DB } = c.env;
    const usuario = c.get('usuario') as any;

    try {
        const { results: hoje } = await DB.prepare(`SELECT id, tipo, registrado_em, ip_origem FROM ponto_registros WHERE usuario_id = ? AND DATE(registrado_em, '-3 hours') = DATE('now', '-3 hours') ORDER BY registrado_em DESC`).bind(usuario.id).all();
        const { results: historico } = await DB.prepare(`SELECT id, tipo, registrado_em, ip_origem FROM ponto_registros WHERE usuario_id = ? ORDER BY registrado_em DESC LIMIT 50`).bind(usuario.id).all();
        return c.json({ hoje, historico });
    } catch (erro: any) {
        console.error('[ERRO] GET /api/ponto:', erro);
        return c.json({ erro: 'Falha ao buscar registros de ponto', detalhe: erro.message }, 500);
    }
});

/**
 * Lista todos os membros que estão com a aba do sistema aberta (Heartbeat ativo).
 * Retorna dados básicos de perfil de cada um.
 */
rotasPonto.get('/online', autenticacaoRequerida(), async (c: Context) => {
    const { softhub_kv } = c.env;

    if (!softhub_kv) return c.json({ online: [] });

    try {
        // Busca TODA presença ativa no sistema via KV (heartbeat de 60s)
        const lista = await softhub_kv.list({ prefix: 'online:' });
        const membros = [];

        for (const key of lista.keys) {
            const dados = await softhub_kv.get(key.name, 'json');
            if (dados) membros.push(dados);
        }

        // Ordenar por nome para consistência
        membros.sort((a: any, b: any) => a.nome?.localeCompare(b.nome));

        return c.json({ online: membros });
    } catch (erro: any) {
        console.error('[ERRO] GET /api/ponto/online:', erro);
        return c.json({ erro: 'Falha ao buscar membros online', detalhe: erro.message }, 500);
    }
});

/**
 * Registra o "sinal de vida" do usuário para o monitor de membros online.
 * Atualiza o KV 'online:ID' com expiração de 60 segundos.
 */
rotasPonto.post('/presenca', autenticacaoRequerida(), async (c: Context) => {
    const { softhub_kv } = c.env;
    const usuario = c.get('usuario') as any;

    if (!softhub_kv) return c.json({ erro: 'KV não configurado' }, 500);

    try {
        const dados = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            foto_perfil: usuario.foto_perfil,
            ultima_vez: new Date().toISOString()
        };

        // Registra presença por 60 segundos (KV expira automaticamente)
        await softhub_kv.put(`online:${usuario.id}`, JSON.stringify(dados), { expirationTtl: 60 });
        
        return c.json({ sucesso: true });
    } catch (e) {
        console.error('[HEARTBEAT] Falha ao registrar presença:', e);
        return c.json({ erro: 'Falha ao registrar presença' }, 500);
    }
});

const BaterPontoSchema = z.object({
    tipo: z.enum(['entrada', 'saida'])
});

/**
 * Registra uma batida de ponto (entrada ou saída).
 * Requer presença na rede física da UNIEURO e respeita o horário permitido.
 */
rotasPonto.post('/', 
    autenticacaoRequerida(), 
    verificarPermissao('ponto:registrar'), 
    validarRedeLocal, // <-- Validação de rede aplicada aqui!
    zValidator('json', BaterPontoSchema), 
    async (c: Context) => {
        const { DB, softhub_kv } = c.env;
        const { tipo } = (c.req as any).valid('json');

        // 1. Buscar Janela de Trabalho na Governança
        let horaInicio = '13:00';
        let horaFim = '17:00';

        try {
            const chaves = ['hora_inicio_ponto', 'hora_fim_ponto'];
            const configs: Record<string, string> = {};

            for (const k of chaves) {
                let v = await softhub_kv?.get(k);
                if (!v) {
                    const row = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind(k).first() as any;
                    if (row) {
                        v = row.valor;
                        if (softhub_kv) await softhub_kv.put(k, v!, { expirationTtl: 3600 });
                    }
                }
                if (v) configs[k] = v.replace(/"/g, ''); // Limpa aspas do JSON/KV
            }

            if (configs.hora_inicio_ponto) horaInicio = configs.hora_inicio_ponto;
            if (configs.hora_fim_ponto) horaFim = configs.hora_fim_ponto;
        } catch (e) {
            console.error('[PONTO] Falha ao carregar jornada, usando padrão:', e);
        }

        // Validação de horário dinâmica
        const agora = new Date();
        const horaBrasiliaStr = agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false });
        
        const converterParaMinutos = (h: string) => {
            const [horas, minutos] = h.split(':').map(Number);
            return horas * 60 + minutos;
        };

        const agoraMinutos = converterParaMinutos(horaBrasiliaStr);
        const inicioMinutos = converterParaMinutos(horaInicio);
        const fimMinutos = converterParaMinutos(horaFim);

        try {
            const usuario = c.get('usuario') as any;
            const ipOrigem = c.req.header('CF-Connecting-IP') || '127.0.0.1';

            // Validação de sequência com Debounce de 30 segundos
            const ultimo = await DB.prepare(`
                SELECT tipo, registrado_em FROM ponto_registros 
                WHERE usuario_id = ? 
                AND DATE(registrado_em, '-3 hours') = DATE('now', '-3 hours') 
                ORDER BY registrado_em DESC LIMIT 1
            `).bind(usuario.id).first() as any;
            
            if (ultimo) {
                const agoraMs = new Date().getTime();
                const ultimoMs = new Date(ultimo.registrado_em).getTime();
                const segundosPassados = Math.abs(agoraMs - ultimoMs) / 1000;

                if (ultimo.tipo === tipo) {
                    return c.json({ erro: `Você já registrou uma ${tipo} agora mesmo.` }, 403);
                }

                if (segundosPassados < 30) {
                    return c.json({ erro: 'Aguarde pelo menos 30 segundos entre registros de ponto.' }, 429);
                }
            }

            // REGRA DE OURO: Se for SAÍDA e houver uma ENTRADA aberta, permitimos registrar MESMO fora do horário.
            // Isso evita que o usuário fique "preso" no sistema se esquecer de bater o ponto ou se o expediente acabar.
            const permitirForaDoHorario = tipo === 'saida' && ultimo?.tipo === 'entrada';

            const TOLERANCIA = 15; // 15 minutos de flexibilidade
            if (!permitirForaDoHorario && (agoraMinutos < (inicioMinutos - TOLERANCIA) || agoraMinutos > (fimMinutos + TOLERANCIA))) {
                return c.json({ 
                    erro: 'Fora do horário permitido.', 
                    detalhe: `O registro de ponto está autorizado apenas entre ${horaInicio} e ${horaFim} (com tolerância de ${TOLERANCIA}min).` 
                }, 403);
            }

            // Inserção no banco
            const pontoId = crypto.randomUUID();
            await DB.prepare(`INSERT INTO ponto_registros (id, usuario_id, tipo, ip_origem) VALUES (?, ?, ?, ?)`).bind(pontoId, usuario.id, tipo, ipOrigem).run();

            // 🚀 Atualiza Presence no KV
            if (tipo === 'entrada') {
                await softhub_kv.put(`presenca:${usuario.id}`, JSON.stringify({
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    foto_perfil: usuario.foto_perfil,
                    entrada_em: new Date().toISOString()
                }), { expirationTtl: 28800 }); // 8 horas de jornada máxima
            } else {
                await softhub_kv.delete(`presenca:${usuario.id}`);
            }

            await registrarLog(DB, {
                usuarioId: usuario.id,
                acao: tipo === 'entrada' ? 'PONTO_ENTRADA' : 'PONTO_SAIDA',
                modulo: 'ponto',
                descricao: `Batida de ${tipo} registrada IP: ${ipOrigem}`,
                ip: ipOrigem,
                entidadeTipo: 'ponto_registros',
                entidadeId: pontoId,
                dadosNovos: { tipo, ip_origem: ipOrigem }
            });

            return c.json({ sucesso: true });
        } catch (erro) {
            console.error("[ERRO] POST /api/ponto", erro);
            return c.json({ erro: 'Falha ao registrar ponto' }, 500);
        }
    });

rotasPonto.get('/exportar', 
    autenticacaoRequerida(), 
    verificarPermissao('ponto:exportar'), 
    async (c: Context) => {
        const { DB } = c.env;
        const query = c.req.query();
        const { usuarioId, mes, ano } = query;

        try {
            let sql = `
                SELECT u.nome, p.tipo, p.registrado_em, p.ip_origem 
                FROM ponto_registros p
                JOIN usuarios u ON p.usuario_id = u.id
                WHERE 1=1
            `;
            const params: any[] = [];

            if (usuarioId) {
                sql += " AND p.usuario_id = ?";
                params.push(usuarioId);
            }
            if (mes && ano) {
                sql += " AND strftime('%m', p.registrado_em) = ? AND strftime('%Y', p.registrado_em) = ?";
                params.push(mes.padStart(2, '0'));
                params.push(ano);
            }

            sql += " ORDER BY p.registrado_em ASC";

            const { results } = await DB.prepare(sql).bind(...params).all();

            // Gerar CSV manual (Regra: sem bibliotecas extras se possível)
            const cabecalho = "Nome;Tipo;Data;Hora;IP\n";
            const linhas = results.map((r: any) => {
                const data = new Date(r.registrado_em);
                const dataFormatada = data.toLocaleDateString('pt-BR');
                const horaFormatada = data.toLocaleTimeString('pt-BR');
                return `${r.nome};${r.tipo};${dataFormatada};${horaFormatada};${r.ip_origem}`;
            }).join("\n");

            const csv = cabecalho + linhas;

            return c.text(csv, 200, {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="relatorio_ponto_${mes || 'geral'}_${ano || ''}.csv"`
            });

        } catch (erro: any) {
            console.error('[ERRO] GET /api/ponto/exportar:', erro);
            return c.json({ erro: 'Falha ao gerar relatório CSV' }, 500);
        }
    });

/**
 * RODOVIA DE TESTE: Permite o registro de ponto ignorando validações de IP e horário.
 * Requer permissão de 'ADMIN'.
 */
rotasPonto.post('/teste', 
    autenticacaoRequerida('ADMIN'), 
    zValidator('json', BaterPontoSchema), 
    async (c: Context) => {
        const { DB } = c.env;
        const { tipo } = (c.req as any).valid('json');

        try {
            const usuario = c.get('usuario') as any;
            const ipOrigem = c.req.header('CF-Connecting-IP') || '127.0.0.1';

            // Registra sem validar horário ou IP
            await DB.prepare(`INSERT INTO ponto_registros (id, usuario_id, tipo, ip_origem) VALUES (?, ?, ?, ?)`).bind(crypto.randomUUID(), usuario.id, tipo, ipOrigem).run();

            await registrarLog(DB, {
                usuarioId: usuario.id,
                acao: tipo === 'entrada' ? 'PONTO_ENTRADA_TESTE' : 'PONTO_SAIDA_TESTE',
                modulo: 'ponto',
                descricao: `[TESTE] Batida de ${tipo} registrada via endpoint de bypass`,
                ip: ipOrigem,
                entidadeTipo: 'ponto_registros'
            });

            return c.json({ sucesso: true, mensagem: `[TESTE] ${tipo} registrado com sucesso.` });
        } catch (erro) {
            console.error("[ERRO-TESTE] POST /api/ponto/teste", erro);
            return c.json({ erro: 'Falha ao registrar ponto de teste' }, 500);
        }
    });

export default rotasPonto;