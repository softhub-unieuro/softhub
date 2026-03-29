export const Roles = {
  MEMBRO: 'MEMBRO',
  SUBLIDER: 'SUBLIDER',
  LIDER: 'LIDER',
  GESTOR: 'GESTOR',
  COORDENADOR: 'COORDENADOR',
  ADMIN: 'ADMIN', // Corrigido de OWNER com base no schema.sql vigente
} as const;

export type Role = typeof Roles[keyof typeof Roles];

export const StatusTarefa = {
  BACKLOG: 'backlog',
  TODO: 'todo',
  EM_PROGRESSO: 'in_progress',
  EM_REVISAO: 'em_revisao',
  CONCLUIDA: 'concluida',
} as const;

export type StatusTarefa = typeof StatusTarefa[keyof typeof StatusTarefa];
