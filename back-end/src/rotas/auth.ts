import { Hono } from 'hono';
import { verifyWithJwks, sign } from 'hono/jwt';
import { Env } from '../index';
import { registrarLog } from '../servicos/servico-logs';
import { AzureAdClaims, getJwksUri, validarClaims } from '../servicos/servico-msal';

/**
 * Rota de Autenticação - Fluxo MSAL (Regra 13)
 * Integração com Azure AD da Unieuro
 */
const rotasAuth = new Hono<{ Bindings: Env }>();

rotasAuth.post('/msal', async (c) => {
    const { DB, JWT_SECRET, MSAL_TENANT_ID, MSAL_CLIENT_ID, BOOTSTRAP_ADMIN_EMAIL, softhub_kv } = c.env;
    const ip = c.req.header('CF-Connecting-IP') ?? 'desconhecido';

    try {
        const body = await c.req.json();
        const idToken = body.idToken;

        if (!idToken) {
            return c.json({ erro: 'idToken ausente.' }, 400);
        }

        // 0. Buscar Governança (Domínios e Auto-cadastro) - PRIORIDADE PARA CONFIG DO BANCO
        let dominiosAutorizados: string[] = ['unieuro.com.br']; // Fallback mínimo de segurança
        let autoCadastroPermitido = false;

        try {
            const keys = ['dominios_autorizados', 'auto_cadastro'];
            const configs: Record<string, any> = {};

            for (const k of keys) {
                const cached = await softhub_kv?.get(k);
                let v: string | null = cached || null;

                if (!v) {
                    const row = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind(k).first() as any;
                    if (row && typeof row.valor === 'string') {
                        v = row.valor;
                        if (softhub_kv) await softhub_kv.put(k, v!, { expirationTtl: 3600 });
                    }
                }
                
                if (v) {
                    try {
                        configs[k] = JSON.parse(v);
                    } catch {
                        configs[k] = v;
                    }
                }
            }

            if (Array.isArray(configs.dominios_autorizados) && configs.dominios_autorizados.length > 0) {
                dominiosAutorizados = configs.dominios_autorizados;
            }
            if (typeof configs.auto_cadastro === 'boolean') {
                autoCadastroPermitido = configs.auto_cadastro;
            }
        } catch (e) {
            console.error('[Auth] Falha crítica ao carregar governança:', e);
        }

        // 1. Validar assinatura RS256 com JWKS da Microsoft
        let payload: AzureAdClaims;
        try {
            if (!MSAL_TENANT_ID) throw new Error('MSAL_TENANT_ID não configurado no ambiente.');

            try {
                const rawPayload = await verifyWithJwks(idToken, {
                    jwks_uri: getJwksUri(MSAL_TENANT_ID),
                    allowedAlgorithms: ['RS256']
                });
                payload = rawPayload as unknown as AzureAdClaims;
            } catch (e: any) {
                const rawPayload = await verifyWithJwks(idToken, {
                    jwks_uri: getJwksUri('common'),
                    allowedAlgorithms: ['RS256']
                });
                payload = rawPayload as unknown as AzureAdClaims;
            }
        } catch (e: any) {
            return c.json({ erro: 'Assinatura do Token inválida.', detalhe: e.message }, 401);
        }

        // 2. Validar claims de negócio
        const email = (payload.upn || payload.preferred_username || '').toLowerCase();
        
        // Verificação de Bootstrap (Regra 13 - Admin via env) - DEVE vir antes da validação de domínio para permitir recuperação
        const listaBootstrap = (BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase().split(',').map(e => e.trim());
        const isBootstrapAdmin = email && listaBootstrap.includes(email);

        const erroValidacao = validarClaims(payload, MSAL_TENANT_ID, MSAL_CLIENT_ID, dominiosAutorizados);
        
        // Se houver erro de validação (como domínio inválido), só bloqueamos se NÃO for um admin de bootstrap
        if (erroValidacao && !isBootstrapAdmin) {
            return c.json({ erro: 'Rejeitado por segurança.', detalhe: erroValidacao }, 403);
        }

        // 3. Extrair dados
        const nome = payload.name || email;

        // 4. Verificação de DB
        const resUsuario = await DB
            .prepare('SELECT id, nome, email, role, versao_token FROM usuarios WHERE email = ?')
            .bind(email)
            .first();
        let usuario = resUsuario as any;

        let isNew = false;

        if (!usuario) {
            if (isBootstrapAdmin || autoCadastroPermitido) {
                // Novo usuário via bootstrap é ADMIN, via auto-cadastro é MEMBRO
                const roleFinal = isBootstrapAdmin ? 'ADMIN' : 'MEMBRO';
                const novoId = crypto.randomUUID();
                
                await DB.prepare('INSERT INTO usuarios (id, nome, email, role, versao_token) VALUES (?, ?, ?, ?, 1)')
                    .bind(novoId, nome, email, roleFinal)
                    .run();

                usuario = { id: novoId, nome, email, role: roleFinal, versao_token: 1 };
                isNew = true;
            } else {
                return c.json({
                    erro: 'Acesso negado: cadastro não autorizado.',
                    detalhe: `O auto-cadastro está desativado e o e-mail ${email} não está pré-autorizado.`
                }, 403);
            }
        } else {
            // Se já existe mas está na lista de bootstrap, garante que seja ADMIN
            if (isBootstrapAdmin && usuario.role !== 'ADMIN') {
                await DB.prepare('UPDATE usuarios SET role = "ADMIN", nome = ? WHERE id = ?')
                    .bind(nome, usuario.id)
                    .run();
                usuario.role = 'ADMIN';
                usuario.nome = nome;
            } else {
                await DB.prepare('UPDATE usuarios SET nome = ? WHERE id = ?').bind(nome, usuario.id).run();
                usuario.nome = nome;
            }
        }



        // 5. Gerar JWT Interno
        if (!JWT_SECRET) {
            console.error('[Auth] JWT_SECRET não definido.');
            return c.json({ erro: 'Erro interno de configuração: JWT_SECRET ausente.' }, 500);
        }

        const tokenLocal = await sign(
            {
                id: usuario.id,
                role: usuario.role,
                email: usuario.email,
                versao_token: usuario.versao_token || 1,
                exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 dias (Estratégia PWA)
            },
            JWT_SECRET
        );

        await registrarLog(DB, {
            usuarioId: usuario.id,
            acao: isNew ? 'CADASTRO_MSAL' : 'LOGIN_MSAL',
            modulo: 'auth',
            descricao: `Login realizado via Microsoft: ${email}`,
            ip,
            dadosNovos: { email, role: usuario.role, novo_usuario: isNew }
        });

        return c.json({ token: tokenLocal, usuario });

    } catch (e: any) {
        console.error('[Auth] Erro crítico inesperado:', e);
        return c.json({ erro: 'Erro interno crítico: ' + (e.message || 'Erro desconhecido') }, 500);
    }
});

/**
 * Verifica se o acesso atual vem da rede interna da Fábrica (conforme config rede_ponto)
 */
rotasAuth.get('/verificar-rede', async (c) => {
    const { DB, softhub_kv } = c.env;
    const ipAtual = c.req.header('CF-Connecting-IP') || '127.0.0.1';

    try {
        let redePonto: string[] = [];
        const cached = await softhub_kv?.get('rede_ponto');

        if (cached) {
            redePonto = JSON.parse(cached);
        } else {
            const row = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = "rede_ponto"').first() as any;
            if (row?.valor) {
                redePonto = JSON.parse(row.valor);
                if (softhub_kv) await softhub_kv.put('rede_ponto', row.valor, { expirationTtl: 3600 });
            }
        }

        const ehRedeInterna = redePonto.includes(ipAtual);
        return c.json({ ehRedeInterna, ip: ipAtual });
    } catch (e) {
        return c.json({ ehRedeInterna: false, erro: 'Falha ao validar rede' });
    }
});

export default rotasAuth;