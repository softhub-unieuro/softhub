-- Adiciona controle de dias presenciais para os grupos

ALTER TABLE grupos ADD COLUMN escala_tipo TEXT NOT NULL DEFAULT 'fixa';
ALTER TABLE grupos ADD COLUMN escala_dias TEXT;
