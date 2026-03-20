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

/**
 * Altera a role (cargo) de um membro.
 */
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
        const resHierarquia = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind('hierarquia_roles').first() as any;
        const configuradas = resHierarquia ? JSON.parse(resHierarquia.valor) as string[] : ['ADMIN', 'COORDENADOR', 'GESTOR', 'LIDER', 'SUBLIDER', 'MEMBRO'];
        
        if (!configuradas.includes(roleNormalizada) && !['ADMIN', 'TODOS'].includes(roleNormalizada)) {
            return c.json({ erro: `Cargo '${role}' é inválido.` }, 400);
        }

        const atual = await DB.prepare('SELECT email, role FROM usuarios WHERE id = ?').bind(id).first() as any;
        if (!atual) return c.json({ erro: 'Usuário não encontrado.' }, 404);

        // Verifica se o ALVO da alteração é um membro de bootstrap
        const listaBootstrap = (BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase().split(',').map((e: string) => e.trim());
        const alvoEhBootstrap = listaBootstrap.includes(atual.email.toLowerCase());

        // 🛡️ REGRAS PROTEGIDAS (Dono/Bootstrap)
        
        // 1. Apenas membros na lista de bootstrap podem se tornar ADMIN
        if (roleNormalizada === 'ADMIN' && !alvoEhBootstrap) {
            return c.json({ 
                erro: 'Ações Negadas.',
                detalhe: 'Apenas membros na lista de segurança (Bootstrap) podem possuir o cargo ADM.' 
            }, 403);
        }

        // 2. Imutabilidade do Dono: Não é possível remover o cargo ADMIN de quem está no bootstrap pelo painel
        if (atual.role === 'ADMIN' && alvoEhBootstrap && roleNormalizada !== 'ADMIN') {
            return c.json({ 
                erro: 'Operação Bloqueada.',
                detalhe: 'Administradores de Segurança são imutáveis via interface. Altere a variável BOOTSTRAP_ADMIN_EMAIL no servidor.' 
            }, 403);
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
            descricao: `Role de ${atual.email} alterada para ${roleNormalizada}`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'usuarios',
            entidadeId: id
        });

        return c.json({ sucesso: true });
    } catch (erro: any) {
        console.error('[ADMIN] Erro ao alterar role:', erro);
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
        const atual = await DB.prepare('SELECT email, nome, role FROM usuarios WHERE id = ?').bind(id).first() as any;
        if (!atual) return c.json({ erro: 'Não encontrado.' }, 404);

        const listaBootstrap = (BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase().split(',').map((e: string) => e.trim());
        const alvoEhBootstrap = listaBootstrap.includes(atual.email.toLowerCase());

        // 🛡️ Protege Administradores de Segurança contra exclusão total
        if (alvoEhBootstrap && atual.role === 'ADMIN') {
            return c.json({ 
                erro: 'Acesso Negado.',
                detalhe: 'Administradores de Segurança (Bootstrap) possuem proteção vitalícia contra exclusão.' 
            }, 403);
        }

        await DB.prepare('DELETE FROM usuarios WHERE id = ?').bind(id).run();
        if (softhub_kv) await invalidarSessaoCache(softhub_kv, id);

        await registrarLog(DB, {
            usuarioId: usuarioLogado.id,
            acao: 'MEMBRO_REMOVIDO_HARD',
            modulo: 'admin',
            descricao: `Membro ${atual.email} removido do sistema.`,
            ip: c.req.header('CF-Connecting-IP') ?? '',
            entidadeTipo: 'usuarios',
            entidadeId: id
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
        const resH = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind('hierarquia_roles').first() as any;
        const validas = resH ? JSON.parse(resH.valor) as string[] : ['ADMIN', 'MEMBRO'];

        if (!validas.includes(role) && !['ADMIN', 'TODOS'].includes(role)) {
            return c.json({ erro: `Cargo '${roleRaw}' não existe na hierarquia do sistema.` }, 400);
        }

        const dominios = await obterConfiguracao(c.env, 'dominios_autorizados') || ['unieuro.com.br', 'unieuro.edu.br'];
        if (!dominios.some((d: string) => emailLimpo.endsWith(`@${d}`))) return c.json({ erro: 'Domínio não autorizado.' }, 400);

        const listaBootstrap = (BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase().split(',').map((e: string) => e.trim());
        const isBootstrap = listaBootstrap.includes(emailLimpo);
        
        const roleFinal = isBootstrap ? 'ADMIN' : (role === 'ADMIN' ? 'MEMBRO' : role);

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
            entidadeId: novoId
        });

        return c.json({ sucesso: true, id: novoId }, 201);
    } catch (erro: any) {
        return c.json({ erro: 'Falha ao cadastrar.' }, 500);
    }
});

export default rotasAdmin;
