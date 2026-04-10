import { Context } from 'hono';
import { Env } from '../index';
import * as repo from '../repositorios/repo-projetos';
import { registrarLog } from './servico-logs';
import { Octokit } from '@octokit/rest';
import { verificarPermissaoManual } from '../middleware/auth';
import { sanitizarHTML } from '../utilitarios/limpeza';
import { ProjetoDB, UsuarioDB } from '../modelos/tipagem-banco';

/**
 * Lista todos os projetos visíveis para o usuário autenticado, incluindo métricas.
 * 
 * @param env - Variáveis de ambiente e bindings
 * @param usuario - Dados do usuário solicitante
 * @param c - Contexto da requisição Hono
 * @returns Lista de projetos com suas respectivas equipes vinculadas
 */
export async function listarProjetos(env: Env, usuario: UsuarioDB, c: Context) {
    const { DB } = env;
    const podeVerTudo = await verificarPermissaoManual(c, 'projetos:visualizar');
    
    const projetos = await repo.buscarProjetosVisiveis(DB, usuario.id, podeVerTudo);

    for (const p of (projetos as (ProjetoDB & { equipes_json?: string, equipes?: unknown[] })[])) {
        p.equipes = p.equipes_json ? JSON.parse(p.equipes_json) : [];
        delete p.equipes_json;
    }

    return projetos;
}

/**
 * Cria um novo projeto no sistema, limpa caches globais e registra a auditoria.
 * 
 * @param env - Variáveis de ambiente
 * @param usuario - Autor da criação
 * @param dados - Objeto com nome, descrição, visibilidade e equipes
 * @param ip - Endereço IP de origem para auditoria
 * @returns UUID do projeto criado e status de sucesso
 */
export async function criarProjeto(
    env: Env, 
    usuario: UsuarioDB, 
    dados: { nome: string; descricao?: string; publico?: boolean; equipes?: { equipe_id: string; acesso: string }[] }, 
    ip: string
) {
    const { DB, softhub_kv } = env;
    const id = crypto.randomUUID();

    if (dados.descricao) {
        dados.descricao = sanitizarHTML(dados.descricao);
    }

    await repo.inserirProjeto(DB, id, dados);

    if (dados.equipes && Array.isArray(dados.equipes)) {
        await repo.atualizarEquipesProjeto(DB, id, dados.equipes);
    }

    if (dados.publico) await softhub_kv?.delete('portfolio:publicos');

    await registrarLog(DB, {
        usuarioId: usuario.id,
        acao: 'PROJETO_CRIADO',
        modulo: 'projetos',
        descricao: `Projeto "${dados.nome}" criado com ID ${id}`,
        ip,
        entidadeTipo: 'projetos',
        entidadeId: id
    });

    return { id, sucesso: true };
}



/**
 * Atualiza campos específicos de um projeto com validações de permissão por cargo.
 * 
 * @param env - Variáveis de ambiente
 * @param usuario - Usuário solicitante
 * @param id - UUID do projeto a ser editado
 * @param corpo - Objeto contendo apenas os campos a serem alterados
 * @param c - Contexto Hono
 * @returns Confirmação da atualização
 * @throws {Error} Se o projeto não for encontrado ou se houver violação de permissão
 */
export async function editarProjeto(
    env: Env, 
    usuario: UsuarioDB, 
    id: string, 
    corpo: Partial<ProjetoDB> & { equipes?: { equipe_id: string; acesso: string }[] }, 
    c: Context
) {
    const { DB, softhub_kv } = env;

    const atual = await repo.buscarPorId(DB, id);
    if (!atual) throw new Error('Projeto não encontrado');

    const mudancaPublico = corpo.publico !== undefined && (corpo.publico ? 1 : 0) !== atual.publico;
    const mudancaLinks = (corpo.github_repo !== undefined && corpo.github_repo !== atual.github_repo) ||
                        (corpo.documentacao_url !== undefined && corpo.documentacao_url !== atual.documentacao_url) ||
                        (corpo.figma_url !== undefined && corpo.figma_url !== atual.figma_url) ||
                        (corpo.setup_url !== undefined && corpo.setup_url !== atual.setup_url);

    if (mudancaPublico) {
        const podePublicar = await verificarPermissaoManual(c, 'projetos:publicar_portfolio');
        if (!podePublicar) throw new Error('Sem permissão para alterar visibilidade do portfólio.');
    }

    if (mudancaLinks) {
        const podeGerenciarLinks = await verificarPermissaoManual(c, 'projetos:gerenciar_links');
        if (!podeGerenciarLinks) throw new Error('Sem permissão para gerenciar links técnicos.');
    }

    const campos = [];
    const valores = [];
    if (corpo.nome !== undefined) { campos.push('nome = ?'); valores.push(corpo.nome); }
    if (corpo.descricao !== undefined) { 
        campos.push('descricao = ?'); 
        valores.push(corpo.descricao ? sanitizarHTML(corpo.descricao) : null); 
    }
    if (corpo.publico !== undefined) { campos.push('publico = ?'); valores.push(corpo.publico ? 1 : 0); }
    if (corpo.github_repo !== undefined) { campos.push('github_repo = ?'); valores.push(corpo.github_repo); }
    if (corpo.documentacao_url !== undefined) { campos.push('documentacao_url = ?'); valores.push(corpo.documentacao_url); }
    if (corpo.figma_url !== undefined) { campos.push('figma_url = ?'); valores.push(corpo.figma_url); }
    if (corpo.setup_url !== undefined) { campos.push('setup_url = ?'); valores.push(corpo.setup_url); }

    if (campos.length > 0) {
        await repo.atualizarProjeto(DB, id, campos, valores);
    }

    if (corpo.equipes && Array.isArray(corpo.equipes)) {
        await repo.atualizarEquipesProjeto(DB, id, corpo.equipes);
    }

    await softhub_kv?.delete('portfolio:publicos');

    await registrarLog(DB, {
        usuarioId: usuario.id,
        acao: 'PROJETO_EDITADO',
        modulo: 'projetos',
        descricao: `Projeto ${id} editado`,
        ip: c.req.header('CF-Connecting-IP') ?? '',
        entidadeTipo: 'projetos',
        entidadeId: id
    });

    return { sucesso: true };
}

/**
 * Arquiva um projeto (Soft Delete) no banco de dados e limpa cache público.
 * 
 * @param env - Variáveis de ambiente
 * @param usuario - Autor da remoção
 * @param id - UUID do projeto
 * @param c - Contexto Hono
 * @returns Confirmação da remoção
 * @throws {Error} Se o projeto não existir
 */
export async function deletarProjeto(env: Env, usuario: UsuarioDB, id: string, c: Context) {
    const { DB, softhub_kv } = env;

    const projeto = await repo.buscarPorId(DB, id);
    if (!projeto) throw new Error('Projeto não encontrado');

    await repo.arquivarProjeto(DB, id);

    await registrarLog(DB, {
        usuarioId: usuario.id,
        acao: 'PROJETO_REMOVIDO_HARD',
        modulo: 'projetos',
        descricao: `Projeto "${projeto.nome}" removido permanentemente`,
        ip: c.req.header('CF-Connecting-IP') ?? '',
        entidadeTipo: 'projetos',
        entidadeId: id
    });

    if (softhub_kv) await softhub_kv.delete('portfolio:publicos');

    return { sucesso: true };
}

/**
 * Remove o repositório no GitHub.
 */
export async function deletarRepositorioGitHub(env: Env, projetoId: string) {
    const { DB, GITHUB_TOKEN, GITHUB_OWNER } = env;

    const projeto = await repo.buscarPorId(DB, projetoId);
    if (!projeto?.github_repo) throw new Error('Projeto não possui repositório vinculado.');

    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    await octokit.repos.delete({
        owner: GITHUB_OWNER,
        repo: projeto.github_repo,
    });

    return { sucesso: true };
}
