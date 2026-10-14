# Guía para contribuir

## Requisitos
Node 22+, pnpm 11 (`corepack enable`), y Postgres local o un proyecto Supabase.

## Arrancar
```bash
pnpm install
cp .env.example apps/api/.env      # y las variables NEXT_PUBLIC_* a apps/web/.env.local (ver el archivo)
pnpm dev                            # web :5300, api :3300
```

## Variables de entorno
Cada app lee su propio archivo (ambos ignorados por git, nunca se commitean):

| Variable | Archivo | Para qué |
|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | `apps/api/.env` | Postgres de Supabase (pooler 6543 / directa 5432) |
| `SUPABASE_URL`, `SUPABASE_JWT_SECRET` | `apps/api/.env` | El api verifica el JWT de Supabase Auth |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `apps/web/.env.local` | Registro e inicio de sesión desde el navegador |
| `NEXT_PUBLIC_API_URL` | `apps/web/.env.local` | URL del api (`http://localhost:3300`) |

Para crear cuentas reales, en Supabase → Authentication → URL Configuration agrega `http://localhost:5300` como Site URL y `http://localhost:5300/**` en Redirect URLs. Con la confirmación de correo activa, el usuario debe abrir el enlace que recibe antes de entrar.

## Comandos
`pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm --filter @cosave/api db:validate` · `db:migrate` (dev) · `db:deploy` · `db:make-admin <correo>`

## Flujo
1. `git checkout -b feature/mi-cambio` (nunca directo a `main`).
2. Cambios pequeños; `pnpm typecheck && pnpm lint && pnpm build` antes de subir.
3. Commit descriptivo en español y Pull Request para revisión.

Reglas completas en `AGENTS.md`.

## Primer admin
1. Regístrate en `/registro` e inicia sesión una vez (crea tu Profile).
2. `pnpm --filter @cosave/api db:make-admin tu@correo.com`.

## Fotos de propiedades (Supabase Storage)
1. En Supabase → Storage crea el bucket **`property-images`** y márcalo como **público** (solo lectura pública; solo el api escribe).
2. Pon `SUPABASE_SERVICE_ROLE_KEY` en `apps/api/.env` (Project Settings → API → `service_role`). **Nunca** en `apps/web`.
3. `PUBLISH_REQUIRES_APPROVAL=true` (por defecto) deja las publicaciones nuevas en `pending` hasta que un admin las apruebe en `/admin`.
4. Aplica las migraciones (`db:deploy`) y vuelve a correr `db:seed` para que las propiedades de ejemplo tengan foto, fecha y coordenadas.
