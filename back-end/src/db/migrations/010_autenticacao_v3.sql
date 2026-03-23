-- ============================================
-- SEC-010: EVOLUÇÃO DO SISTEMA DE AUTENTICAÇÃO
-- Suporte a Azure OID e Refresh Tokens (Auditoria v3)
-- ============================================

-- 1. Melhorar identificação de usuários (Audit Checklist MSAL)
-- No SQLite/D1, não é permitido adicionar coluna UNIQUE via ALTER TABLE.
-- Criamos a coluna simples e depois o índice único para garantir integridade.
ALTER TABLE usuarios ADD COLUMN azure_oid TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_azure_oid ON usuarios(azure_oid);

-- 2. Tabela de Gestão de Sessões (Checklist Part 3 - Refresh Token Rotation)
CREATE TABLE IF NOT EXISTS usuarios_sessoes (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL UNIQUE,
    ip_endereco TEXT,
    user_agent TEXT,
    device_info TEXT, -- JSON com browser, os, etc
    expira_em TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON usuarios_sessoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_refresh ON usuarios_sessoes(refresh_token_hash);

-- 3. Log de segurança para migração
INSERT INTO logs (id, acao, modulo, descricao, ip)
VALUES ('migra-' || hex(randomblob(4)), 'MIGRACAO_BANCO', 'sistema', 'Migração de banco para suporte a novas funcionalidades de autenticação (OID/Sessions)', 'localhost');
