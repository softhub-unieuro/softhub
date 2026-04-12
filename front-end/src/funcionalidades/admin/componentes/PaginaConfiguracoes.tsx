import { useState, useMemo, memo } from 'react';
import { usarConfiguracoes } from '@/funcionalidades/admin/hooks/usarConfiguracoes';
import { Carregando } from '@/compartilhado/componentes/Carregando';
import { usarPermissaoAcesso } from '@/compartilhado/hooks/usarPermissao';
import { usarAutenticacao } from '@/contexto/ContextoAutenticacao';
import { Settings2 } from 'lucide-react';
import { CabecalhoFuncionalidade } from '@/compartilhado/componentes/CabecalhoFuncionalidade';
import { Alerta } from '@/compartilhado/componentes/Alerta';

import { SecaoSistema } from '@/funcionalidades/admin/componentes/configuracoes/SecaoSistema';
import { SecaoGovernanca } from '@/funcionalidades/admin/componentes/configuracoes/SecaoGovernanca';
import { SecaoRedePonto } from '@/funcionalidades/admin/componentes/configuracoes/SecaoRedePonto';
import { SecaoJornada } from '@/funcionalidades/admin/componentes/configuracoes/SecaoJornada';
import { SecaoCargos } from '@/funcionalidades/admin/componentes/configuracoes/SecaoCargos';
import { SecaoDados } from '@/funcionalidades/admin/componentes/configuracoes/SecaoDados';
import { SecaoMatrizAcesso } from '@/funcionalidades/admin/componentes/configuracoes/SecaoMatrizAcesso';

/**
 * Página de Configurações & Governança.
 * Arquitetada em módulos para otimização de renderização e manutenção.
 */
export const PaginaConfiguracoes = memo(() => {
    const { configuracoes, carregando, erro, atualizarConfiguracao, salvarConfiguracoesLote, renomearCargo } = usarConfiguracoes();
    const { usuario } = usarAutenticacao();
    const isAdmin = usuario?.role === 'ADMIN';
    const podeEditar = usarPermissaoAcesso('configuracoes:editar') || isAdmin;
    const temAcessoCritico = usarPermissaoAcesso('configuracoes:matriz_governanca') || isAdmin;

    const [erroLocal, setErroLocal] = useState<string | null>(null);

    /** Lista de roles/cargos — ADMIN e TODOS sempre presentes */
    const roles = useMemo(() => {
        const baseRoles = configuracoes?.permissoes_roles ? Object.keys(configuracoes.permissoes_roles) : [];
        return Array.from(new Set(['ADMIN', 'TODOS', ...baseRoles]));
    }, [configuracoes]);

    /** Roles exibidos na matriz (ADMIN oculto — acesso total por padrão) */
    const rolesMatriz = useMemo(() => roles.filter(r => r !== 'ADMIN'), [roles]);

    const mostrarErroTemporario = (mensagem: string) => {
        setErroLocal(mensagem);
        setTimeout(() => setErroLocal(null), 5000);
    };

    if (carregando && !configuracoes) {
        return (
            <div className="w-full space-y-8 animate-pulse p-6">
                <div className="h-16 w-1/3 bg-muted/20 rounded-2xl" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-3 space-y-6">
                        <div className="h-40 bg-muted/20 rounded-2xl" />
                        <div className="h-40 bg-muted/20 rounded-2xl" />
                    </div>
                    <div className="lg:col-span-9 h-[600px] bg-muted/20 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (erro && !configuracoes) {
        return <div className="p-10 flex justify-center"><Alerta tipo="erro" mensagem={erro} /></div>;
    }

    return (
        <div className="w-full animar-entrada pb-10 relative max-w-[1600px] mx-auto">
            <CabecalhoFuncionalidade
                titulo="Configurações"
                subtitulo="Governança, Permissões e Hierarquia do SoftHub"
                icone={Settings2}
            />

            {/* Banner de Erro Local */}
            {erroLocal && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Alerta tipo="erro" mensagem={erroLocal} />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6 items-start">
                <div className="lg:col-span-3 space-y-6">
                    {(isAdmin || temAcessoCritico) && (
                        <>
                            <SecaoSistema 
                                configuracoes={configuracoes ?? null} 
                                atualizarConfiguracao={atualizarConfiguracao} 
                            />
                            
                            <SecaoGovernanca 
                                configuracoes={configuracoes ?? null} 
                                atualizarConfiguracao={atualizarConfiguracao} 
                                podeEditar={podeEditar} 
                            />
                            
                            <SecaoRedePonto 
                                configuracoes={configuracoes ?? null} 
                                atualizarConfiguracao={atualizarConfiguracao} 
                                podeEditar={podeEditar} 
                            />
                        </>
                    )}

                    <SecaoJornada 
                        configuracoes={configuracoes ?? null} 
                        atualizarConfiguracao={atualizarConfiguracao} 
                        podeEditar={podeEditar} 
                    />

                    <SecaoCargos 
                        configuracoes={configuracoes ?? null} 
                        atualizarConfiguracao={atualizarConfiguracao} 
                        salvarConfiguracoesLote={salvarConfiguracoesLote}
                        renomearCargo={renomearCargo}
                        podeEditar={podeEditar}
                        isAdmin={isAdmin}
                        roles={roles}
                    />

                    <SecaoDados />
                </div>

                {/* Coluna Principal: Matriz de Permissões e Acesso */}
                <div className="lg:col-span-9 space-y-6">
                    <SecaoMatrizAcesso 
                        configuracoes={configuracoes ?? null} 
                        atualizarConfiguracao={atualizarConfiguracao} 
                        podeEditar={podeEditar} 
                        isAdmin={isAdmin}
                        temAcessoCritico={temAcessoCritico}
                        rolesMatriz={rolesMatriz}
                        onErroTemporario={mostrarErroTemporario}
                    />
                </div>
            </div>
        </div>
    );
});
 
export default PaginaConfiguracoes;
