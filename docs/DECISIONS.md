# Decisiones (ADR cortos)

1. **Monorepo pnpm + Turborepo** — web, api y tipos compartidos versionan juntos; un solo `pnpm dev`.
2. **Express separado de Next** — API-first: la futura app móvil reutiliza el backend.
3. **Supabase Auth** — login/registro/OAuth gestionados; el api solo verifica JWT. Menos código de seguridad propio.
4. **Prisma 6 sobre PostgreSQL (Supabase)** — tipos generados y migraciones versionadas.
5. **Búsquedas guardadas estructuradas** (columnas, no JSON libre) — permite indexar y hacer matching con SQL.
6. **Pagos: pendiente** — Stripe vs Conekta (OXXO/SPEI) se decide cuando haya servicios de pago.
7. **Notificaciones: pendiente** — email (Resend) primero; WhatsApp y push después.
8. **`sharp` en el api (nitidez de fotos)** — se agregó `sharp ^0.35.5` a `apps/api` (aceptado el 2 de noviembre de 2026) para medir la nitidez de las fotos al publicar (`src/lib/image-quality.ts`), con la misma fórmula que usa el navegador (`SHARPNESS` en `packages/shared`). Implicaciones para el despliegue:
   - Es una librería **nativa**: instala un binario por plataforma (`@img/sharp-*`) y no una versión en JavaScript puro.
   - El servidor donde corra el api debe instalar las dependencias en su propia plataforma/arquitectura (no copiar un `node_modules` de Windows a Linux), y el instalador debe poder descargar sus binarios.
   - Los entornos serverless o de imagen mínima (por ejemplo Alpine) deben ser compatibles con `sharp`; hay que probar el despliegue antes del lanzamiento.
   - Consume memoria y CPU al procesar fotos (máx. 8 MB por foto, una por petición); conviene vigilarlo en la Etapa 6.
   - Si cambia la fórmula de nitidez, hay que cambiarla a la vez en el web y en el api.
9. **Búsqueda del catálogo en el servidor (M2)** — `GET /properties/search` filtra, ordena y pagina en SQL; `GET /properties` y `/catalog` no cambian. Decisiones (3 de noviembre de 2026):
   - **Sin columnas, extensiones ni migraciones.** Acentos y mayúsculas se pliegan con `translate`, no con `unaccent`; las tablas viven en `packages/shared` y viajan al SQL como parámetros, así TypeScript y PostgreSQL no divergen.
   - **Dos normalizaciones distintas, a propósito.** Búsqueda libre (`norm`): tolerante, `ñ` → `n`, sin cambios respecto al explorador. Ubicaciones (`locationKey`): es *identidad* de un filtro, así que `ñ` se conserva (`Peña` ≠ `Pena`) y solo se ignoran acentos, mayúsculas y espacios. La clave no usa `lower()`, `toLowerCase()` ni `\s`: dependen de la configuración regional o del motor, y habrían dado claves distintas en PGlite y en Supabase.
   - **Espacios:** exactamente la propiedad Unicode `White_Space`, lista explícita en `WHITE_SPACE_CODE_POINTS`. Los caracteres de ancho cero no se tratan como espacios (limitación conocida: un valor con `U+200B` produce otra clave).
   - **Plurales:** se mantiene quitar solo la `s` final. No se agregó la regla para `-es`.
   - **Zona nula = «Centro»:** se replica por paridad con el explorador; es una regla de presentación heredada, no un dato almacenado.
   - **Un solo constructor de condiciones** para lista y conteo (y, en M2b, facets y mapa). Todo valor del usuario va como parámetro.
   - **Pruebas del SQL con PGlite** (`@electric-sql/pglite`, devDependency de `apps/api`). Limitaciones respecto a Supabase: PGlite 0.5.14 trae **PostgreSQL 18.6** (Supabase `cosave`: 17.11); su colación es «C»; es WASM de un solo usuario y **no sirve para medir rendimiento**; el esquema de prueba imita `schema.prisma` a mano (solo las columnas de la búsqueda); su cliente descarta un `U+FEFF` inicial al decodificar texto (por eso las claves se comparan en hexadecimal). Complemento: comparación de solo lectura contra las 17 propiedades reales de Supabase.
   - **USD:** la web convierte con la tasa fija `USD_RATE = 17` (`apps/web/lib/mock-data.ts`, marcada «ficticio»). No es una tasa actualizada y no cambia en M2.
