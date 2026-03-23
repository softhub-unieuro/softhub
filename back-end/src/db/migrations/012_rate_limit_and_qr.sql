-- ============================================
-- SEC-012: MIGRAÇÃO KV -> D1 (Quota Bypass)
-- Move tokens QR e Rate Limit para D1 devido ao limite de 1k/dia do KV (Free Tier).
-- ============================================

-- 1. Tabela para Rate Limit (Substituindo KV global)
CREATE TABLE IF NOT EXISTS rate_limits (
    chave TEXT PRIMARY KEY,
    hits INTEGER NOT NULL DEFAULT 0,
    janela_inicio INTEGER NOT NULL, -- Unix Timestamp (ms)
    expira_em INTEGER NOT NULL      -- Unix Timestamp (ms) para limpeza
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expira ON rate_limits(expira_em);

-- 2. Tabela para Tokens QR (Substituindo KV)
CREATE TABLE IF NOT EXISTS tokens_qr (
    id TEXT PRIMARY KEY, -- Hash do Token
    status TEXT NOT NULL DEFAULT 'pending', -- pending, scanned, confirmed, used, expired
    user_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
    jwt_token TEXT,
    refresh_token TEXT,
    ip_origem TEXT,
    user_agent TEXT,
    payload_json TEXT,  -- Campo genérico para dados extras
    expira_em TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tokens_qr_status ON tokens_qr(status);
CREATE INDEX IF NOT EXISTS idx_tokens_qr_expira ON tokens_qr(expira_em);

-- 3. Log de segurança para migração
INSERT INTO logs (id, acao, modulo, descricao, ip)
VALUES ('migra-kv2d1-' || hex(randomblob(4)), 'MIGRACAO_BANCO', 'sistema', 'Migração de QR e Rate Limit para D1 (Quota Optimization)', 'localhost');
