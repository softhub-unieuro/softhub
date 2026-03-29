-- ============================================
-- OTIMIZAÇÃO DE PERFORMANCE: ÍNDICES ADICIONAIS
-- ============================================

-- Otimização para Polling de Notificações (Chamado a cada 30s por todos os membros)
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_lida ON notificacoes(usuario_id, lida);

-- Otimização para Carregamento de Detalhes de Tarefa (Comentários e Histórico)
CREATE INDEX IF NOT EXISTS idx_comentarios_tarefa_id ON comentarios_tarefa(tarefa_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_tarefa_historico_tarefa_id ON tarefa_historico(tarefa_id, alterado_em DESC);
CREATE INDEX IF NOT EXISTS idx_checklist_tarefa_id ON checklist_tarefa(tarefa_id, ordem);

-- Otimização para Consultas de Ponto (Relatórios e Filtros)
CREATE INDEX IF NOT EXISTS idx_ponto_registros_data ON ponto_registros(registrado_em DESC);

-- Otimização para Listagem de Usuários e Buscas
CREATE INDEX IF NOT EXISTS idx_usuarios_nome ON usuarios(nome);

-- Otimização para Jusitificativas de Ponto (Admin e Filtros)
CREATE INDEX IF NOT EXISTS idx_justificativas_status ON justificativas_ponto(status, data DESC);
