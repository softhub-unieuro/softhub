-- MIGRATION: 002_add_projeto_id_avisos
-- Objetivo: Suportar avisos vinculados a projetos específicos e corrigir inconsistência de nomes.

ALTER TABLE avisos ADD COLUMN projeto_id TEXT REFERENCES projetos(id) ON DELETE CASCADE;
