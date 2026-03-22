import { Context } from 'hono';
import { log } from '../utilitarios/logger';

/**
 * Manipulador global de exceções.
 * Captura erros não tratados nas rotas e retorna uma resposta padronizada em PT-BR.
 * @param erro O erro capturado.
 * @param c Contexto do Hono.
 */
export async function lidarExcecao(erro: Error, c: Context) {
    log('error', '[EXCEÇÃO GLOBAL]', { 
        erro: erro.message, 
        metodo: c.req.method, 
        url: c.req.url 
    });

    // Regra: Nunca vazar stack trace!
    return c.json({
        erro: 'Erro interno no servidor.',
        // Apenas passamos a mensagem de erro original de forma genérica se for muito necessário.
        // Em Cloudflare Workers não existe process.env, dependemos de c.env injetado por bindings.
        mensagem: erro.message
    }, 500);
}
