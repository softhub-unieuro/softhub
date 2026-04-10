import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { obterConfiguracao } from './servicos/servico-configuracoes';
import { log } from './utilitarios/logger';
import { lidarExcecao } from './middleware/erros';
import { kvRateLimit } from './middleware/rate-limit';
import { processarFechamentoAutomatico, enviarLembreteSaida } from './servicos/servico-ponto-auto';

// ─── Rotas ────────────────────────────────────────────────────────────────────
import rotasAuth from './rotas/autenticacao';
import rotasAuthQr from './rotas/autenticacao-qr';
import rotasSessoes from './rotas/autenticacao-sessoes';
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
import rotasConfiguracoes from './rotas/configuracoes';
import rotasRelatorios from './rotas/relatorios';
import rotasEquipes from './rotas/equipes';
import rotasEquipesGrupos from './rotas/equipes-grupos';
import rotasEquipesAlocacao from './rotas/equipes-alocacao';
import rotasNotificacoes from './rotas/notificacoes';
import rotasIA from './rotas/ia';
import rotasPerfil from './rotas/perfil';

export type Env = {
    DB: D1Database;
    JWT_SECRET: string;
    MSAL_TENANT_ID: string;
    MSAL_CLIENT_ID: string;
    BOOTSTRAP_ADMIN_EMAIL: string;
    softhub_kv: KVNamespace;
    AI: unknown; // IA binding do Cloudflare
    GITHUB_TOKEN: string;
    GITHUB_OWNER: string;
};

const app = new Hono<{ Bindings: Env }>({ strict: false });

// 1. CORS (DEVE ser o primeiro)
app.use('*', cors({
    origin: (origin) => {
        const ALLOWED = [
            'https://softhub.pages.dev',
            'https://app.softhub.com.br'
        ];
        
        if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || origin.includes('cloudworkstations.dev')) {
            return origin;
        }

        if (ALLOWED.includes(origin)) {
            return origin;
        }
        
        return null;
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-role-simulada'],
    credentials: true,
}));

// 2. Rate Limiter Global (KV - SEC-003)
app.use("*", kvRateLimit({ windowMs: 60 * 1000, limit: 120, keyPrefix: 'global' }));

// 3. Modo de Manutenção (Regra de Governança)
app.use('*', async (c, next) => {
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
                    const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as { role: string };
                    
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
    } catch (e: unknown) {
        log('error', '[MAINTENANCE] Falha ao verificar status', { erro: e instanceof Error ? e.message : String(e) });
    }

    await next();
});

// Erro global
app.onError(lidarExcecao);

// ─── Rotas ────────────────────────────────────────────────────────────────────
app.route('/api/auth', rotasAuth);
app.route('/api/auth', rotasAuthQr);
app.route('/api/auth', rotasSessoes);
app.route('/api/usuarios', rotasUsuarios);
app.route('/api/usuarios', rotasUsuariosAdmin);
app.route('/api/projetos', rotasProjetos);
app.route('/api/tarefas', rotasTarefas);
app.route('/api/tarefas', rotasTarefasGerenciamento);
app.route('/api/tarefas', rotasTarefasMovimentacao);
app.route('/api/tarefas', rotasTarefasDetalhes);

// Unificando todas as rotas de ponto sob o mesmo prefixo
const pontoApp = new Hono<{ Bindings: Env }>({ strict: false });
pontoApp.route('/', rotasPonto);
pontoApp.route('/', rotasPontoJustificativas);
pontoApp.route('/', rotasPontoJustificativasAdmin);
app.route('/api/ponto', pontoApp);

app.route('/api/avisos', rotasAvisos);
app.route('/api/dashboard', rotasDashboard);
app.route('/api/logs', rotasLogs);
app.route('/api/configuracoes', rotasConfiguracoes);
app.route('/api/relatorios', rotasRelatorios);
app.route('/api/equipes', rotasEquipes);
app.route('/api/grupos', rotasEquipesGrupos);
app.route('/api/equipes', rotasEquipesAlocacao);
app.route('/api/notificacoes', rotasNotificacoes);
app.route('/api/ia', rotasIA);
app.route('/api/perfil', rotasPerfil);

// ─── Health check (Rota pública) ──────────────────────────────────────────────
app.get('/api/status', async (c) => {
    const { DB, softhub_kv } = c.env;
    const report: { status: string, d1: string, kv: string } = { status: 'check', d1: 'desconhecido', kv: 'desconhecido' };
    
    try {
        await DB.prepare('SELECT 1').first();
        report.d1 = 'ok';
    } catch (e: unknown) {
        report.d1 = 'erro: ' + (e instanceof Error ? e.message : String(e));
    }
    
    try {
        await softhub_kv.get('test_ping'); // Sem ?, queremos ver se explode
        report.kv = 'ok';
    } catch (e: unknown) {
        report.kv = 'erro: ' + (e instanceof Error ? e.message : String(e));
    }
    
    return c.json(report);
});

app.get('/', (c) => c.json({
    status: 'ok',
    servico: 'Fábrica de Software',
    versao: '1.0.0',
    timestamp: new Date().toISOString(),
}));



export { app };

/**
 * Ponto de Entrada da Worker (Fetch + Cron)
 * @param event - Evento agendado ou requisição HTTP
 * @param env - Variáveis de ambiente e bindings
 * @param ctx - Contexto de execução da Worker
 */
export default {
    fetch: app.fetch,
    async scheduled(event: { cron: string }, env: Env, ctx: ExecutionContext) {
        log('info', '[SCHEDULED] Executando tarefa agendada', { cron: event.cron });
        
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