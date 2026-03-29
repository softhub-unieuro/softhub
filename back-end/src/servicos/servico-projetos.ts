import { Env } from '../index';
import * as repo from '../repositorios/repo-projetos';
import { registrarLog } from './servico-logs';
import { log } from '../utilitarios/logger';
import { Octokit } from '@octokit/rest';
import { verificarPermissaoManual } from '../middleware/auth';
import { sanitizarHTML } from '../utilitarios/limpeza';

/**
 * Lista projetos para o usuário logado com métricas.
 */
export async function listarProjetos(env: Env, usuario: any, c: any) {
    const { DB } = env;
    const podeVerTudo = await verificarPermissaoManual(c, 'projetos:visualizar');
    
    const projetos = await repo.buscarProjetosVisiveis(DB, usuario.id, podeVerTudo);

    for (const p of (projetos as any[])) {
        p.equipes = p.equipes_json ? JSON.parse(p.equipes_json) : [];
        delete p.equipes_json;
    }

    return projetos;
}

/**
 * Cria um projeto e invalida cache se público.
 */
export async function criarProjeto(env: Env, usuario: any, dados: any, ip: string) {
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
 * Gerencia arquivos no GitHub para um projeto.
 */
export async function gerenciarArquivosGitHub(env: Env, projetoId: string, acao: 'get' | 'upload' | 'delete', payload: any) {
    const { DB, GITHUB_TOKEN, GITHUB_OWNER } = env;
    
    const projeto = await repo.buscarPorId(DB, projetoId);
    if (!projeto?.github_repo) {
        if (acao === 'get') return { arquivos: [] };
        throw new Error('Projeto não configurado com repositório GitHub.');
    }

    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    if (acao === 'get') {
        try {
            const response = await octokit.repos.getContent({
                owner: GITHUB_OWNER,
                repo: projeto.github_repo,
                path: payload.pasta || 'docs/softhub',
            });
            if (Array.isArray(response.data)) {
                return {
                    arquivos: response.data
                        .filter((file: any) => file.type === 'file')
                        .map((file: any) => ({
                            name: file.name,
                            path: file.path,
                            sha: file.sha,
                            size: file.size,
                            download_url: file.download_url
                        }))
                };
            }
            return { arquivos: [] };
        } catch (e: any) {
            if (e.status === 404) return { arquivos: [] };
            throw e;
        }
    }

    if (acao === 'upload') {
        const pasta = payload.pathFolder || 'docs/softhub';
        await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: projeto.github_repo,
            path: `${pasta}/${payload.nome}`,
            message: `Upload: ${payload.nome} via SoftHub`,
            content: payload.conteudo,
        });
        return { sucesso: true };
    }

    if (acao === 'delete') {
        await octokit.repos.deleteFile({
            owner: GITHUB_OWNER,
            repo: projeto.github_repo,
            path: payload.path,
            sha: payload.sha,
            message: `Remoção: ${payload.path.split('/').pop()} via SoftHub`,
        });
        return { sucesso: true };
    }
}

/**
 * Atualiza um projeto com validações de permissão granulares.
 */
export async function editarProjeto(env: Env, usuario: any, id: string, body: any, c: any) {
    const { DB, softhub_kv } = env;

    const atual = await repo.buscarPorId(DB, id);
    if (!atual) throw new Error('Projeto não encontrado');

    const mudancaPublico = body.publico !== undefined && (body.publico ? 1 : 0) !== atual.publico;
    const mudancaLinks = (body.github_repo !== undefined && body.github_repo !== atual.github_repo) ||
                        (body.documentacao_url !== undefined && body.documentacao_url !== atual.documentacao_url) ||
                        (body.figma_url !== undefined && body.figma_url !== atual.figma_url) ||
                        (body.setup_url !== undefined && body.setup_url !== atual.setup_url);

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
    if (body.nome !== undefined) { campos.push('nome = ?'); valores.push(body.nome); }
    if (body.descricao !== undefined) { 
        campos.push('descricao = ?'); 
        valores.push(sanitizarHTML(body.descricao)); 
    }
    if (body.publico !== undefined) { campos.push('publico = ?'); valores.push(body.publico ? 1 : 0); }
    if (body.github_repo !== undefined) { campos.push('github_repo = ?'); valores.push(body.github_repo); }
    if (body.documentacao_url !== undefined) { campos.push('documentacao_url = ?'); valores.push(body.documentacao_url); }
    if (body.figma_url !== undefined) { campos.push('figma_url = ?'); valores.push(body.figma_url); }
    if (body.setup_url !== undefined) { campos.push('setup_url = ?'); valores.push(body.setup_url); }

    if (campos.length > 0) {
        await repo.atualizarProjeto(DB, id, campos, valores);
    }

    if (body.equipes && Array.isArray(body.equipes)) {
        await repo.atualizarEquipesProjeto(DB, id, body.equipes);
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
 * Deleta (arquiva) um projeto.
 */
export async function deletarProjeto(env: Env, usuario: any, id: string, c: any) {
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
