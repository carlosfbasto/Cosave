# Estado del proyecto COSAVE

**Última actualización:** 4 de noviembre de 2026 (las verificaciones de la sección 5 son del 2 de noviembre; las pruebas de la sección 6, del 4 de noviembre) · **Rama de trabajo:** `docs/estado-post-m2b`. `main` y `origin/main` están en `49e20f4`, que fusiona el PR #7 (`integracion/m0a-rediseno`: rediseños de publicación y perfil, y M2b).

Este archivo es el **estado vivo** del proyecto. No repite el roadmap ni la documentación técnica: los resume y enlaza. Si algo aquí contradice a `README.md` o a `docs/`, revisar ambos y corregir el que esté desactualizado.

> **Cómo leer los estados.** Cada elemento usa uno de estos niveles, y solo se marca ✅ lo que se comprobó:
> - ✅ **Verificado**: se comprobó en la sesión del 2-nov-2026 (pruebas automáticas, build, consultas de solo lectura a Supabase o llamadas reales al api).
> - 📄 **Documentado, sin verificar hoy**: lo describen `README.md` o `docs/`, y el código existe, pero esta revisión no lo ejecutó ni lo recorrió.
> - 🧪 **Pendiente de pruebas**: existe, falta un recorrido manual o una prueba automática.
> - ⏳ **No desarrollado**.

---

## 1. Qué es COSAVE y su objetivo

Plataforma inmobiliaria para buscar casas, terrenos, departamentos y bodegas. Su diferenciador: si alguien **no encuentra lo que busca**, guarda sus criterios y el sistema le **avisa automáticamente** cuando se publique una propiedad que coincida (como una alerta de empleos, pero para propiedades).

Cuatro tipos de usuario: **comprador**, **vendedor/propietario**, **asesor inmobiliario** y **admin**. Flujos descritos en `README.md`.

## 2. Arquitectura general

Detalle en `docs/ARCHITECTURE.md`.

| Capa | Tecnología |
|---|---|
| Monorepo | pnpm + Turborepo |
| `apps/web` | Next.js 16 (App Router), React 19, Tailwind 4. Puerto 5300. Solo consume `/api/v1`. |
| `apps/api` | Express 5, Prisma 6, TypeScript estricto, zod en los bordes. Puerto 3300. Toda la lógica de negocio. |
| `packages/shared` | Tipos, enums y esquemas zod compartidos (`@cosave/shared`). |
| Base de datos | PostgreSQL en Supabase (proyecto `cosave`, región `us-east-1`). |
| Autenticación | Supabase Auth; el api solo verifica el JWT y lee el rol de la BD. |
| Almacenamiento | Supabase Storage, bucket público `property-images`. |

Reglas clave: **API-first**; cambios de BD solo por migraciones Prisma; toda tabla nueva activa RLS en su migración; el web nunca lee tablas directo.

## 3. Módulos y funcionalidades existentes

Estado por módulo. El nivel ✅ aquí significa que el **módulo compila, pasa tipos y lint, y su ruta responde**; no significa que su flujo completo se haya recorrido.

### API (`apps/api`, 9 módulos de rutas más `index.ts`)

| Módulo | Qué hace | Estado |
|---|---|---|
| `me` | Perfil propio | 📄 |
| `admin` | Usuarios, roles, bitácora, cola de revisión de propiedades | 📄 (la bitácora y el cambio de rol tienen la tabla `AuditLog` en la BD ✅) |
| `myProperties` | Crear, editar, enviar a revisión, cambiar estado y subir fotos de mis propiedades | 📄 🧪 |
| `properties` | Listado, catálogo (máx. 500) y detalle públicos | ✅ `GET /properties/catalog` responde 200 con 17 propiedades |
| `postalCodes` | Consulta pública de código postal | ✅ 97000 y 97130 responden con datos; 00000 da 404 y `abc` da 422 |
| `favorites` | Guardar y quitar favoritos | 📄 |
| `inquiries` | "Me interesa" y bandeja de consultas | 📄 |
| `savedSearches` | "No encontré lo que busco" | 📄 |
| `notifications` | Avisos dentro de la app (campana) | 📄 |

`GET /health` responde 200 ✅.

### Web (`apps/web/app`)

Rutas existentes: `home`, `properties` (listado, venta, renta, mapa), `properties/[code]` (ficha), `vender` y `vender/[id]` (publicar), `profile/[id]/*` (perfil, publicados, consultas, búsquedas) y `favorites/[id]`, `notifications`, `login`, `registro`, `recuperar`, `restablecer`, `quienes-somos`, y el panel `admin` (usuarios, propiedades, solicitudes, reportes, configuración).

- ✅ El `build` compila todas estas rutas. Sin sesión, `/home`, `/properties` y `/properties/sale` responden 200, `/properties/map` redirige a `/properties?vista=mapa`. `/vender`, `/profile/x` y `/favorites/x` también responden 200 sin sesión; eso solo confirma que cargan, no que funcionen.
- 🧪 **Recorrido manual autenticado de `/vender`, perfil, favoritos y mapa: pendiente** (ver sección 10).
- 📄 No se revisó el contenido de `admin/configuracion` ni de `admin/reportes`; esta revisión no sabe qué tan completas están.

### Rediseño visual

Sistema "Architectural Precision Minimalist" (`docs/DESIGN.md`): portada, ficha, listado con mapa, Quiénes somos, publicación (`/vender`) y perfil rediseñados. El panel admin todavía usa la paleta anterior (`navy`/`accent`), según `AGENTS.md`.

## 4. Estado de cada etapa del roadmap

El roadmap oficial está en `README.md`. Aquí se agrega **qué se comprobó**.

| Etapa | Descripción | Estado real |
|---|---|---|
| **Fase 0** | Arquitectura, planos, stack | ✅ Completa (según `README.md`) |
| **Etapa 1** | BD, usuarios, roles, admin | 🔄 Migraciones aplicadas ✅. Usuarios, roles, panel admin y bitácora: 📄. **Falta:** respaldos y su pantalla en el admin ⏳ |
| **Etapa 2** | Publicar propiedades, fotos, revisión | 🔄 Código, migraciones y catálogo de códigos postales ✅ en BD. Flujo de publicar y subir fotos de punta a punta: 🧪 **sin probar**. **Falta:** videos / recorridos virtuales ⏳, tipos *oficina* y *rancho* ⏳ |
| **Etapa 3** | Buscador, filtros, resultados, mapa | 🔄 Listado, ficha, portada y mapa leen del api (catálogo ✅). **M2b (api):** existen `GET /properties/search`, `/search/facets` y `/search/map` (paginación, filtros, texto libre, orden, conteos y recuadro del mapa en el servidor), con 202 pruebas automáticas ✅ (las de SQL corren en PGlite, no en PostgreSQL real). **Falta:** verificar los endpoints contra la BD real de Supabase 🧪 y migrar el web para que los consuma (hoy `apps/web/lib/search.ts` solo reutiliza el parser compartido; el catálogo sigue cargando hasta 500) ⏳. El mapa con gestos: 🧪 |
| **Etapa 4** | Favoritos, comparador, contacto | 🔄 Favoritos y consultas: 📄 🧪 (con sesión). **Falta el comparador** ⏳ |
| **Etapa 5** | "No encontré lo que busco", asesores, "Quiero vender" | 🔄 Búsquedas guardadas y avisos en la app por coincidencia: 📄 (el matching tiene 9 pruebas automáticas ✅). **Falta:** perfil y alta de asesor, directorio de asesores, solicitudes de venta/servicios, leads para asesores y avisos por email ⏳. La tabla `SellerRequest` existe en el modelo pero el endpoint `POST /seller-requests` está solo planeado |
| **Etapa 6** | Pruebas, seguridad, lanzamiento | ⏳ Hay una base: Vitest en el api, RLS en todas las tablas y bitácora. **Falta:** más pruebas, rate limiting, respaldos, correcciones y lanzamiento |

**Después del MVP** (Fases A monetización, B consolidación y C escalamiento): ⏳ sin iniciar. Ver `README.md`.

## 5. Supabase y migraciones

Verificado el 2-nov-2026 con consultas **solo de lectura** al proyecto `cosave` (no se aplicó ni modificó nada).

| Comprobación | Resultado |
|---|---|
| Migraciones recientes en `_prisma_migrations` | ✅ Las 4 de M0 (`20261027…` a `20261028020000`) y las 4 de la Etapa 1 (`20261025…`) aparecen terminadas y sin revertir |
| Esquema real | ✅ Coincide con `schema.prisma`: valores `commercial_warehouse` e `industrial_warehouse`; columnas `maintenanceFee`, `amenities`, `materials`, `latitude`, `longitude`; índices de `PostalCode` |
| RLS | ✅ Activo en `PostalCode`, `Property` y `PropertyFeatures`. No se revisaron las demás tablas una por una; `docs/DATABASE.md` afirma RLS en todas |
| Catálogo `PostalCode` | ✅ 144.655 colonias, 32.448 códigos postales, todas con coordenadas |
| Migraciones anteriores (`20261004` a `20261012`) | 📄 No se consultaron hoy; se asumen aplicadas porque las posteriores dependen de ellas |
| Bucket `property-images` | 📄 Lo indica el `README.md`; no se consultó |

Nota: el comando `list_migrations` de Supabase devuelve vacío porque Prisma guarda su historial en `_prisma_migrations`.

## 6. Pruebas ejecutadas y cobertura pendiente

**Ejecutadas el 2-nov-2026 con `--force` (sin caché), en la rama `integracion/m0a-rediseno`:**

| Prueba | Resultado |
|---|---|
| `pnpm typecheck` | ✅ |
| `pnpm lint` | ✅ (web usa eslint; api y shared solo hacen `tsc --noEmit`) |
| `pnpm test` | ✅ 53 de 53 pruebas, en 4 archivos (auditoría, coincidencias de búsquedas, calidad de imagen, autenticación) |
| `pnpm build` | ✅ |

**Ejecutadas el 4-nov-2026 sobre los cambios de M2b (búsqueda en servidor):**

| Prueba | Resultado |
|---|---|
| `pnpm typecheck` | ✅ |
| `pnpm lint` | ✅ |
| `pnpm build` | ✅ |
| `pnpm test` (api) | ✅ 202 de 202, en 6 archivos. Una prueba estaba desactualizada (esperaba ignorar `page`/`sort`; el esquema los rechaza a propósito) y se corrigió |

No se probaron los endpoints nuevos contra Supabase ni desde el web.

**Cobertura pendiente:**
- Sin pruebas automáticas: `postal-codes`, `property-service`, rutas de propiedades, favoritos, consultas, notificaciones y búsquedas guardadas (solo el *matching* tiene pruebas).
- Sin pruebas del web (`apps/web/package.json` no define script `test` ni runner como vitest, jest o playwright).
- Sin pruebas contra la BD real. Las del SQL de búsqueda usan PGlite (PostgreSQL embebido); puede haber diferencias con Supabase.
- **Recorrido manual autenticado pendiente** de `/vender`, perfil, favoritos y mapa.
- El *seed* (`db:seed`), con los tipos de bodega, características y materiales nuevos, no se ejecutó; solo pasó el typecheck.

## 7. Decisiones técnicas confirmadas

De `docs/DECISIONS.md` y de la sesión:

1. Monorepo pnpm + Turborepo.
2. Express separado de Next (API-first; la app móvil futura reutiliza el backend).
3. Supabase Auth: el api solo verifica el JWT.
4. Prisma 6 sobre PostgreSQL (Supabase).
5. Búsquedas guardadas con columnas estructuradas, no JSON libre.
6. `sharp ^0.35.5` en el api para medir la nitidez de las fotos, aceptado el 2-nov-2026. Es una librería nativa; implicaciones de despliegue en `docs/DECISIONS.md` (decisión 8).
7. RLS activo y sin políticas: el web no consulta tablas; solo el api (rol `postgres`).
8. El rate limiting se deja para la Etapa 6 (decisión del 2-nov-2026).

## 8. Decisiones abiertas

- **Pasarela de pagos:** Stripe o Conekta (OXXO/SPEI). Se decide cuando haya servicios de pago (Fase A).
- **Notificaciones:** email con Resend primero; WhatsApp y push después. Pendiente de implementar y decidir.
- **Comparador (Etapa 4):** ¿solo en el cliente (localStorage) o guardado en la cuenta? Afecta si hay cambio de BD.
- **Paginación y filtros en el servidor (Etapa 3):** el api ya los ofrece en `/properties/search*` sin cambiar `GET /properties` ni `/catalog`. Falta decidir cuándo migrar el web y confirmar la devDependency `@electric-sql/pglite`.
- **Licencia del proyecto:** el `README.md` aún tiene `[elegir: MIT, Apache 2.0, etc.]`.
- **Qué hacer con la rama `integracion/m0a-rediseno`:** abrir PR a `main`, o seguir acumulando trabajo en ella.

## 9. Riesgos y dependencias

| Riesgo / dependencia | Detalle |
|---|---|
| **Cambios sin commit** | Ninguno al momento de esta actualización: M2b está confirmado (`16ebd35`). La devDependency `@electric-sql/pglite` queda incluida y sigue pendiente de tu confirmación expresa. |
| **Rama sin integrar** | Ninguna: el PR #7 se fusionó en `main` el 5-nov-2026 (UTC) sin revisión ni verificaciones automáticas; solo se corrieron a mano `typecheck`, `lint`, `build` y las pruebas del api. |
| **Sin límite de peticiones** | Ningún endpoint del api tiene rate limiting, incluido el público `GET /postal-codes/:code`. Pendiente para la Etapa 6. |
| **`sharp`** | Librería nativa: el despliegue debe instalar sus binarios en la plataforma destino y probarse antes del lanzamiento. |
| **Catálogo de códigos postales** | Sin él, `GET /postal-codes/:code` da 404 y guardar una propiedad falla con 422. Hoy está cargado en el proyecto `cosave`. En cualquier BD nueva hay que correr `pnpm --filter @cosave/api db:postal-codes <MX.txt>`. |
| **Catálogo de hasta 500** | El web aún filtra en el cliente; con muchas propiedades se vuelve lento hasta que use `/properties/search`. |
| **Cobertura baja** | Gran parte de la lógica de negocio no tiene pruebas automáticas. |
| **Documentación desactualizada** | Corregidas las discrepancias conocidas (sección 11). `docs/DESIGN.md` y `docs/CONTRIBUTING.md` no se revisaron. |
| **Dependencia del correo** | Los avisos por email dependen de elegir e integrar Resend. |

## 10. Próximas actividades recomendadas

En orden sugerido. Cada una requiere autorización explícita antes de empezar.

1. **Recorrido manual autenticado** de `/vender`, perfil, favoritos y mapa (subida de fotos, Ctrl+rueda en el mapa, vista previa). Es la excepción abierta de M0. 🧪
2. **Confirmar los cambios de documentación y `PROJECT_STATUS.md`** con un commit en la rama, y decidir el PR hacia `main`.
3. **M2b (api implementado y auditado):** probar `/properties/search*` contra Supabase y migrar el web para consumirlos. Confirmar antes la devDependency `@electric-sql/pglite`.
4. Alternativa a M2: **comparador de propiedades** (Etapa 4), tras decidir dónde se guarda.
5. **Pruebas automáticas** de `property-service` y de las rutas principales, antes de seguir con funciones nuevas.
6. Etapa 5: flujo de **asesores** y avisos por **email**.
7. Etapa 6: **rate limiting**, respaldos y revisión de seguridad.

## 11. Discrepancias de documentación detectadas

Se detectaron cuatro al recopilar este estado y **se corrigieron el 3 de noviembre de 2026** (sin commit todavía):

- `docs/DATABASE.md`: ya no dice "borrador de Fase 0"; incluye la tabla «Estado de las migraciones» (13 en el repositorio, 8 comprobadas como aplicadas, 5 no consultadas).
- El diagrama ER de `docs/DATABASE.md` ya incluye `PropertyStatusEvent` (relacionada con `Property`) y `PostalCode` y `AuditLog` como tablas sin clave foránea.
- `docs/ARCHITECTURE.md`: la ruta es `/properties`.
- `README.md`: ya menciona `PROJECT_STATUS.md` (estructura, roadmap y documentación adicional) y reemplazó "Versión 1.0 (Fase 0)" por el estado del MVP.

Sin discrepancias abiertas conocidas entre `README.md`, este archivo y `docs/`. No se revisó `docs/DESIGN.md` ni `docs/CONTRIBUTING.md`.

## 12. Documentación relacionada

`README.md` · `AGENTS.md` / `CLAUDE.md` (reglas) · `docs/ARCHITECTURE.md` · `docs/DATABASE.md` · `docs/API.md` · `docs/DECISIONS.md` · `docs/DESIGN.md` · `docs/CONTRIBUTING.md`.
