-- Tornar quote_number opcional com valor default vazio (trigger vai substituir)
ALTER TABLE public.quotes ALTER COLUMN quote_number SET DEFAULT '';