import { Hono, Context } from 'hono';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { Env } from '../index';
import { salvarConfiguracao } from '../servicos/servico-configuracoes';
import { registrarLog } from '../servicos/servico-logs';
import { log } from '../utilitarios/logger';

const rotasConfiguracoes = new Hono<{ Bindings: Env }>();

/**
 * Lista todas as configurações do sistema.
 * Requer permissão 'configuracoes:visualizar'.
 */
rotasConfiguracoes.get('/', autenticacaoRequerida(), verificarPermissao('configuracoes:visualizar'), async (c) => {
    const { DB } = c.env;

    try {
        const { results } = await DB.prepare('SELECT * FROM configuracoes_sistema').all();
        const config: Record<string, any> = {};

        if (results) {
            results.forEach((row: any) => {
                try {
                    config[row.chave] = JSON.parse(row.valor);
                } catch {
                    config[row.chave] = row.valor;
                }
            });
        }

        return c.json({ configuracoes: config, bruta: results });
    } catch (e: any) {
        return c.json({ erro: 'Falha ao buscar configurações', detalhe: e.message }, 500);
    }
});

/**
 * Endpoint público que retorna configurações essenciais (domínios, permissões, etc).
 * Acessível sem autenticação.
 */
rotasConfiguracoes.get('/publico', async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const CHAVE_CACHE = 'configs_publicas';

    try {
        // 1. Tenta buscar no cache KV primeiro
        if (softhub_kv) {
            const cache = await softhub_kv.get(CHAVE_CACHE);
            if (cache) return c.json(JSON.parse(cache));
        }

        const { results } = await DB.prepare('SELECT chave, valor FROM configuracoes_sistema WHERE chave IN (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .bind('permissoes_roles', 'hierarquia_roles', 'dominios_autorizados', 'modo_manutencao', 'hora_inicio_ponto', 'hora_fim_ponto', 'labels_roles', 'ips_autorizados_ponto', 'dias_trabalho')
            .all();

        const config: Record<string, any> = {
            permissoes_roles: {},
            hierarquia_roles: [],
            labels_roles: {},
            dominios_autorizados: ['unieuro.com.br'],
            ips_autorizados_ponto: [],
            modo_manutencao: false,
            hora_inicio_ponto: '13:00',
            hora_fim_ponto: '17:00',
            dias_trabalho: [1, 2, 3, 4, 5]
        };

        if (results) {
            results.forEach((row: any) => {
                try {
                    config[row.chave] = JSON.parse(row.valor);
                } catch {
                    config[row.chave] = row.valor === 'true' ? true : row.valor === 'false' ? false : row.valor;
                }
            });
        }

        // 2. Salva no KV por 1 hora
        if (softhub_kv) {
            await softhub_kv.put(CHAVE_CACHE, JSON.stringify(config), { expirationTtl: 3600 });
        }

        return c.json(config);
    } catch (e: any) {
        return c.json({ erro: 'Falha ao buscar configurações públicas', detalhe: e.message }, 500);
    }
});

/**
 * Atualiza múltiplas configurações do sistema em lote.
 * Requer permissão 'configuracoes:editar'.
 */
rotasConfiguracoes.post('/', autenticacaoRequerida(), verificarPermissao('configuracoes:editar'), async (c) => {
    const { DB, softhub_kv } = c.env;
    const body = await c.req.json();

    if (!body || typeof body !== 'object') {
        return c.json({ erro: 'Corpo da requisição inválido' }, 400);
    }

    try {
        // Usa o serviço para cada chave, garantindo a invalidação do KV
        for (const [chave, valor] of Object.entries(body)) {
            await salvarConfiguracao({ DB, softhub_kv }, chave, valor);
            await registrarLog(DB, {
                usuarioId: c.get('usuario').id,
                acao: 'CONFIG_SISTEMA_ATUALIZADA_LOTE',
                modulo: 'admin',
                descricao: `Configuração '${chave}' atualizada via atualização em lote.`,
                ip: c.req.header('CF-Connecting-IP') ?? '',
                entidadeTipo: 'configuracoes_sistema',
                entidadeId: chave,
                dadosNovos: { valor }
            });
        }
        
        // Invalida o cache público global
        if (softhub_kv) {
            await softhub_kv.delete('configs_publicas');
        }
        
        return c.json({ sucesso: true, mensagem: 'Configurações salvas com sucesso (Cache validado).' });
    } catch (e: any) {
        log('error', '[CONFIG] Erro no batch POST /', { erro: e.message });
        return c.json({ erro: 'Falha ao salvar configurações', detalhe: e.message }, 500);
    }
});

/**
 * Atualiza uma configuração específica identificada pela chave.
 */
rotasConfiguracoes.patch('/:chave', autenticacaoRequerida(), verificarPermissao('configuracoes:editar'), async (c) => {
    const { DB, softhub_kv } = c.env;
    const usuario = c.get('usuario');
    const isAdmin = usuario.role === 'ADMIN';
    const chave = c.req.param('chave');
    const { valor } = await c.req.json();

    if (!chave) return c.json({ erro: 'Chave não especificada.' }, 400);

    // ─── TRAVA DE SEGURANÇA: Matriz de Governança ───
    if (chave === 'permissoes_roles' && !isAdmin) {
        try {
            const resAtual = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind('permissoes_roles').first<{ valor: string }>();
            const permissoesAtuais = resAtual ? JSON.parse(resAtual.valor) : {};
            const permissoesNovas = valor;

            const roles = new Set([...Object.keys(permissoesAtuais), ...Object.keys(permissoesNovas)]);
            
            for (const role of roles) {
                const atualv = permissoesAtuais[role]?.['configuracoes:matriz_governanca'];
                const novov = permissoesNovas[role]?.['configuracoes:matriz_governanca'];
                
                if (atualv !== novov) {
                    return c.json({ erro: 'Apenas o Administrador pode delegar ou revogar permissões de Governança Crítica.' }, 403);
                }
            }
        } catch (e: any) {
            log('error', '[CONFIG] Erro ao validar trava de governança', { erro: e.message });
            return c.json({ erro: 'Falha na validação de segurança.' }, 500);
        }
    }

    try {
        await salvarConfiguracao({ DB, softhub_kv }, chave, valor);

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: 'CONFIG_SISTEMA_ATUALIZADA',
            modulo: 'admin',
            descricao: `Configuração '${chave}' foi alterada.`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'configuracoes_sistema',
            entidadeId: chave,
            dadosNovos: { valor }
        });
        
        // Invalida o cache público global
        if (softhub_kv) {
            await softhub_kv.delete('configs_publicas');
        }
        
        return c.json({ sucesso: true, mensagem: `Configuração ${chave} atualizada no banco e KV.` });
    } catch (e: any) {
        log('error', '[CONFIG] Erro ao atualizar configuração', { erro: e.message, chave });
        return c.json({ erro: 'Falha ao atualizar configuração', detalhe: e.message }, 500);
    }
});

/**
 * Renomeia um cargo (role) em todo o sistema.
 */
rotasConfiguracoes.patch('/roles/:antigo/renomear', autenticacaoRequerida('ADMIN'), async (c) => {
    const { DB, softhub_kv } = c.env;
    const antigo = c.req.param('antigo');
    const { novo } = await c.req.json();

    if (!antigo || !novo || antigo === novo) {
        return c.json({ erro: 'O nome do cargo atual ou novo é inválido.' }, 400);
    }

    try {
        const resPermissoes = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind('permissoes_roles').first<{ valor: string }>();
        const resHierarquia = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind('hierarquia_roles').first<{ valor: string }>();

        if (resPermissoes) {
            const permissoes = JSON.parse(resPermissoes.valor);
            if (permissoes[antigo]) {
                permissoes[novo] = permissoes[antigo];
                delete permissoes[antigo];
                await salvarConfiguracao({ DB, softhub_kv }, 'permissoes_roles', permissoes);
            }
        }

        if (resHierarquia) {
            const hierarquia = JSON.parse(resHierarquia.valor);
            const index = hierarquia.indexOf(antigo);
            if (index !== -1) {
                hierarquia[index] = novo;
                await salvarConfiguracao({ DB, softhub_kv }, 'hierarquia_roles', hierarquia);
            }
        }

        await DB.prepare('UPDATE usuarios SET role = ? WHERE role = ?').bind(novo, antigo).run();

        await registrarLog(DB, {
            usuarioId: (c.get('usuario') as any)?.id,
            acao: 'ROLE_RENOMEADA',
            modulo: 'admin',
            descricao: `Cargo '${antigo}' renomeado para '${novo}'. Todos os usuários foram migrados.`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'configuracoes_sistema',
            entidadeId: 'permissoes_roles',
            dadosAnteriores: { antigo },
            dadosNovos: { novo }
        });

        if (softhub_kv) {
            await softhub_kv.delete('configs_publicas');
        }
        
        return c.json({ sucesso: true, mensagem: `Cargo renomeado de '${antigo}' para '${novo}' com sucesso.` });
    } catch (e: any) {
        return c.json({ erro: 'Falha crítica ao renomear cargo', detalhe: e.message }, 500);
    }
});

export default rotasConfiguracoes;