# Decisiones (ADR cortos)

1. **Monorepo pnpm + Turborepo** — web, api y tipos compartidos versionan juntos; un solo `pnpm dev`.
2. **Express separado de Next** — API-first: la futura app móvil reutiliza el backend.
3. **Supabase Auth** — login/registro/OAuth gestionados; el api solo verifica JWT. Menos código de seguridad propio.
4. **Prisma 6 sobre PostgreSQL (Supabase)** — tipos generados y migraciones versionadas.
5. **Búsquedas guardadas estructuradas** (columnas, no JSON libre) — permite indexar y hacer matching con SQL.
6. **Pagos: pendiente** — Stripe vs Conekta (OXXO/SPEI) se decide cuando haya servicios de pago.
7. **Notificaciones: pendiente** — email (Resend) primero; WhatsApp y push después.
