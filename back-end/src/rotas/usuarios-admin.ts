import { Hono, Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Env } from '../index';
import { autenticacaoRequerida, verificarPermissao } from '../middleware/auth';
import { registrarLog } from '../servicos/servico-logs';
import { criarNotificacoes } from '../servicos/servico-notificacoes';
import { obterConfiguracao } from '../servicos/servico-configuracoes';

const rotasAdmin = new Hono<{ Bindings: Env; Variables: { usuario: any } }>();

const ROLES_VALIDAS = ['ADMIN', 'COORDENADOR', 'GESTOR', 'LIDER', 'SUBLIDER', 'SUB-LIDER', 'MEMBRO', 'LIDER-TECNICO'];

/**
 * Altera a role (cargo) de um membro.
 * Suporta chaves com ou sem acento, normalizando para ASCII antes de salvar.
 */
rotasAdmin.patch('/:id/role', autenticacaoRequerida(), verificarPermissao(['membros:alterar_role', 'membros:gerenciar']), async (c: Context) => {
    const { DB, softhub_kv } = c.env;
    const usuarioLogado = c.get('usuario') as any;
    const id = c.req.param('id');
    
    try {
        const body = await c.req.json();
        let role = body.role?.toUpperCase() || '';

        // Normalização: Remove acentos para salvar a chave ASCII no banco
        const roleNormalizada = role.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (!ROLES_VALIDAS.includes(roleNormalizada)) {
            return c.json({ erro: `Cargo '${role}' é inválido para o sistema.` }, 400);
        }

        const atual = await DB.prepare('SELECT role FROM usuarios WHERE id = ?').bind(id).first() as any;
        if (!atual) return c.json({ erro: 'Usuário não encontrado.' }, 404);

        // Se estiver tentando se promover para ADMIN sem ser ADMIN, bloqueia
        if (roleNormalizada === 'ADMIN' && usuarioLogado.role !== 'ADMIN') {
            return c.json({ erro: 'Apenas Administradores podem conceder o cargo de ADMIN.' }, 403);
        }

        await DB.prepare('UPDATE usuarios SET role = ? WHERE id = ?').bind(roleNormalizada, id).run();

        // Invalida cache de sessão
        if (softhub_kv) await softhub_kv.delete(`sessao:${id}`);

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
        return c.json({ erro: 'Erro ao processar alteração de cargo.' }, 400); // 400 em caso de JSON malformado
    }
});

/**
 * Remove um membro permanentemente.
 */
rotasAdmin.delete('/:id', autenticacaoRequerida(), verificarPermissao('membros:desativar'), async (c: Context) => {
    const { DB } = c.env;
    const usuarioLogado = c.get('usuario') as any;
    const id = c.req.param('id');

    if (usuarioLogado.id === id) return c.json({ erro: 'Não é possível excluir a própria conta.' }, 400);

    try {
        const atual = await DB.prepare('SELECT nome FROM usuarios WHERE id = ?').bind(id).first() as any;
        if (!atual) return c.json({ erro: 'Não encontrado.' }, 404);

        await DB.prepare('DELETE FROM usuarios WHERE id = ?').bind(id).run();
        
        // Invalida cache de sessão
        const { softhub_kv } = c.env;
        if (softhub_kv) await softhub_kv.delete(`sessao:${id}`);
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
    const { DB, BOOTSTRAP_ADMIN_EMAIL } = c.env;
    const usuarioLogado = c.get('usuario') as any;
    const { email, role: roleRaw } = (c.req as any).valid('json');
    const emailLimpo = email.toLowerCase().trim();

    try {
        // Normalização: Remove acentos e joga pra maiúsculo
        const role = roleRaw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (!ROLES_VALIDAS.includes(role)) {
            return c.json({ erro: `Cargo '${roleRaw}' inválido.` }, 400);
        }

        // Validação de domínios via serviço centralizado
        const dominios = await obterConfiguracao(c.env, 'dominios_autorizados') || ['unieuro.com.br', 'unieuro.edu.br'];
        
        if (!dominios.some((d: string) => emailLimpo.endsWith(`@${d}`))) {
            return c.json({ erro: 'Domínio de e-mail não autorizado.' }, 400);
        }

        const isBootstrap = (BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase().split(',').includes(emailLimpo);
        const roleFinal = isBootstrap ? 'ADMIN' : role;

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
