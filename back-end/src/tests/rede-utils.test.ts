import { describe, it, expect } from 'vitest';
import { estaEmFaixaCIDR, processarListaIps, normalizarIp } from '../utilitarios/rede-utils';

describe('Utilitários de Rede', () => {
    
    describe('normalizarIp', () => {
        it('deve remover prefixo IPv6-mapped IPv4', () => {
            expect(normalizarIp('::ffff:192.168.1.1')).toBe('192.168.1.1');
        });
        it('deve remover espaços', () => {
            expect(normalizarIp(' 192.168.1.1 ')).toBe('192.168.1.1');
        });
        it('deve manter IPv6 puro', () => {
            expect(normalizarIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
        });
    });

    describe('processarListaIps', () => {
        it('deve processar string separada por vírgula', () => {
            const entrada = '1.1.1.1, 2.2.2.2,3.3.3.3';
            expect(processarListaIps(entrada)).toEqual(['1.1.1.1', '2.2.2.2', '3.3.3.3']);
        });
        it('deve processar string separada por espaços e quebras de linha', () => {
            const entrada = '1.1.1.1\n2.2.2.2  3.3.3.3';
            expect(processarListaIps(entrada)).toEqual(['1.1.1.1', '2.2.2.2', '3.3.3.3']);
        });
        it('deve manter array se recebido', () => {
            const entrada = ['1.1.1.1', '2.2.2.2'];
            expect(processarListaIps(entrada)).toEqual(['1.1.1.1', '2.2.2.2']);
        });
    });

    describe('estaEmFaixaCIDR', () => {
        it('deve validar correspondência exata', () => {
            expect(estaEmFaixaCIDR('192.168.1.1', '192.168.1.1')).toBe(true);
            expect(estaEmFaixaCIDR('192.168.1.1', '192.168.1.2')).toBe(false);
        });

        it('deve validar CIDR IPv4 /24', () => {
            const regra = '192.168.1.0/24';
            expect(estaEmFaixaCIDR('192.168.1.1', regra)).toBe(true);
            expect(estaEmFaixaCIDR('192.168.1.255', regra)).toBe(true);
            expect(estaEmFaixaCIDR('192.168.2.1', regra)).toBe(false);
        });

        it('deve validar CIDR IPv4 /8', () => {
            const regra = '10.0.0.0/8';
            expect(estaEmFaixaCIDR('10.0.0.1', regra)).toBe(true);
            expect(estaEmFaixaCIDR('10.255.255.254', regra)).toBe(true);
            expect(estaEmFaixaCIDR('11.0.0.1', regra)).toBe(false);
        });

        it('deve validar CIDR IPv4 /32', () => {
            const regra = '1.1.1.1/32';
            expect(estaEmFaixaCIDR('1.1.1.1', regra)).toBe(true);
            expect(estaEmFaixaCIDR('1.1.1.2', regra)).toBe(false);
        });

        it('deve validar prefixos simples (fallback)', () => {
            expect(estaEmFaixaCIDR('192.168.1.1', '192.168.')).toBe(true);
            expect(estaEmFaixaCIDR('2001:db8:', '2001:db8:')).toBe(true);
        });
    });
});
