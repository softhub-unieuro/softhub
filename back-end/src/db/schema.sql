-- ============================================================================
-- SCHEMA DEFINITIVO — SOFTHUB (FÁBRICA DE SOFTWARE)
-- Data: 2026-03-23
-- Compatibilidade: SQLite / Cloudflare D1
-- ============================================================================

-- REGRAS:
-- 1. IDs são sempre UUID (TEXT)
-- 2. Datas são ISO8601 (TEXT)
-- 3. Booleanos são 0 ou 1 (INTEGER)
-- 4. Sem Soft Delete real (Usamos a coluna 'arquivado' para UI)

-- ============================================================================
-- 1. NÚCLEO DE IDENTIDADE (MSAL AZURE AD)
-- ============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT NOT NULL PRIMARY KEY,
    azure_oid TEXT UNIQUE,               -- ID único da Microsoft (obrigatório para login MSAL)
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,          -- Deve ser @unieuro.edu.br ou @unieuro.com.br
    role TEXT NOT NULL DEFAULT 'MEMBRO', -- ADMIN, COORDENADOR, GESTOR, LIDER, SUBLIDER, MEMBRO
    foto_perfil TEXT,
    foto_banner TEXT,
    bio TEXT,
    github_url TEXT,
    linkedin_url TEXT,
    website_url TEXT,
    versao_token INTEGER NOT NULL DEFAULT 1, -- Incrementar para invalidar todos os JWTs do usuário
    arquivado INTEGER NOT NULL DEFAULT 0,    -- 1 = desativado
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_azure_oid ON usuarios(azure_oid);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_nome ON usuarios(nome);

-- ============================================================================
-- 2. GESTÃO DE SESSÕES E DISPOSITIVOS (JWT + REFRESH TOKEN ROTATION)
-- ============================================================================

CREATE TABLE IF NOT EXISTS usuarios_sessoes (
    id TEXT NOT NULL PRIMARY KEY,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,      -- Hash SHA-256 do Refresh Token
    ip_endereco TEXT,
    user_agent TEXT,
    device_info TEXT,                     -- Ex: "PC (Chrome)", "iPhone (QR Login)"
    expira_em TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON usuarios_sessoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_refresh ON usuarios_sessoes(refresh_token_hash);

-- ============================================================================
-- 3. ESTRUTURA ORGANIZACIONAL (EQUIPES E GRUPOS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS equipes (
    id TEXT NOT NULL PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    lider_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
    sub_lider_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
    arquivado INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS grupos (
    id TEXT NOT NULL PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    equipe_id TEXT REFERENCES equipes(id) ON DELETE CASCADE,
    escala_tipo TEXT NOT NULL DEFAULT 'fixa',
    escala_dias TEXT,
    arquivado INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Tabela de junção Membro <-> Equipe/Grupo
CREATE TABLE IF NOT EXISTS usuarios_organizacao (
    id TEXT NOT NULL PRIMARY KEY,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    equipe_id TEXT NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
    grupo_id TEXT REFERENCES grupos(id) ON DELETE SET NULL,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(usuario_id, equipe_id, grupo_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_org_equipe ON usuarios_organizacao(equipe_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_org_grupo ON usuarios_organizacao(grupo_id);

-- ============================================================================
-- 4. GESTÃO DE PROJETOS E PORTFÓLIO
-- ============================================================================

CREATE TABLE IF NOT EXISTS projetos (
    id TEXT NOT NULL PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    publico INTEGER NOT NULL DEFAULT 0, -- Se aparece no showcase externo (sem login)
    github_repo TEXT,
    documentacao_url TEXT,
    figma_url TEXT,
    setup_url TEXT,
    arquivado INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Vinculação de Equipes a Projetos (Permissões de acesso ao projeto)
CREATE TABLE IF NOT EXISTS projetos_equipes (
    projeto_id TEXT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    equipe_id TEXT NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
    acesso TEXT NOT NULL DEFAULT 'EDICAO', -- 'LEITURA', 'EDICAO', 'GESTAO'
    PRIMARY KEY (projeto_id, equipe_id)
);

CREATE INDEX IF NOT EXISTS idx_projetos_equipes_equipe ON projetos_equipes(equipe_id);

-- ============================================================================
-- 5. KANBAN E TAREFAS (FLUXO CONTÍNUO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tarefas (
    id TEXT NOT NULL PRIMARY KEY,
    projeto_id TEXT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    status TEXT NOT NULL DEFAULT 'backlog', -- backlog, todo, in_progress, em_revisao, concluida
    prioridade TEXT NOT NULL DEFAULT 'media', -- baixa, media, alta, urgente
    pontos INTEGER DEFAULT 1,
    modulo TEXT,                             -- Organização por módulo dentro do projeto
    equipe_id TEXT REFERENCES equipes(id) ON DELETE SET NULL,
    grupo_id TEXT REFERENCES grupos(id) ON DELETE SET NULL,
    feedback_lider TEXT,                     -- Avaliação qualitativa do líder
    nota_aprendizado INTEGER DEFAULT 0,      -- 1 a 5 (para retrospectivas)
    data_conclusao TEXT,
    arquivado INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tarefas_projeto_status ON tarefas(projeto_id, status);

-- Responsaveis (Múltiplos usuários por tarefa)
CREATE TABLE IF NOT EXISTS tarefas_responsaveis (
    tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    PRIMARY KEY (tarefa_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS comentarios_tarefa (
    id TEXT NOT NULL PRIMARY KEY,
    tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
    autor_id TEXT NOT NULL REFERENCES usuarios(id),
    conteudo TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    atualizado_em TEXT
);

CREATE INDEX IF NOT EXISTS idx_comentarios_tarefa_id ON comentarios_tarefa(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_tarefa_data ON comentarios_tarefa(tarefa_id, criado_em DESC);

CREATE TABLE IF NOT EXISTS checklist_tarefa (
    id TEXT NOT NULL PRIMARY KEY,
    tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    concluido INTEGER NOT NULL DEFAULT 0,
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_checklist_tarefa_id ON checklist_tarefa(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_checklist_tarefa_ordem ON checklist_tarefa(tarefa_id, ordem);

-- ============================================================================
-- 6. PONTO ELETRÔNICO (SÓ NA REDE UNIEURO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ponto_registros (
    id TEXT NOT NULL PRIMARY KEY,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'ENTRADA', 'SAIDA'
    registrado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    ip_origem TEXT NOT NULL, -- Validado no backend contra a rede da UNIEURO
    aviso TEXT               -- Opcional: Mensagem de aviso (ex: FORA_DA_ESCALA)
);

CREATE INDEX IF NOT EXISTS idx_ponto_registros_data ON ponto_registros(registrado_em DESC);

CREATE TABLE IF NOT EXISTS justificativas_ponto (
    id TEXT NOT NULL PRIMARY KEY,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    data TEXT NOT NULL,       -- Data da falta
    tipo TEXT NOT NULL,       -- 'EQUIPAMENTO', 'SAUDE', 'OUTROS'
    motivo TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, aprovado, rejeitado
    motivo_rejeicao TEXT,
    avaliado_por TEXT REFERENCES usuarios(id),
    avaliado_em TEXT,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_justificativa_unica ON justificativas_ponto(usuario_id, data);
CREATE INDEX IF NOT EXISTS idx_justificativas_status ON justificativas_ponto(status, data DESC);
CREATE INDEX IF NOT EXISTS idx_ponto_registros_usuario ON ponto_registros(usuario_id);

-- ============================================================================
-- 7. COMUNICAÇÃO E NOTIFICAÇÕES
-- ============================================================================

CREATE TABLE IF NOT EXISTS avisos (
    id TEXT NOT NULL PRIMARY KEY,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    prioridade TEXT NOT NULL DEFAULT 'info', -- info, aviso, urgente
    criado_por TEXT NOT NULL REFERENCES usuarios(id),
    projeto_id TEXT REFERENCES projetos(id) ON DELETE CASCADE, -- Vínculo opcional com projeto específico
    expira_em TEXT,
    arquivado INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS notificacoes (
    id TEXT NOT NULL PRIMARY KEY,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    lida INTEGER NOT NULL DEFAULT 0,
    link_acao TEXT,
    entidade_id TEXT, -- ID do projeto/tarefa/aviso relacionado
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_lida ON notificacoes(usuario_id, lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_data ON notificacoes(usuario_id, criado_em DESC);

-- ============================================================================
-- 8. AUDITORIA E LOGS GLOBAIS
-- ============================================================================

CREATE TABLE IF NOT EXISTS logs (
    id TEXT NOT NULL PRIMARY KEY,
    usuario_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
    acao TEXT NOT NULL,      -- Ex: LOGIN_MSAL, CRIOU_TAREFA, JUSTIFICOU_PONTO
    modulo TEXT NOT NULL,    -- Ex: auth, tarefas, ponto
    descricao TEXT NOT NULL,
    ip TEXT,
    entidade_tipo TEXT,      -- Ex: tarefas
    entidade_id TEXT,
    dados_anteriores TEXT,   -- JSON stringified
    dados_novos TEXT,        -- JSON stringified
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Histórico específico de campos de tarefa (Timeline)
CREATE TABLE IF NOT EXISTS tarefa_historico (
    id TEXT NOT NULL PRIMARY KEY,
    tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id),
    campo_alterado TEXT NOT NULL, -- status, prioridade, checklist...
    valor_antigo TEXT,
    valor_novo TEXT,
    alterado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tarefa_historico_tarefa_id ON tarefa_historico(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_tarefa_historico_data ON tarefa_historico(tarefa_id, alterado_em DESC);

-- ============================================================================
-- 9. CONTROLE DE ACESSO AVANÇADO (RATE LIMIT E QR)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
    chave TEXT PRIMARY KEY,
    hits INTEGER NOT NULL DEFAULT 0,
    janela_inicio INTEGER NOT NULL, -- Unix Timestamp (ms)
    expira_em INTEGER NOT NULL      -- Unix Timestamp (ms) para limpeza
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expira ON rate_limits(expira_em);

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

CREATE TABLE IF NOT EXISTS tokens_revogados (
    jti TEXT PRIMARY KEY,
    motivo TEXT,
    revogado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ============================================================================
-- 10. SISTEMA DE CONVITES (Auto-alocação)
-- ============================================================================

CREATE TABLE IF NOT EXISTS convites (
    id TEXT NOT NULL PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    criado_por_id TEXT NOT NULL REFERENCES usuarios(id),
    limite_usos INTEGER NOT NULL DEFAULT 1,
    usos_atuais INTEGER NOT NULL DEFAULT 0,
    expira_em TEXT, -- ISO 8601
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_convites_token ON convites(token);

-- ============================================================================
-- 11. CONFIGURAÇÕES DINÂMICAS DO SISTEMA
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracoes_sistema (
    id TEXT NOT NULL PRIMARY KEY,
    chave TEXT NOT NULL UNIQUE,
    valor TEXT NOT NULL -- Geralmente JSON stringified
);

-- ============================================================================
-- 11. SEED DE CONFIGURAÇÃO BASE (Obrigatório para o sistema bootar)
-- ============================================================================

-- Projeto de Backlog Geral (Exigido pelo sistema)
INSERT OR IGNORE INTO projetos (id, nome, descricao) 
VALUES ('d62657e4-230b-4680-a292-06b291d2f62b', 'Projeto Principal', 'Fábrica de Software - Backlog Geral');

-- Matriz de Permissões e Roles Padrão
INSERT OR IGNORE INTO configuracoes_sistema (id, chave, valor) VALUES
('9f8e7d6c-5b4a-3f2e-1d0c-9b8a7d6c5b4a', 'permissoes_roles', '{
    "ADMIN": {"*": true},
    "COORDENADOR": {
        "dashboard:visualizar": true,
        "tarefas:*": true,
        "ponto:*": true,
        "membros:gerenciar": true,
        "membros:visualizar_perfil_detalhado": true,
        "projetos:*": true,
        "equipes:visualizar": true,
        "relatorios:visualizar": true,
        "avisos:visualizar": true,
        "logs:visualizar": true
    },
    "GESTOR": {
        "dashboard:visualizar": true,
        "tarefas:*": true,
        "ponto:visualizar": true,
        "ponto:aprovar_justificativa": true,
        "membros:gerenciar": true,
        "projetos:visualizar": true,
        "equipes:visualizar": true,
        "relatorios:visualizar": true,
        "avisos:visualizar": true
    },
    "LIDER": {
        "dashboard:visualizar": true,
        "tarefas:*": true,
        "ponto:visualizar": true,
        "ponto:aprovar_justificativa": true,
        "equipes:visualizar": true,
        "avisos:criar": true
    },
    "MEMBRO": {
        "dashboard:visualizar": true,
        "tarefas:visualizar": true,
        "tarefas:mover": true,
        "tarefas:comentar": true,
        "ponto:registrar": true,
        "ponto:visualizar": true,
        "ponto:justificar": true,
        "avisos:visualizar": true
    }
}'),
('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a', 'hierarquia_roles', '["ADMIN", "COORDENADOR", "GESTOR", "LIDER", "SUBLIDER", "MEMBRO"]'),
('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'dominios_autorizados', '["unieuro.com.br", "unieuro.edu.br"]'),
('e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b', 'hora_inicio_ponto', '"13:00"'),
('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c', 'hora_fim_ponto', '"17:00"');