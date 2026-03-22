import { D1Database, KVNamespace } from '@cloudflare/workers-types';
import * as repo from '../repositorios/repo-ponto';
import { obterConfiguracao } from './servico-configuracoes';
import { registrarLog } from './servico-logs';
import { log } from '../utilitarios/logger';

/**
 * Valida o horário de batida do ponto conforme a jornada configurada.
 */
export async function validarHorarioBatida(db: D1Database, kv: KVNamespace | undefined, tipo: string, ultimoTipo?: string) {
    // REGRA DE OURO: Se for SAÍDA e houver uma ENTRADA aberta, permitimos registrar MESMO fora do horário.
    if (tipo === 'saida' && ultimoTipo === 'entrada') {
        return { valido: true };
    }

    const horaInicio = await obterConfiguracao({ DB: db, softhub_kv: kv }, 'hora_inicio_ponto') || '13:00';
    const horaFim = await obterConfiguracao({ DB: db, softhub_kv: kv }, 'hora_fim_ponto') || '17:00';
    const diasPermitidos = await obterConfiguracao({ DB: db, softhub_kv: kv }, 'dias_trabalho') || [1, 2, 3, 4, 5];

    const agora = new Date();
    const horaBrasiliaStr = agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false });
    const diaSemana = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getDay();

    const converterParaMinutos = (h: string) => {
        const [horas, minutos] = h.split(':').map(Number);
        return (horas || 0) * 60 + (minutos || 0);
    };

    const agoraMinutos = converterParaMinutos(horaBrasiliaStr);
    const inicioMinutos = converterParaMinutos(horaInicio.replace(/"/g, ''));
    const fimMinutos = converterParaMinutos(horaFim.replace(/"/g, ''));
    const TOLERANCIA = 15;

    if (!diasPermitidos.includes(diaSemana)) {
        return { valido: false, erro: 'Hoje não é dia de funcionamento da Fábrica.' };
    }

    if (agoraMinutos < (inicioMinutos - TOLERANCIA) || agoraMinutos > (fimMinutos + TOLERANCIA)) {
        return { 
            valido: false, 
            erro: `O registro de ponto está autorizado apenas entre ${horaInicio} e ${horaFim} (tolerância de ${TOLERANCIA}min).` 
        };
    }

    return { valido: true };
}

/**
 * Processa o registro de um ponto, aplicando todas as validações de negócio.
 */
export async function registrarPonto(env: { DB: D1Database, KV: KVNamespace | undefined }, usuario: any, tipo: 'entrada' | 'saida', ipOrigem: string) {
    const { DB, KV } = env;

    // 1. Validação de Sequência e Debounce
    const ultimo = await repo.buscarUltimoRegistroHoje(DB, usuario.id);
    if (ultimo) {
        if (ultimo.tipo === tipo) {
            throw new Error(`Você já registrou uma ${tipo} agora mesmo.`);
        }
        
        const agoraMs = new Date().getTime();
        const ultimoMs = new Date(ultimo.registrado_em).getTime();
        const segundosPassados = Math.abs(agoraMs - ultimoMs) / 1000;

        if (segundosPassados < 30) {
            throw new Error('Aguarde pelo menos 30 segundos entre registros de ponto.');
        }
    }

    // 2. Validação de Horário
    const validacao = await validarHorarioBatida(DB, KV, tipo, ultimo?.tipo);
    if (!validacao.valido) {
        throw new Error(validacao.erro);
    }

    // 3. Persistência
    const pontoId = crypto.randomUUID();
    await repo.inserirPonto(DB, {
        id: pontoId,
        usuario_id: usuario.id,
        tipo,
        ip_origem: ipOrigem
    });

    // 4. Atualização de Presença (KV)
    if (KV) {
        try {
            if (tipo === 'entrada') {
                await KV.put(`presenca:${usuario.id}`, JSON.stringify({
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    foto_perfil: usuario.foto_perfil,
                    entrada_em: new Date().toISOString()
                }), { expirationTtl: 28800 });
            } else {
                await KV.delete(`presenca:${usuario.id}`);
            }
        } catch (e: any) {
            log('error', '[SERVICO-PONTO] Falha ao atualizar presença no KV', { erro: e.message, email: usuario.email });
        }
    }

    // 5. Audit Log
    await registrarLog(DB, {
        usuarioId: usuario.id,
        acao: tipo === 'entrada' ? 'PONTO_ENTRADA' : 'PONTO_SAIDA',
        modulo: 'ponto',
        descricao: `Batida de ${tipo} registrada IP: ${ipOrigem}`,
        ip: ipOrigem,
        entidadeTipo: 'ponto_registros',
        entidadeId: pontoId,
        dadosNovos: { tipo, ip_origem: ipOrigem }
    });

    return { sucesso: true, id: pontoId };
}
