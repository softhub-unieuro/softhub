-- Adiciona coluna de aviso para registros de ponto fora da escala
ALTER TABLE ponto_registros ADD COLUMN aviso TEXT DEFAULT NULL;
