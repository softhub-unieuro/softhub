-- ============================================
-- RESET + CREATE: Fábrica de Software
-- Ordem correta respeitando foreign keys
-- ============================================

-- Drop na ordem inversa das dependências
DROP TABLE IF EXISTS configuracoes_sistema;
DROP TABLE IF EXISTS tarefa_historico;
DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS notificacoes;
DROP TABLE IF EXISTS avisos;
DROP TABLE IF EXISTS checklist_tarefa;
DROP TABLE IF EXISTS comentarios_tarefa;
DROP TABLE IF EXISTS justificativas_ponto;
DROP TABLE IF EXISTS ponto_registros;
DROP TABLE IF EXISTS tarefas_responsaveis;
DROP TABLE IF EXISTS tarefas;
DROP TABLE IF EXISTS projetos_equipes;
DROP TABLE IF EXISTS projetos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS usuarios_organizacao;
DROP TABLE IF EXISTS grupos;
DROP TABLE IF EXISTS equipes;

-- ============================================
-- CRIAÇÃO DAS TABELAS
-- ============================================

-- 1. Pessoas e Perfis
CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT NOT NULL PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'MEMBRO',
    foto_perfil TEXT,
    foto_banner TEXT,
    bio TEXT,
    github_url TEXT,
    linkedin_url TEXT,
    website_url TEXT,
    versao_token INTEGER NOT NULL DEFAULT 1,
    arquivado INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- 2. Estrutura Organizacional
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
    arquivado INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS usuarios_organizacao (
    id TEXT NOT NULL PRIMARY KEY,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    equipe_id TEXT NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
    grupo_id TEXT REFERENCES grupos(id) ON DELETE SET NULL,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(usuario_id, equipe_id, grupo_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_org_usuario ON usuarios_organizacao(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_org_equipe ON usuarios_organizacao(equipe_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_org_grupo ON usuarios_organizacao(grupo_id);

-- 3. Gestão de Projetos e Tarefas
CREATE TABLE IF NOT EXISTS projetos (
    id TEXT NOT NULL PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    publico INTEGER NOT NULL DEFAULT 0,
    github_repo TEXT,
    documentacao_url TEXT,
    figma_url TEXT,
    setup_url TEXT,
    arquivado INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS tarefas (
    id TEXT NOT NULL PRIMARY KEY,
    projeto_id TEXT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    prioridade TEXT NOT NULL DEFAULT 'media',
    pontos INTEGER DEFAULT 1,
    modulo TEXT,
    equipe_id TEXT REFERENCES equipes(id) ON DELETE SET NULL,
    grupo_id TEXT REFERENCES grupos(id) ON DELETE SET NULL,
    feedback_lider TEXT,
    nota_aprendizado INTEGER DEFAULT 0,
    data_conclusao TEXT,
    arquivado INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tarefas_projeto ON tarefas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(projeto_id, status);
CREATE INDEX IF NOT EXISTS idx_tarefas_modulo ON tarefas(modulo);
CREATE INDEX IF NOT EXISTS idx_tarefas_equipe ON tarefas(equipe_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_grupo ON tarefas(grupo_id);

CREATE TABLE IF NOT EXISTS tarefas_responsaveis (
    tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    PRIMARY KEY (tarefa_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS projetos_equipes (
    projeto_id TEXT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    equipe_id TEXT NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
    acesso TEXT NOT NULL DEFAULT 'EDICAO', -- 'LEITURA', 'EDICAO', 'GESTAO'
    PRIMARY KEY (projeto_id, equipe_id)
);

-- 4. Ponto Eletrônico
CREATE TABLE IF NOT EXISTS ponto_registros (
    id TEXT NOT NULL PRIMARY KEY,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    registrado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    ip_origem TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ponto_usuario ON ponto_registros(usuario_id, registrado_em DESC);

CREATE TABLE IF NOT EXISTS justificativas_ponto (
    id TEXT NOT NULL PRIMARY KEY,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    tipo TEXT NOT NULL,
    motivo TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    motivo_rejeicao TEXT,
    avaliado_por TEXT REFERENCES usuarios(id),
    avaliado_em TEXT,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_justificativa_unica ON justificativas_ponto(usuario_id, data);

-- 5. Colaboração
CREATE TABLE IF NOT EXISTS comentarios_tarefa (
    id TEXT NOT NULL PRIMARY KEY,
    tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
    autor_id TEXT NOT NULL REFERENCES usuarios(id),
    conteudo TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    atualizado_em TEXT
);

CREATE TABLE IF NOT EXISTS checklist_tarefa (
    id TEXT NOT NULL PRIMARY KEY,
    tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    concluido INTEGER NOT NULL DEFAULT 0,
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- 6. Comunicação
CREATE TABLE IF NOT EXISTS avisos (
    id TEXT NOT NULL PRIMARY KEY,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    prioridade TEXT NOT NULL DEFAULT 'info',
    criado_por TEXT NOT NULL REFERENCES usuarios(id),
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
    entidade_id TEXT,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- 7. Logs e Histórico
CREATE TABLE IF NOT EXISTS logs (
    id TEXT NOT NULL PRIMARY KEY,
    usuario_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
    acao TEXT NOT NULL,
    modulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    ip TEXT,
    entidade_tipo TEXT,
    entidade_id TEXT,
    dados_anteriores TEXT,
    dados_novos TEXT,
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_logs_criado_em ON logs(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_logs_modulo ON logs(modulo);
CREATE INDEX IF NOT EXISTS idx_logs_acao ON logs(acao);
CREATE INDEX IF NOT EXISTS idx_logs_usuario_id ON logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_entidade ON logs(entidade_tipo, entidade_id);

CREATE TABLE IF NOT EXISTS tarefa_historico (
    id TEXT NOT NULL PRIMARY KEY,
    tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id),
    campo_alterado TEXT NOT NULL,
    valor_antigo TEXT,
    valor_novo TEXT,
    alterado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- 8. Configurações e Auxiliares
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
    id TEXT NOT NULL PRIMARY KEY,
    chave TEXT NOT NULL UNIQUE,
    valor TEXT NOT NULL
);

-- 9. Seed Inicial
INSERT OR IGNORE INTO projetos (id, nome, descricao) 
VALUES ('d62657e4-230b-4680-a292-06b291d2f62b', 'Projeto Principal', 'Fábrica de Software - Backlog Geral');

INSERT OR IGNORE INTO configuracoes_sistema (id, chave, valor) VALUES
('9f8e7d6c-5b4a-3f2e-1d0c-9b8a7d6c5b4a', 'permissoes_roles', '{
    "ADMIN": {"*": true},
    "COORDENADOR": {
        "dashboard:visualizar": true,
        "tarefas:*": true,
        "ponto:*": true,
        "membros:gerenciar": true,
        "membros:promover_ate_lider": true,
        "membros:visualizar_perfil_detalhado": true,
        "projetos:visualizar": true,
        "projetos:criar": true,
        "projetos:editar": true,
        "projetos:publicar_portfolio": true,
        "equipes:visualizar": true,
        "relatorios:visualizar": true,
        "relatorios:imprimir": true,
        "avisos:visualizar": true,
        "logs:visualizar": true,
        "configuracoes:visualizar": true,
        "ia:consultar": true
    },
    "GESTOR": {
        "dashboard:visualizar": true,
        "tarefas:*": true,
        "ponto:visualizar": true,
        "ponto:aprovar_justificativa": true,
        "ponto:exportar": true,
        "membros:gerenciar": true,
        "membros:visualizar_perfil_detalhado": true,
        "projetos:visualizar": true,
        "projetos:editar": true,
        "equipes:visualizar": true,
        "relatorios:visualizar": true,
        "relatorios:imprimir": true,
        "avisos:visualizar": true,
        "logs:visualizar": true,
        "ia:consultar": true
    },
    "LIDER": {
        "dashboard:visualizar": true,
        "tarefas:visualizar_kanban": true,
        "tarefas:visualizar_backlog": true,
        "tarefas:visualizar_detalhes": true,
        "tarefas:visualizar_historico": true,
        "tarefas:criar": true,
        "tarefas:editar": true,
        "tarefas:mover": true,
        "tarefas:checklist_marcar": true,
        "tarefas:checklist_gerenciar": true,
        "ponto:visualizar": true,
        "ponto:aprovar_justificativa": true,
        "equipes:visualizar": true,
        "equipes:editar_equipe": true,
        "equipes:alocar_membro": true,
        "avisos:visualizar": true,
        "avisos:criar": true,
        "projetos:visualizar": true,
        "projetos:gerenciar_links": true,
        "ia:consultar": true,
        "sistema:notificacoes": true
    },
    "SUBLIDER": {
        "dashboard:visualizar": true,
        "tarefas:visualizar_kanban": true,
        "tarefas:visualizar_backlog": true,
        "tarefas:visualizar_detalhes": true,
        "tarefas:mover": true,
        "tarefas:checklist_marcar": true,
        "tarefas:checklist_gerenciar": true,
        "ponto:visualizar": true,
        "ponto:aprovar_justificativa": true,
        "equipes:visualizar": true,
        "avisos:visualizar": true,
        "avisos:criar": true,
        "ia:consultar": true
    },
    "MEMBRO": {
        "dashboard:visualizar": true,
        "tarefas:visualizar_kanban": true,
        "tarefas:visualizar_backlog": true,
        "tarefas:visualizar_detalhes": true,
        "projetos:visualizar_detalhes": true,
        "tarefas:comentar": true,
        "tarefas:checklist_marcar": true,
        "ponto:registrar": true,
        "ponto:visualizar": true,
        "ponto:justificar": true,
        "avisos:visualizar": true,
        "ia:consultar": true
    },
    "TODOS": {
        "avisos:visualizar": true,
        "ia:consultar": true,
        "tarefas:checklist_marcar": true
    }
}'),
('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'dominios_autorizados', '["unieuro.com.br", "unieuro.edu.br"]'),
('c3d4e5f6-a7b8-4c9d-d0e1-2f3a4b5c6d7e', 'auto_cadastro', 'false'),
('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a', 'hierarquia_roles', '["ADMIN", "COORDENADOR", "GESTOR", "LIDER", "SUBLIDER", "MEMBRO"]'),
('e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b', 'hora_inicio_ponto', '"13:00"'),
('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c', 'hora_fim_ponto', '"17:00"'),
('a7b8c9d0-e1f2-4a3b-b4c5-d6e7f8a9b0c1', 'modo_manutencao', 'false');