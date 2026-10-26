-- Seguridad: las tablas de `public` quedaban expuestas en la API REST de Supabase con la llave pública
-- (`anon`), con permiso de leer, crear, modificar y borrar. COSAVE es API-first: el web nunca consulta
-- tablas directo; todo pasa por apps/api, que se conecta como `postgres` (dueño de las tablas, con
-- BYPASSRLS), así que activar RLS sin políticas deja a `anon` y `authenticated` sin acceso y no
-- afecta al api.
--
-- Toda tabla nueva debe activar RLS en su propia migración (ver docs/DATABASE.md).

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
