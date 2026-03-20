import { Hono, Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { registrarLog } from '../servicos/servico-logs';
import { criarNotificacoes } from '../servicos/servico-notificacoes';
import { obterConfiguracao } from '../servicos/servico-configuracoes';
import { invalidarSessaoCache } from '../servicos/servico-acesso';

const rotasAdmin = new Hono<{ Bindings: Env; Variables: { usuario: any } }>();

const ROLES_VALIDAS = ['ADMIN', 'COORDENADOR', 'GESTOR', 'LIDER', 'SUBLIDER', 'SUB-LIDER', 'MEMBRO', 'LIDER-TECNICO'];

/**
 * Altera a role (cargo) de um membro.
 * Suporta chaves com ou sem acento, normalizando para ASCII antes de salvar.
 */
rotasAdmin.patch('/:id/role', autenticacaoRequerida(), verificarPermissao(['membros:alterar_role', 'membros:gerenciar']), async (c: Context) => {
    const { DB, softhub_kv, BOOTSTRAP_ADMIN_EMAIL } = c.env;
    const usuarioLogado = c.get('usuario') as any;
    const id = c.req.param('id');
    
    if (!id) return c.json({ erro: 'ID do membro não fornecido.' }, 400);

    try {
        const body = await c.req.json();
        let role = body.role?.toUpperCase() || '';

        // Normalização: Remove acentos para salvar a chave ASCII no banco
        const roleNormalizada = role.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (!ROLES_VALIDAS.includes(roleNormalizada)) {
            return c.json({ erro: `Cargo '${role}' é inválido para o sistema.` }, 400);
        }

        const atual = await DB.prepare('SELECT email, role FROM usuarios WHERE id = ?').bind(id).first() as any;
        if (!atual) return c.json({ erro: 'Usuário não encontrado.' }, 404);

        const listaBootstrap = (BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase().split(',').map((e: string) => e.trim());
        const ehMembroBootstrap = listaBootstrap.includes(atual.email.toLowerCase());

        // 🛡️ REGRA CRÍTICA: ADMINS SÃO DEFINIDOS APENAS VIA BOOTSTRAP
        
        // 1. Bloqueia promoção para ADMIN se não estiver no bootstrap
        if (roleNormalizada === 'ADMIN' && !ehMembroBootstrap) {
            return c.json({ 
                erro: 'Acesso negado: Cargo Crítico.',
                detalhe: 'Apenas membros autorizados na lista de segurança (Bootstrap) podem ser Administradores.' 
            }, 403);
        }

        // 2. Bloqueia alteração de cargo de um ADMIN de bootstrap (para evitar "demissão" acidental ou por malícia)
        if (atual.role === 'ADMIN' && ehMembroBootstrap && roleNormalizada !== 'ADMIN') {
            return c.json({ 
                erro: 'Acesso negado: Cargo Protegido.',
                detalhe: 'Não é possível remover o cargo de um Administrador de Segurança via painel. Altere a variável BOOTSTRAP_ADMIN_EMAIL.' 
            }, 403);
        }

        await DB.prepare('UPDATE usuarios SET role = ? WHERE id = ?').bind(roleNormalizada, id).run();

        // Invalida cache de sessão usando o serviço centralizado
        if (softhub_kv) {
            await invalidarSessaoCache(softhub_kv, id);
        }

        await criarNotificacoes(DB, {
            usuarioId: id,
            tipo: 'sistema',
            titulo: 'Cargo Atualizado',
            mensagem: `Seu cargo foi atualizado para ${roleNormalizada} pela administração.`,
            link: '/app/membros'
        }, softhub_kv);

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'MEMBRO_ROLE_ALTERADA',
            modulo: 'admin',
            descricao: `Role do membro ${id} alterada de ${atual.role} para ${roleNormalizada}`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'usuarios',
            entidadeId: id
        });

        return c.json({ sucesso: true });
    } catch (erro) {
        console.error('[ERRO] PATCH /api/usuarios/:id/role', erro);
        return c.json({ erro: 'Erro ao processar alteração de cargo.' }, 400);
    }
});

/**
 * Remove um membro permanentemente.
 */
rotasAdmin.delete('/:id', autenticacaoRequerida(), verificarPermissao('membros:desativar'), async (c: Context) => {
    const { DB, softhub_kv, BOOTSTRAP_ADMIN_EMAIL } = c.env;
    const usuarioLogado = c.get('usuario') as any;
    const id = c.req.param('id');

    if (!id) return c.json({ erro: 'ID do membro não fornecido.' }, 400);
    if (usuarioLogado.id === id) return c.json({ erro: 'Não é possível excluir a própria conta.' }, 400);

    try {
        const atual = await DB.prepare('SELECT email, nome, role FROM usuarios WHERE id = ?').bind(id).first() as any;
        if (!atual) return c.json({ erro: 'Não encontrado.' }, 404);

        const listaBootstrap = (BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase().split(',').map((e: string) => e.trim());
        const ehMembroBootstrap = listaBootstrap.includes(atual.email.toLowerCase());

        // 🛡️ Protege Administradores de Segurança contra exclusão
        if (ehMembroBootstrap && atual.role === 'ADMIN') {
            return c.json({ 
                erro: 'Ações Negadas.',
                detalhe: 'Um Administrador de Segurança (Bootstrap) não pode ser excluído do sistema.' 
            }, 403);
        }

        await DB.prepare('DELETE FROM usuarios WHERE id = ?').bind(id).run();
        
        // Invalida cache de sessão
        if (softhub_kv) await invalidarSessaoCache(softhub_kv, id);

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'MEMBRO_REMOVIDO_HARD',
            modulo: 'admin',
            descricao: `Membro ${atual.nome} removido permanentemente`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'usuarios',
            entidadeId: id
        });

        return c.json({ sucesso: true });
    } catch (erro) {
        console.error('[ERRO] DELETE /api/usuarios/:id', erro);
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
    const usuarioLogado = c.get('usuario') as any;
    const { email, role: roleRaw } = (c.req as any).valid('json');
    const emailLimpo = email.toLowerCase().trim();

    try {
        const role = roleRaw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (!ROLES_VALIDAS.includes(role)) {
            return c.json({ erro: `Cargo '${roleRaw}' inválido.` }, 400);
        }

        const dominios = await obterConfiguracao(c.env, 'dominios_autorizados') || ['unieuro.com.br', 'unieuro.edu.br'];
        
        if (!dominios.some((d: string) => emailLimpo.endsWith(`@${d}`))) {
            return c.json({ erro: 'Domínio de e-mail não autorizado.' }, 400);
        }

        const listaBootstrap = (BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase().split(',').map((e: string) => e.trim());
        const isBootstrap = listaBootstrap.includes(emailLimpo);
        
        const roleFinal = isBootstrap ? 'ADMIN' : (role === 'ADMIN' ? 'MEMBRO' : role);

        const existe = await DB.prepare('SELECT id FROM usuarios WHERE email = ?').bind(emailLimpo).first();
        if (existe) return c.json({ erro: 'E-mail já cadastrado.' }, 409);

        const novoId = crypto.randomUUID();
        await DB.prepare('INSERT INTO usuarios (id, nome, email, role) VALUES (?, ?, ?, ?)')
            .bind(novoId, emailLimpo.split('@')[0], emailLimpo, roleFinal).run();

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'MEMBRO_PRE_CADASTRADO',
            modulo: 'admin',
            descricao: `Pré-cadastro de ${emailLimpo} como ${roleFinal}`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'usuarios',
            entidadeId: novoId
        });

        return c.json({ sucesso: true, id: novoId }, 201);
    } catch (erro) {
        console.error('[ERRO] POST /api/usuarios', erro);
        return c.json({ erro: 'Falha no cadastro.' }, 500);
    }
});

export default rotasAdmin;
