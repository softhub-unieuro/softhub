export const COLUNAS_KANBAN = [
    'backlog',
    'todo',
    'in_progress',
    'em_revisao',
    'concluida',
] as const;

export type ColunaKanban = typeof COLUNAS_KANBAN[number];

export const CORES_PRIORIDADE = {
    urgente: 'vermelho',
    alta: 'amarelo',
    media: 'azul',
    baixa: 'verde',
} as const;

export const LABELS_PRIORIDADE = {
    urgente: 'Urgente',
    alta: 'Alta',
    media: 'Média',
    baixa: 'Baixa',
} as const;

export const LABELS_STATUS = {
    backlog: 'Backlog',
    todo: 'À Fazer',
    in_progress: 'Em Andamento',
    em_revisao: 'Em Revisão',
    concluida: 'Concluída',
} as const;

export const GRAFICO_COR_PRIMARIA = '#2563EB';

export const GRAFICO_COR_SUCESSO = '#10B981';
export const GRAFICO_COR_ALERTA = '#F59E0B';
export const GRAFICO_COR_PERIGO = '#EF4444';

// Hierarquia Administrativa: Labels amigáveis em PT-BR
export const LABELS_ROLES = {
    ADMIN: 'Admin',
    COORDENADOR: 'Coordenador',
    GESTOR: 'Gestor',
    LIDER: 'Líder',
    'LIDER-TECNICO': 'Líder Técnico',
    SUBLIDER: 'Sublíder',
    'SUB-LIDER': 'Sub-líder',
    MEMBRO: 'Membro',
} as const;

// Variantes de cores para as roles (seguindo padrão de autoridade)
export const VARIANTE_COR_ROLES = {
    ADMIN: 'rose',         // Vermelho/Rosa (Poder Total)
    COORDENADOR: 'blue',   // Azul (Estratégico)
    GESTOR: 'blue',        // Azul (Gestão Macro)
    LIDER: 'indigo',       // Índigo (Liderança de Grupo)
    'LIDER-TECNICO': 'roxo', // Roxo (Especialista Técnico)
    SUBLIDER: 'amber',     // Amarelo (Apoio à Liderança)
    'SUB-LIDER': 'amber',  // Amarelo (Apoio à Liderança)
    MEMBRO: 'emerald',     // Verde (Operação)
} as const;

// Configurações do GitHub (Utilizado no Portfólio Público)
export const GITHUB_USUARIO = 'madebycotrim'; 

// ID do Projeto Principal (Bootstrap)
export const PROJETO_PADRAO_ID = 'd62657e4-230b-4680-a292-06b291d2f62b';

