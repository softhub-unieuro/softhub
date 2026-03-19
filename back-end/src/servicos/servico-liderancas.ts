import { Env } from '../index';
import { obterConfiguracao } from './servico-configuracoes';

/**
 * Serviço responsável por sincronizar as roles (cargos) de acordo com a liderança das equipes.
 */
export async function sincronizarLiderancaUsuario(env: Env, usuarioId: string) {
    const { DB, softhub_kv } = env;

    try {
        // 1. Verificar o nível de liderança atual do usuário em TODAS as equipes
        const lideranca = await DB.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM equipes WHERE lider_id = ?) as eh_lider,
                (SELECT COUNT(*) FROM equipes WHERE sub_lider_id = ?) as eh_sub_lider
        `).bind(usuarioId, usuarioId).first() as any;

        const ehLider = Number(lideranca?.eh_lider || 0) > 0;
        const ehSubLider = Number(lideranca?.eh_sub_lider || 0) > 0;

        // 2. Verificar o cargo atual do usuário
        const usuario = await DB.prepare('SELECT role FROM usuarios WHERE id = ?').bind(usuarioId).first() as any;
        if (!usuario) return;

        const roleAtual = usuario.role;
        let roleNova = roleAtual;

        // Se for Líder, o cargo deve ser pelo menos LIDER
        if (ehLider) {
            if (roleAtual === 'MEMBRO' || roleAtual === 'SUB-LIDER' || roleAtual === 'SUBLIDER') {
                roleNova = 'LIDER';
            }
        } 
        // Se for Sublíder e não for Líder em outra equipe
        else if (ehSubLider) {
            if (roleAtual === 'MEMBRO' || roleAtual === 'LIDER') {
                roleNova = 'SUB-LIDER';
            }
        }
        // Se não for nem Líder nem Sublíder em nenhuma equipe
        else {
            if (roleAtual === 'LIDER' || roleAtual === 'SUB-LIDER' || roleAtual === 'SUBLIDER') {
                roleNova = 'MEMBRO';
            }
        }

        // 3. Se houver mudança, aplica e garante que o cargo existe nas configurações
        if (roleNova !== roleAtual) {
            if (roleNova === 'LIDER' || roleNova === 'SUB-LIDER') {
                await garantirExistenciaRole(env, roleNova);
            }

            await DB.prepare('UPDATE usuarios SET role = ? WHERE id = ?').bind(roleNova, usuarioId).run();
            
            // Invalida cache de sessão
            if (softhub_kv) await softhub_kv.delete(`sessao:${usuarioId}`);
            
            console.log(`[Liderança] Sincronizado: Usuário ${usuarioId} alterado de ${roleAtual} para ${roleNova}`);
        }

    } catch (e) {
        console.error(`[Liderança] Falha ao sincronizar role do usuário ${usuarioId}:`, e);
    }
}

/**
 * Garante que um cargo (role) exista no sistema de configurações (matriz de permissões e hierarquia).
 */
async function garantirExistenciaRole(env: Env, role: string) {
    const { DB, softhub_kv } = env;

    try {
        const resPermissoes = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind('permissoes_roles').first<{ valor: string }>();
        const resHierarquia = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind('hierarquia_roles').first<{ valor: string }>();

        let permissoes_roles = resPermissoes ? JSON.parse(resPermissoes.valor) : {};
        let hierarquia_roles = resHierarquia ? JSON.parse(resHierarquia.valor) : [];

        let houveMudanca = false;

        // Adicionar na Matriz de Permissões se não existir
        if (!permissoes_roles[role]) {
            // Permissões padrão para cargos de liderança equipe
            const permissoesPadrao: any = {
                'kanban:visualizar': true,
                'tarefas:visualizar': true,
                'tarefas:criar': true,
                'tarefas:editar': true,
                'comentarios:criar': true,
                'membros:visualizar': true,
                'equipes:visualizar': true
            };

            if (role === 'LIDER') {
                permissoesPadrao['tarefas:remover'] = true;
                permissoesPadrao['tarefas:arquivar'] = true;
            }

            permissoes_roles[role] = permissoesPadrao;
            houveMudanca = true;
        }

        // Adicionar na Hierarquia se não existir
        if (!hierarquia_roles.includes(role)) {
            // Inserir em ordens específicas se possível
            // Hierarquia esperada: ADMIN > COORDENADOR > GESTOR > LIDER > SUB-LIDER > MEMBRO
            if (role === 'LIDER') {
                const idxGestor = hierarquia_roles.indexOf('GESTOR');
                const idxMembro = hierarquia_roles.indexOf('MEMBRO');
                if (idxGestor !== -1) hierarquia_roles.splice(idxGestor + 1, 0, 'LIDER');
                else if (idxMembro !== -1) hierarquia_roles.splice(idxMembro, 0, 'LIDER');
                else hierarquia_roles.push('LIDER');
            } 
            else if (role === 'SUB-LIDER') {
                const idxLider = hierarquia_roles.indexOf('LIDER');
                const idxMembro = hierarquia_roles.indexOf('MEMBRO');
                if (idxLider !== -1) hierarquia_roles.splice(idxLider + 1, 0, 'SUB-LIDER');
                else if (idxMembro !== -1) hierarquia_roles.splice(idxMembro, 0, 'SUB-LIDER');
                else hierarquia_roles.push('SUB-LIDER');
            }
            houveMudanca = true;
        }

        if (houveMudanca) {
            await DB.batch([
                DB.prepare('UPDATE configuracoes_sistema SET valor = ? WHERE chave = ?').bind(JSON.stringify(permissoes_roles), 'permissoes_roles'),
                DB.prepare('UPDATE configuracoes_sistema SET valor = ? WHERE chave = ?').bind(JSON.stringify(hierarquia_roles), 'hierarquia_roles')
            ]);
            
            if (softhub_kv) {
                await softhub_kv.delete('permissoes_roles');
                await softhub_kv.delete('hierarquia_roles');
                await softhub_kv.delete('configs_publicas');
            }
            console.log(`[Liderança] Auto-criado cargo: ${role} nas configurações.`);
        }

    } catch (e) {
        console.error(`[Liderança] Erro ao garantir existência da role ${role}:`, e);
    }
}
