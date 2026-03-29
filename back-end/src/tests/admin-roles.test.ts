import { describe, it, expect } from 'vitest';

export function validarGovernançaMudancaRole(executor: string, alvoAtual: string, alvoNovo: string, hierarquia: string[]) {
    // 🛡️ Segurança Hierárquica Extraída para Testabilidade
    
    // ADMIN tem bypass absoluto
    if (executor === 'ADMIN') return { sucesso: true };

    const idxExecutor = hierarquia.indexOf(executor);
    const idxNovo = hierarquia.indexOf(alvoNovo);
    const idxAtual = hierarquia.indexOf(alvoAtual);

    if (idxExecutor === -1) return { sucesso: false, erro: 'Cargo do executor inválido.' };
    if (idxNovo === -1) return { sucesso: false, erro: 'Novo cargo inválido.' };
    if (idxAtual === -1) return { sucesso: false, erro: 'Cargo atual do membro inválido.' };

    // Travas de Promoção: Não pode elevar ninguém ao seu nível ou além
    // (Em arrays de indexação baseada em força crescente, ex: ['MEMBRO', 'LIDER', 'ADMIN'],
    // o índice maior é o cargo mais forte. No SoftHub é index baseado na ordem array).
    // O array atual no softhub: [ADMIN, COORDENADOR, GESTOR, LIDER, SUBLIDER, MEMBRO]
    // Ou seja, ÍNDICE MENOR = CARGO MAIOR!
    
    // No SoftHub real: const configuradas = [Roles.ADMIN, Roles.COORDENADOR, Roles.GESTOR, Roles.LIDER, Roles.SUBLIDER, Roles.MEMBRO]
    // índice 0 = ADMIN (Chefão), índice 5 = MEMBRO (Peão)
    
    // Travas de Promoção: Não pode elevar ninguém ao seu nível ou além (índice <= executor)
    if (idxNovo <= idxExecutor) {
        return { 
            sucesso: false, 
            erro: 'Governança Violada.',
            detalhe: 'Você não possui autoridade para promover membros ao seu cargo ou superior.' 
        };
    }

    // Travas de Edição: Não pode alterar cargos de quem está no seu nível ou acima
    if (idxAtual <= idxExecutor) {
        return { 
            sucesso: false, 
            erro: 'Governança Violada.',
            detalhe: 'Membros em níveis hierárquicos equivalentes ou superiores ao seu são imutáveis por sua conta.' 
        };
    }

    return { sucesso: true };
}

describe('Governança de Hierarquia (Admin Roles)', () => {
    // Escala atual do SoftHub (Menor índice = Mais forte)
    const hierarquia = ['ADMIN', 'COORDENADOR', 'GESTOR', 'LIDER', 'SUBLIDER', 'MEMBRO'];

    it('LIDER não pode promover MEMBRO para LIDER (Barrado)', () => {
        const resultado = validarGovernançaMudancaRole('LIDER', 'MEMBRO', 'LIDER', hierarquia);
        expect(resultado.sucesso).toBe(false);
        expect(resultado.detalhe).toContain('promover membros ao seu cargo ou superior');
    });

    it('LIDER pode promover MEMBRO para SUBLIDER (Permitido)', () => {
        const resultado = validarGovernançaMudancaRole('LIDER', 'MEMBRO', 'SUBLIDER', hierarquia);
        expect(resultado.sucesso).toBe(true);
    });

    it('LIDER não pode rebaixar GESTOR para MEMBRO (Barrado)', () => {
        const resultado = validarGovernançaMudancaRole('LIDER', 'GESTOR', 'MEMBRO', hierarquia);
        expect(resultado.sucesso).toBe(false);
        expect(resultado.detalhe).toContain('equivalentes ou superiores');
    });

    it('GESTOR pode revogar privilégios do LIDER para MEMBRO (Permitido)', () => {
        const resultado = validarGovernançaMudancaRole('GESTOR', 'LIDER', 'MEMBRO', hierarquia);
        expect(resultado.sucesso).toBe(true);
    });

    it('ADMIN tem poder absoluto sobre qualquer outra Role', () => {
        const resultado1 = validarGovernançaMudancaRole('ADMIN', 'COORDENADOR', 'MEMBRO', hierarquia);
        const resultado2 = validarGovernançaMudancaRole('ADMIN', 'MEMBRO', 'GESTOR', hierarquia);
        
        expect(resultado1.sucesso).toBe(true);
        expect(resultado2.sucesso).toBe(true);
    });
});
