import { Hono, Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao, verificarPermissaoManual } from '../middleware/auth';
import { registrarLog } from '../servicos/servico-logs';
import { criarNotificacoes } from '../servicos/servico-notificacoes';
import { obterConfiguracao } from '../servicos/servico-configuracoes';
import { invalidarSessaoCache } from '../servicos/servico-acesso';
import { log } from '../utilitarios/logger';
import { Roles } from '../utilitarios/constantes';
import { UsuarioDB, ConfigSistemaDB } from '../modelos/tipagem-banco';

const rotasAdmin = new Hono<{ Bindings: Env; Variables: { usuario: any } }>();

rotasAdmin.patch('/:id/role', autenticacaoRequerida(), verificarPermissao(['membros:alterar_role', 'membros:gerenciar']), async (c: Context) => {
    const { DB, softhub_kv, BOOTSTRAP_ADMIN_EMAIL } = c.env;
    const usuarioLogado = c.get('usuario');
    const id = c.req.param('id');
    
    if (!id) return c.json({ erro: 'ID do membro não fornecido.' }, 400);

    try {
        const body = await c.req.json();
        let role = body.role?.toUpperCase() || '';
        const roleNormalizada = role.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // Validar Role contra a lista de roles configuradas no banco
        const resHierarquia = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind('hierarquia_roles').first() as ConfigSistemaDB | null;
        const configuradas = resHierarquia ? JSON.parse(resHierarquia.valor) as string[] : [Roles.ADMIN, Roles.COORDENADOR, Roles.GESTOR, Roles.LIDER, Roles.SUBLIDER, Roles.MEMBRO];
        
        if (!configuradas.includes(roleNormalizada) && ![Roles.ADMIN, 'TODOS'].includes(roleNormalizada)) {
            return c.json({ erro: `Cargo '${role}' é inválido.` }, 400);
        }

        const atual = await DB.prepare('SELECT email, role FROM usuarios WHERE id = ?').bind(id).first() as UsuarioDB | null;
        if (!atual) return c.json({ erro: 'Usuário não encontrado.' }, 404);

        // Verifica se o ALVO da alteração é um membro de bootstrap
        const listaBootstrap = (BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase().split(',').map((e: string) => e.trim());
        const alvoEhBootstrap = listaBootstrap.includes(atual.email.toLowerCase());

        // 🛡️ REGRAS PROTEGIDAS (Dono/Bootstrap)
        
        // 1. Apenas membros na lista de bootstrap podem se tornar ADMIN
        if (roleNormalizada === Roles.ADMIN && !alvoEhBootstrap) {
            return c.json({ 
                erro: 'Ações Negadas.',
                detalhe: 'Apenas membros na lista de segurança (Bootstrap) podem possuir o cargo ADM.' 
            }, 403);
        }

        // 2. Imutabilidade do Dono: Não é possível remover o cargo ADMIN de quem está no bootstrap pelo painel
        if (atual.role === Roles.ADMIN && alvoEhBootstrap && roleNormalizada !== Roles.ADMIN) {
            return c.json({ 
                erro: 'Operação Bloqueada.',
                detalhe: 'Administradores de Segurança são imutáveis via interface. Altere a variável BOOTSTRAP_ADMIN_EMAIL no servidor.' 
            }, 403);
        }

        // 3. 🛡️ Segurança Hierárquica: Não é permitido promover alguém ao seu próprio nível ou acima.
        const idxExecutor = configuradas.indexOf(usuarioLogado.role);
        const idxNovo = configuradas.indexOf(roleNormalizada);
        const idxAtual = configuradas.indexOf(atual.role);

        // Se não for ADMIN de segurança, aplicar travas de subordinação
        if (usuarioLogado.role !== Roles.ADMIN) {
            // Travas de Promoção: Não pode elevar ninguém ao seu nível ou além
            if (idxNovo <= idxExecutor) {
                return c.json({ 
                    erro: 'Governança Violada.',
                    detalhe: 'Você não possui autoridade para promover membros ao seu cargo ou superior.' 
                }, 403);
            }

            // Travas de Edição: Não pode alterar cargos de quem está no seu nível ou acima
            if (idxAtual <= idxExecutor) {
                return c.json({ 
                    erro: 'Governança Violada.',
                    detalhe: 'Membros em níveis hierárquicos equivalentes ou superiores ao seu são imutáveis por sua conta.' 
                }, 403);
            }
        }

        await DB.prepare('UPDATE usuarios SET role = ? WHERE id = ?').bind(roleNormalizada, id).run();
        if (softhub_kv) await invalidarSessaoCache(softhub_kv, id);

        await criarNotificacoes(DB, {
            usuarioId: id,
            tipo: 'sistema',
            titulo: 'Hierarquia Atualizada',
            mensagem: `Seu cargo foi alterado para ${roleNormalizada}.`,
            link: '/app/membros'
        }, softhub_kv);

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'MEMBRO_ROLE_ALTERADA',
            modulo: 'admin',
            descricao: `Role de ${atual.email} alterada de ${atual.role} para ${roleNormalizada}`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'usuarios',
            entidadeId: id,
            dadosAnteriores: { role: atual.role },
            dadosNovos: { role: roleNormalizada }
        });

        return c.json({ sucesso: true });
    } catch (erro: any) {
        log('error', '[ADMIN] Erro ao alterar role', { erro: erro.message });
        return c.json({ erro: 'Erro ao processar alteração.' }, 400);
    }
});

/**
 * Remove um membro permanentemente.
 */
rotasAdmin.delete('/:id', autenticacaoRequerida(), verificarPermissao('membros:desativar'), async (c: Context) => {
    const { DB, softhub_kv, BOOTSTRAP_ADMIN_EMAIL } = c.env;
    const usuarioLogado = c.get('usuario');
    const id = c.req.param('id');

    if (!id || usuarioLogado.id === id) return c.json({ erro: 'Operação inválida.' }, 400);

    try {
        const atual = await DB.prepare('SELECT email, nome, role FROM usuarios WHERE id = ?').bind(id).first() as UsuarioDB | null;
        if (!atual) return c.json({ erro: 'Não encontrado.' }, 404);

        const listaBootstrap = (BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase().split(',').map((e: string) => e.trim());
        const alvoEhBootstrap = listaBootstrap.includes(atual.email.toLowerCase());

        // 🛡️ Protege Administradores de Segurança contra exclusão total
        if (alvoEhBootstrap && atual.role === Roles.ADMIN) {
            return c.json({ 
                erro: 'Acesso Negado.',
                detalhe: 'Administradores de Segurança (Bootstrap) possuem proteção vitalícia contra exclusão.' 
            }, 403);
        }

        // Proteção contra Cascata: Inativação lógica (Soft Delete) invés de DELETE físico
        await DB.prepare('UPDATE usuarios SET arquivado = 1, versao_token = versao_token + 1 WHERE id = ?').bind(id).run();
        
        // Expulsão instantânea: Destrói chaves de Refresh Token ativas no banco de dados
        await DB.prepare('DELETE FROM usuarios_sessoes WHERE usuario_id = ?').bind(id).run();
        
        // Limpa o cache do Cloudflare KV de autenticação
        if (softhub_kv) await invalidarSessaoCache(softhub_kv, id);

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'MEMBRO_REMOVIDO_HARD',
            modulo: 'admin',
            descricao: `Membro ${atual.email} removido do sistema.`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'usuarios',
            entidadeId: id,
            dadosAnteriores: { email: atual.email, role: atual.role }
        });

        return c.json({ sucesso: true });
    } catch (erro: any) {
        return c.json({ erro: 'Erro ao remover membro.' }, 500);
    }
});

const PreCadastroSchema = z.object({
    email: z.string().email(),
    role: z.string().min(1)
});

/**
 * Pré-cadastro de membro individual.
 */
rotasAdmin.post('/', autenticacaoRequerida(), verificarPermissao('membros:gerenciar'), zValidator('json', PreCadastroSchema), async (c: Context) => {
    const { DB, BOOTSTRAP_ADMIN_EMAIL, softhub_kv } = c.env;
    const usuarioLogado = c.get('usuario');
    const { email, role: roleRaw } = (c.req as any).valid('json');
    const emailLimpo = email.toLowerCase().trim();

    try {
        const role = roleRaw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        // Validar contra cargos no DB
        const resH = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind('hierarquia_roles').first() as ConfigSistemaDB | null;
        const validas = resH ? JSON.parse(resH.valor) as string[] : [Roles.ADMIN, Roles.MEMBRO];

        if (!validas.includes(role) && ![Roles.ADMIN, 'TODOS'].includes(role)) {
            return c.json({ erro: `Cargo '${roleRaw}' não existe na hierarquia do sistema.` }, 400);
        }

        const dominios = await obterConfiguracao(c.env, 'dominios_autorizados') || ['unieuro.com.br', 'unieuro.edu.br'];
        if (!dominios.some((d: string) => emailLimpo.endsWith(`@${d}`))) return c.json({ erro: 'Domínio não autorizado.' }, 400);

        const listaBootstrap = (BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase().split(',').map((e: string) => e.trim());
        const isBootstrap = listaBootstrap.includes(emailLimpo);
        
        const roleFinal = isBootstrap ? Roles.ADMIN : (role === Roles.ADMIN ? Roles.MEMBRO : role);

        const existe = await DB.prepare('SELECT id FROM usuarios WHERE email = ?').bind(emailLimpo).first();
        if (existe) return c.json({ erro: 'E-mail em uso.' }, 409);

        const novoId = crypto.randomUUID();
        await DB.prepare('INSERT INTO usuarios (id, nome, email, role) VALUES (?, ?, ?, ?)')
            .bind(novoId, emailLimpo.split('@')[0], emailLimpo, roleFinal).run();

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'MEMBRO_PRE_CADASTRADO',
            modulo: 'admin',
            descricao: `Usuário ${emailLimpo} pré-autorizado como ${roleFinal}`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'usuarios',
            entidadeId: novoId,
            dadosNovos: { email: emailLimpo, role: roleFinal }
        });

        return c.json({ sucesso: true, id: novoId }, 201);
    } catch (erro: any) {
        return c.json({ erro: 'Falha ao cadastrar.' }, 500);
    }
});

export default rotasAdmin;
