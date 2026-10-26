# Reglas del proyecto COSAVE

Lee `README.md` y `docs/ARCHITECTURE.md` antes de tocar código.

## Principios
- **Concepto primero, código después**: explicar qué problema resuelve y cómo se guarda en la BD antes de programar.
- **Etapa actual**: ver roadmap en `README.md`. No adelantar etapas sin acordarlo.
- **API-first**: toda lógica de negocio vive en `apps/api`; `apps/web` solo consume `/api/v1`.

## Código
- Monorepo pnpm + Turborepo: `apps/web` (Next 16, React 19, Tailwind 4), `apps/api` (Express 5, Prisma 6), `packages/shared` (tipos y zod).
- TypeScript estricto. Validar toda entrada externa con zod en los bordes (rutas del api).
- Tipos y enums compartidos van en `packages/shared`, no se duplican.
- Auth con Supabase Auth: el api solo verifica el JWT (`apps/api/src/middleware/auth.ts`).
- Cambios de BD solo vía migraciones Prisma; documentar en `docs/DATABASE.md`. Toda tabla nueva activa RLS en su migración (`ALTER TABLE "X" ENABLE ROW LEVEL SECURITY;`): el web nunca lee tablas directo.
- Next 16 tiene cambios respecto a versiones previas: consultar `apps/web/node_modules/next/dist/docs/` antes de escribir código de Next.
- Diseño visual: seguir `docs/DESIGN.md`. Colores con los tokens `ink`/`azure` y la escala `slate` de Tailwind (`apps/web/app/globals.css`); botones con `btn btn-primary|btn-accent|btn-outline`. El panel admin aún usa la paleta anterior (`navy`/`accent`).

## Flujo
- No trabajar directo en `main`; ramas `feature/*`, `fix/*`.
- Antes de cerrar un cambio: `pnpm typecheck && pnpm lint && pnpm build`.
- Documentación y mensajes de UI en español.
- Nunca commitear `.env*`.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
