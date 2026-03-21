import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { rateLimiter } from 'hono-rate-limiter';
import { obterConfiguracao } from './servicos/servico-configuracoes';
import rotasUsuarios from './rotas/usuarios';
import rotasUsuariosAdmin from './rotas/usuarios-admin';
import rotasProjetos from './rotas/projetos';
import rotasTarefas from './rotas/tarefas';
import rotasTarefasGerenciamento from './rotas/tarefas-gerenciamento';
import rotasTarefasMovimentacao from './rotas/tarefas-movimentacao';
import rotasTarefasDetalhes from './rotas/tarefas-detalhes';
import rotasPonto from './rotas/ponto';
import rotasPontoJustificativas from './rotas/ponto-justificativas';
import rotasPontoJustificativasAdmin from './rotas/ponto-justificativas-admin';
import rotasAvisos from './rotas/avisos';
import rotasDashboard from './rotas/dashboard';
import rotasLogs from './rotas/logs';
import rotasAuth from './rotas/auth';
import rotasAuthQr from './rotas/auth-qr';

import rotasConfiguracoes from './rotas/configuracoes';
import rotasRelatorios from './rotas/relatorios';
import rotasEquipes from './rotas/equipes';
import rotasEquipesGrupos from './rotas/equipes-grupos';
import rotasEquipesAlocacao from './rotas/equipes-alocacao';
import rotasNotificacoes from './rotas/notificacoes';
import rotasIA from './rotas/ia';
import rotasPerfil from './rotas/perfil';
import { lidarExcecao } from './middleware/erros';

export type Env = {
    DB: D1Database;
    JWT_SECRET: string;
    MSAL_TENANT_ID: string;
    MSAL_CLIENT_ID: string;
    BOOTSTRAP_ADMIN_EMAIL: string;
    softhub_kv: KVNamespace;
    AI: any;
    GITHUB_TOKEN: string;
    GITHUB_OWNER: string;
};

const app = new Hono<{ Bindings: Env }>({ strict: false });

// ─── Middlewares Globais ───────────────────────────────────────────────────

// 1. CORS (DEVE ser o primeiro)
app.use('*', cors({
    origin: (origin) => {
        if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || origin.includes('softhub') || origin.includes('pages.dev') || origin.includes('cloudworkstations.dev')) {
            return origin;
        }
        return null; // Bloqueia outros
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-role-simulada'],
    credentials: true,
}));

// 2. Rate Limiter Global
let _limiteGlobal: any = null;
app.use("*", (c, next) => {
    if (!_limiteGlobal) {
        _limiteGlobal = rateLimiter({
            windowMs: 60 * 1000, 
            limit: 300, 
            standardHeaders: "draft-6",
            keyGenerator: (c) => c.req.header("cf-connecting-ip") ?? "",
            message: { erro: "Muitas requisições. O sistema identificou spam." }
        });
    }
    return _limiteGlobal(c, next);
});

// 3. Modo de Manutenção (Regra de Governança)
app.use('*', async (c, next) => {
    const { DB, softhub_kv } = c.env;
    const path = c.req.path;

    // Ignora checks para rotas essenciais
    if (path === '/' || path.includes('/auth') || path.includes('/configuracoes/publico')) {
        return await next();
    }

    try {
        const emManutencao = await obterConfiguracao(c.env, 'modo_manutencao');

        if (emManutencao === true || emManutencao === 'true') {
            // No modo de manutenção, apenas ADMINs podem prosseguir
            const authHeader = c.req.header('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                try {
                    const { verify } = await import('hono/jwt');
                    const token = authHeader.slice(7);
                    const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as any;
                    
                    if (payload.role === 'ADMIN') return await next();
                } catch {
                    // Token inválido, segue para o bloqueio
                }
            }

            return c.json({ 
                erro: 'Sistema em manutenção programada.',
                detalhe: 'Estamos realizando melhorias técnicas. Administradores ainda possuem acesso.' 
            }, 503);
        }
    } catch (e) {
        console.error('[MAINTENANCE] Falha ao verificar status:', e);
    }

    await next();
});

// Erro global
app.onError(lidarExcecao);

// ─── Rotas ────────────────────────────────────────────────────────────────────
app.route('/api/auth', rotasAuth);
app.route('/api/auth', rotasAuthQr);
app.route('/api/usuarios', rotasUsuarios);
app.route('/api/usuarios', rotasUsuariosAdmin);
app.route('/api/projetos', rotasProjetos);
app.route('/api/tarefas', rotasTarefas);
app.route('/api/tarefas', rotasTarefasGerenciamento);
app.route('/api/tarefas', rotasTarefasMovimentacao);
app.route('/api/tarefas', rotasTarefasDetalhes);
app.route('/api/ponto', rotasPonto);
app.route('/api/ponto', rotasPontoJustificativas);
app.route('/api/ponto', rotasPontoJustificativasAdmin);
app.route('/api/avisos', rotasAvisos);
app.route('/api/dashboard', rotasDashboard);
app.route('/api/logs', rotasLogs);
app.route('/api/configuracoes', rotasConfiguracoes);
app.route('/api/relatorios', rotasRelatorios);
app.route('/api/equipes', rotasEquipes);
app.route('/api/equipes', rotasEquipesGrupos);
app.route('/api/equipes', rotasEquipesAlocacao);
app.route('/api/notificacoes', rotasNotificacoes);
app.route('/api/ia', rotasIA);
app.route('/api/perfil', rotasPerfil);

// ─── Health check (Rota pública) ──────────────────────────────────────────────
app.get('/api/status', async (c) => {
    const { DB, softhub_kv } = c.env;
    const report: any = { status: 'check', d1: 'desconhecido', kv: 'desconhecido' };
    
    try {
        await DB.prepare('SELECT 1').first();
        report.d1 = 'ok';
    } catch (e: any) {
        report.d1 = 'erro: ' + e.message;
    }
    
    try {
        await softhub_kv.get('test_ping'); // Sem ?, queremos ver se explode
        report.kv = 'ok';
    } catch (e: any) {
        report.kv = 'erro: ' + e.message;
    }
    
    return c.json(report);
});

app.get('/', (c) => c.json({
    status: 'ok',
    servico: 'Fábrica de Software',
    versao: '1.0.0',
    timestamp: new Date().toISOString(),
}));

import { processarFechamentoAutomatico, enviarLembreteSaida } from './servicos/servico-ponto-auto';

/**
 * Ponto de Entrada da Worker (Fetch + Cron)
 */
export default {
    fetch: app.fetch,
    async scheduled(event: any, env: Env, ctx: any) {
        console.log(`[SCHEDULED] Executando tarefa agendada: ${event.cron}`);
        
        // Tarefa: Fechamento de Ponto às 23:59 (Brasília)
        if (event.cron === "59 23 * * *") {
            ctx.waitUntil(processarFechamentoAutomatico(env.DB, env.softhub_kv));
        }

        // Tarefa: Lembrete de Saída às 16:45 (Brasília)
        if (event.cron === "45 16 * * *") {
            ctx.waitUntil(enviarLembreteSaida(env.DB, env.softhub_kv));
        }
    }
};