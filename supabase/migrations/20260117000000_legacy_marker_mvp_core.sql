-- Marker migration (no-op)
-- Motivo: banco local tinha versão curta "20260117" no schema_migrations, o que trava o CLI.
-- Esta migration existe só para alinhar o histórico com um timestamp completo (14 dígitos).
select 1;

