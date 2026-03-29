export interface UsuarioDB {
    id: string;
    nome: string;
    email: string;
    role: string;
    foto_perfil: string | null;
    versao_token: number;
    arquivado: number;
    criado_em: string;
}

export interface ProjetoDB {
    id: string;
    nome: string;
    descricao: string | null;
    publico: number;
    github_repo: string | null;
    documentacao_url: string | null;
    figma_url: string | null;
    setup_url: string | null;
    arquivado: number;
    criado_em: string;
}

export interface EquipeDB {
    id: string;
    nome: string;
    descricao: string | null;
    lider_id: string | null;
    criada_em: string;
}

export interface GrupoDB {
    id: string;
    equipe_id: string;
    nome: string;
    descricao: string | null;
    escala_tipo: string;
    escala_dias: string;
}

export interface AlocacaoDB {
    id: string;
    usuario_id: string;
    equipe_id: string;
    alocado_em: string;
}

export interface TarefaDB {
    id: string;
    projeto_id: string;
    sprint_id: string | null;
    titulo: string;
    descricao: string | null;
    status: string;
    prioridade: string;
    pontos: number | null;
    arquivada: number;
    data_conclusao: string | null;
    criador_id: string;
    atualizado_em: string;
    criado_em: string;
}

export interface ConfigSistemaDB {
    id: string;
    chave: string;
    valor: string;
    descricao: string | null;
}

export interface PontoRegistroDB {
    id: string;
    usuario_id: string;
    tipo: 'entrada' | 'saida';
    ip_origem: string | null;
    marcado_por_id: string | null;
    criado_em: string;
}

export interface JustificativaDB {
    id: string;
    usuario_id: string;
    tipo: string;
    descricao: string | null;
    status: 'pendente' | 'aprovada' | 'rejeitada';
    avaliada_por_id: string | null;
    data_justificada: string | null;
    criado_em: string;
}
