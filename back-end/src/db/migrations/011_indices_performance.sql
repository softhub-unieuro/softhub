-- migrations/003_add_missing_indexes.sql
-- PERF-001: Adição de índices em foreign keys para otimização de busca e joins.

-- Índice para checklist_tarefa (Filtro por tarefa)
CREATE INDEX IF NOT EXISTS idx_checklist_tarefa_tarefa_id ON checklist_tarefa(tarefa_id);

-- Índice para comentarios_tarefa (Filtro por tarefa)
CREATE INDEX IF NOT EXISTS idx_comentarios_tarefa_tarefa_id ON comentarios_tarefa(tarefa_id);

-- Índice para notificacoes (Busca por usuário, ordenado por data)
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_data ON notificacoes(usuario_id, criado_em DESC);

-- Índice para tarefa_historico (Filtro por tarefa)
CREATE INDEX IF NOT EXISTS idx_tarefa_historico_tarefa_id ON tarefa_historico(tarefa_id);
