/**
 * Interface para os bindings do ambiente necessários.
 * Usamos tipagem flexível para evitar conflitos entre versões do @cloudflare/workers-types.
 */
interface EnvConfig {
    DB: any;
    softhub_kv?: any;
}

/**
 * Busca uma configuração do sistema com cache no KV.
 * Tenta buscar no KV primeiro, se não encontrar busca no D1 e salva no KV com TTL de 1 hora.
 */
export async function obterConfiguracao(env: EnvConfig, chave: string): Promise<any> {
    const { DB, softhub_kv } = env;

    try {
        // 1. Tenta buscar no KV
        let valor = await softhub_kv?.get(chave);

        // 2. Se não estiver no KV, busca no D1
        if (valor === null || valor === undefined) {
            // Removido generic para evitar erro de TS quando DB é 'any'
            const row = await DB.prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ?').bind(chave).first() as { valor: string } | null;
            
            if (row) {
                valor = row.valor;
                // 3. Salva no KV para futuras requisições (TTL 1 hora)
                if (softhub_kv) {
                    await softhub_kv.put(chave, valor, { expirationTtl: 3600 });
                }
            }
        }

        // 4. Se encontrou, tenta fazer parse de JSON
        if (valor) {
            try {
                // Se o valor já estiver com aspas extras (comum em salvamento JSON manual no D1)
                if (typeof valor === 'string' && valor.startsWith('"') && valor.endsWith('"')) {
                    const parsedOnce = JSON.parse(valor);
                    return typeof parsedOnce === 'string' ? JSON.parse(parsedOnce) : parsedOnce;
                }
                return JSON.parse(valor);
            } catch {
                return valor;
            }
        }

        return null;
    } catch (e) {
        console.error(`[CONFIG] Erro ao obter configuração "${chave}":`, e);
        return null;
    }
}

/**
 * Salva uma configuração no D1 e invalida o cache correspondente no KV.
 */
export async function salvarConfiguracao(env: EnvConfig, chave: string, valor: any): Promise<void> {
    const { DB, softhub_kv } = env;
    const valorJson = typeof valor === 'string' ? valor : JSON.stringify(valor);

    // 1. Salva no Banco (D1)
    await DB.prepare('INSERT OR REPLACE INTO configuracoes_sistema (chave, valor) VALUES (?, ?)')
        .bind(chave, valorJson)
        .run();

    // 2. Invalida o Cache (KV)
    if (softhub_kv) {
        await softhub_kv.delete(chave);
        
        // Se for uma configuração que impacta a hierarquia ou permissões, limpamos as chaves globais
        if (['hierarquia_roles', 'permissoes_roles'].includes(chave)) {
            await softhub_kv.delete('hierarquia_roles');
            await softhub_kv.delete('permissoes_roles');
        }
    }
}

/**
 * Verifica se um IP está na lista de IPs autorizados (ou se não há IPs cadastrados).
 */
export async function verificarIpAutorizado(env: EnvConfig, ip: string): Promise<boolean> {
    const ipsAutorizados = await obterConfiguracao(env, 'ip_ponto_autorizado');
    
    // Se não houver lista definida, permite tudo (ou conforme regra de negócio)
    if (!ipsAutorizados || (Array.isArray(ipsAutorizados) && ipsAutorizados.length === 0)) {
        return true;
    }

    const lista = Array.isArray(ipsAutorizados) ? ipsAutorizados : [ipsAutorizados];
    return lista.includes(ip);
}
