# Estado del proyecto COSAVE

**Última actualización:** 15 de noviembre de 2026. Las verificaciones de la sección 5 son del 2 de noviembre; las pruebas de la sección 6, del 2 al 5 de noviembre y del 12 de noviembre (bloque «Ejecutadas el 12-nov-2026») · **Base verificada el 15-nov-2026:** `main` y `origin/main` coinciden en `d529998`, el merge del PR #14 (fusionado el 15-nov-2026 desde `feature/m1-api-solicitudes`), que integró **M1 etapa 1**, la API de solicitudes de atención (`7195a61` y `7a47a15`). Antes, el PR #13 (`d039ef7`) fue solo documentación y el PR #12 integró H1, H2, H3 y H5. Esta actualización es solo documental y se prepara en una rama aparte creada desde esa base (`docs/estado-post-m1-etapa1`); al fusionarla, `main` avanzará más allá de `d529998`. Lo último de código en `main` es M1 etapa 1 (PR #14), que cambia la API y el paquete compartido pero no el sitio web; antes entraron las correcciones del PR #12 (H1, H2, H3 y H5), el PR #9 (`feature/admin-rediseno`: rediseño del panel admin, panel de revisión de propiedades y avisos `in_app` al dueño), el PR #8 y el PR #7 (`integracion/m0a-rediseno`: rediseños de publicación y perfil, y M2b).

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

### API (`apps/api`, 10 módulos de rutas más `index.ts`)

| Módulo | Qué hace | Estado |
|---|---|---|
| `me` | Perfil propio | 📄 |
| `admin` | Usuarios, roles, bitácora, cola de revisión de propiedades. Al aprobar, rechazar o retirar, avisa al dueño con un aviso `email` (queda `pending`: aún no hay envío de correos) y uno `in_app` (`lib/review-notifications.ts`, 7 pruebas ✅); el `in_app` solo enlaza a la ficha si se aprobó | 📄 (la bitácora y el cambio de rol tienen la tabla `AuditLog` en la BD ✅). El rechazo y su aviso en la campana se comprobaron con datos reales el 5-nov-2026 ✅; aprobar y retirar solo por pruebas unitarias |
| `myProperties` | Crear, editar, enviar a revisión, cambiar estado y subir fotos de mis propiedades | 📄 🧪 |
| `properties` | Listado, catálogo (máx. 500) y detalle públicos | ✅ `GET /properties/catalog` responde 200 con 17 propiedades |
| `postalCodes` | Consulta pública de código postal | ✅ 97000 y 97130 responden con datos; 00000 da 404 y `abc` da 422 |
| `favorites` | Guardar y quitar favoritos | 📄 |
| `inquiries` | "Me interesa" y bandeja de consultas | 📄 |
| `savedSearches` | "No encontré lo que busco" | 📄 |
| `notifications` | Avisos dentro de la app (campana) | 📄 |
| `sellerRequests` (M1, etapa 1) | `POST` y `GET /seller-requests`: solicitud general de atención (`self_publish`, `find_agent`, `services`); una abierta por tipo y persona con candado `pg_advisory_xact_lock`; el `PATCH /admin/seller-requests/:id` valida la reapertura con el mismo candado | ✅ Implementado e integrado en `main` (PR #14, 15-nov-2026) con 79 pruebas nuevas (en memoria y SQL en PGlite) y 14 pruebas de integración ejecutadas en un **PostgreSQL 17 local** (sección 6). 🧪 **Sin comprobar a través del pooler de Supabase** (puerto 6543, pgbouncer en modo transacción) |

`GET /health` responde 200 ✅.

### Web (`apps/web/app`)

Rutas existentes: `home`, `properties` (listado, venta, renta, mapa), `properties/[code]` (ficha), `vender` y `vender/[id]` (publicar), `profile/[id]/*` (perfil, publicados, consultas, búsquedas) y `favorites/[id]`, `notifications`, `login`, `registro`, `recuperar`, `restablecer`, `quienes-somos`, y el panel `admin` (usuarios, propiedades, solicitudes, reportes, configuración).

- ✅ El `build` compila todas estas rutas. Sin sesión, `/home`, `/properties` y `/properties/sale` responden 200, `/properties/map` redirige a `/properties?vista=mapa`. `/vender`, `/profile/x` y `/favorites/x` también responden 200 sin sesión; eso solo confirma que cargan, no que funcionen.
- 🧪 **Recorrido manual autenticado de `/vender`, perfil, favoritos y mapa: pendiente** (ver sección 10).
- ✅ **Panel admin** (revisado en Chrome de escritorio con datos reales el 5-nov-2026): Resumen, Propiedades, Solicitudes, Usuarios, Reportes y Configuración se ven con el sistema de diseño actual. `admin/configuracion` es de solo lectura (valores vigentes del api) y `admin/reportes` son conteos por estado, tipo, rol y tipo de solicitud, sin fechas ni tendencias. Solicitudes está vacía hasta que exista `POST /seller-requests` (Etapa 5).
- 🧪 **Panel admin, sin comprobar:** la vista móvil (menú en cajón y panel de revisión a ancho completo), aprobar y retirar con datos reales, y confirmar un cambio de rol real.

### Rediseño visual

Sistema "Architectural Precision Minimalist" (`docs/DESIGN.md`): portada, ficha, listado con mapa, Quiénes somos, publicación (`/vender`) y perfil rediseñados. El panel admin se migró al mismo sistema (PR #9, fusionado en `main`; menú lateral blanco, `ink`/`azure`, `btn`/`field`) y la paleta anterior (`navy`/`accent`) se retiró de `globals.css`. Además: panel lateral de revisión de propiedades (`components/admin/property-review-panel.tsx`, abre con `?ver=<clave>`) y confirmación al cambiar el rol de un usuario. Detalle en `docs/DESIGN.md`.

## 4. Estado de cada etapa del roadmap

El roadmap oficial está en `README.md`. Aquí se agrega **qué se comprobó**.

| Etapa | Descripción | Estado real |
|---|---|---|
| **Fase 0** | Arquitectura, planos, stack | ✅ Completa (según `README.md`) |
| **Etapa 1** | BD, usuarios, roles, admin | 🔄 Migraciones aplicadas ✅. Usuarios, roles, panel admin y bitácora: 📄 (el panel admin se rediseñó y se comprobó visualmente el 5-nov). **Falta:** respaldos y su pantalla en el admin ⏳, **pantalla de la bitácora** (el api ya tiene `GET /admin/audit`, el web no la usa) ⏳, y paginación en usuarios y solicitudes (hoy fijas en 50) ⏳ |
| **Etapa 2** | Publicar propiedades, fotos, revisión | 🔄 Código, migraciones y catálogo de códigos postales ✅ en BD. Flujo de publicar y subir fotos de punta a punta: 🧪 **sin probar**. **Falta:** videos / recorridos virtuales ⏳, tipos *oficina* y *rancho* ⏳ |
| **Etapa 3** | Buscador, filtros, resultados, mapa | 🔄 Listado, ficha, portada y mapa leen del api (catálogo ✅). **M2b (api):** existen `GET /properties/search`, `/search/facets` y `/search/map` (paginación, filtros, texto libre, orden, conteos y recuadro del mapa en el servidor), con 202 pruebas automáticas ✅ (las de SQL corren en PGlite, no en PostgreSQL real). **Falta:** verificar los endpoints contra la BD real de Supabase 🧪 y migrar el web para que los consuma (hoy `apps/web/lib/search.ts` solo reutiliza el parser compartido; el catálogo sigue cargando hasta 500) ⏳. El mapa con gestos: 🧪 |
| **Etapa 4** | Favoritos, comparador, contacto | 🔄 Favoritos y consultas: 📄 🧪 (con sesión). **Falta el comparador** ⏳ |
| **Etapa 5** | "No encontré lo que busco", asesores, "Quiero vender" | 🔄 Búsquedas guardadas y avisos en la app por coincidencia: 📄 (el matching tiene 9 pruebas automáticas ✅). **Falta:** perfil y alta de asesor, directorio de asesores, solicitudes de venta/servicios, leads para asesores y avisos por email ⏳. **M1 etapa 1** (API de solicitudes de atención, `POST`/`GET /seller-requests`): integrada en `main` (PR #14), con la concurrencia validada en un PostgreSQL 17 local y **sin comprobar a través del pooler de Supabase**; faltan los avisos, las pantallas y el panel (etapas 2 a 5) |
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

**Ejecutadas el 5-nov-2026 sobre el rediseño del panel admin y los avisos de revisión (rama `feature/admin-rediseno`, antes de fusionar el PR #9), con `--force`:**

| Prueba | Resultado |
|---|---|
| `pnpm typecheck` | ✅ |
| `pnpm lint` | ✅ |
| `pnpm build` | ✅ (compila las 6 rutas de `/admin`) |
| `pnpm --filter @cosave/api test` | ✅ 209 de 209, en 7 archivos (7 nuevas de `review-notifications`) |
| Recorrido en Chrome de escritorio del panel admin con sesión real | ✅ todas las pantallas; rechazo real de una propiedad y su aviso en la campana |
| Vista móvil, aprobar, retirar y confirmar un cambio de rol real | ⚠️ no ejecutado (ver sección 3) |

La auditoría de esta jornada la dejó **aprobada con observaciones** (ninguna crítica ni alta); lo abierto está en la sección 10.

**Ejecutadas el 12-nov-2026 sobre las correcciones H1, H2, H3 y H5 (rama `fix/h1-h2-contacto-y-fechas`, antes de confirmar los commits), con `--force` y el servidor de desarrollo detenido:**

| Prueba | Resultado |
|---|---|
| `pnpm typecheck` / `pnpm lint` | ✅ / ✅ |
| `pnpm build` | ✅ (21 páginas estáticas) |
| `pnpm --filter @cosave/api test` | ✅ 209 de 209 |
| H1: contactar tu propia propiedad | ✅ Dice «Esta publicación es tuya» (navegador) |
| H2: fechas en hora de México | ✅ `formatDate` en 15 casos y 3 zonas horarias; fechas de la campana y de Mis propiedades en vivo |
| H3: «Me interesa» aplica solo los datos editados | ✅ Cuerpo real de la petición verificado (nombre, correo, teléfono y lada) |
| H3: modal de búsquedas, errores bajo el campo, Enter y `trim` de ciudad/estado | ✅ (navegador) |
| H5: error de hidratación de `PropertiesExplorer` | ✅ Con un arnés determinista que usa el hook real y simula la carrera (catálogo llegando antes de hidratar): hook actual → error de hidratación; hook corregido → sin error y mismo resultado final. Sin errores ni parpadeo en portada, listado, mapa, rentas, favoritos y ficha. ⚠️ **Limitación:** la carrera **no se reprodujo en la aplicación real** en las pruebas finales (solo apareció una vez, en una carga en frío, antes de la corrección); la demostración depende del arnés, cuyos scripts son temporales y no están en el repositorio |

Sin pruebas automáticas del web (no hay ejecutor): H1, H2, H3 y H5 se verificaron a mano y con scripts temporales que no están en el repositorio.

**Ejecutadas el 15-nov-2026 sobre M1 etapa 1 (rama `feature/m1-api-solicitudes`, antes de fusionar el PR #14), con `--force` (sin caché):**

| Prueba | Resultado |
|---|---|
| `pnpm typecheck` / `pnpm lint` / `pnpm build` | ✅ / ✅ / ✅ (0 tareas en caché). Un primer typecheck falló por un error de tipos en el archivo de apoyo de las pruebas y se corrigió |
| `pnpm --filter @cosave/api test` | ✅ 288 pasadas y **14 omitidas**, en 12 archivos. Antes: 209. Las 14 omitidas son las de `seller-requests.integration.test.ts`, que sin `TEST_DATABASE_URL` se omiten; con ella se ejecutan (fila de «Concurrencia real en PostgreSQL local») |
| Guarda de la base de pruebas (`lib/test-database.ts` y `scripts/migrate-test-db.ts`, script `db:deploy:test`) | ✅ 14 pruebas de la guarda. El script se negó, sin migrar y sin imprimir credenciales, en 6 casos: sin `TEST_DATABASE_URL`, host de Supabase, base sin «test», `host=` escondido en la URL, URL inválida y servidor inexistente. Motivo: se comprobó con Prisma 6.19.3 que `migrate` conecta con `DIRECT_URL` y que, con una sola variable definida en la terminal, la otra sale de `apps/api/.env` (tu Supabase). El camino que sí migra se ejecutó en el equipo del responsable del proyecto (las pruebas de integración exigen las migraciones aplicadas y pasaron), pero **esta sesión no vio la salida** de la guarda ni de las migraciones |
| SQL del candado en PGlite (`seller-requests.sql.test.ts`, 4 pruebas) | ✅ Ejecuta el texto SQL real de `lockSellerRequest` en un PostgreSQL de verdad (WASM, un solo usuario): es válido, toma un candado de aviso, `SET LOCAL lock_timeout = '3s'` se revierte al terminar, el candado se suelta también si la transacción falla, y la misma clave es reentrante. **No** muestra dos transacciones compitiendo ni el vencimiento del `lock_timeout` |
| Pruebas de esquemas, rutas, permisos y lógica (base **en memoria**, sin red) | ✅ 401, 403, 422, creación, 409 por duplicado (`open` y `assigned`), nueva tras una `closed`, listado solo del usuario del token, reapertura conflictiva y transiciones válidas, 503 ante un timeout, y el orden «candado → lectura → escritura». Comprobación de mutación: quitar el candado de la creación hace fallar 2 pruebas |
| Concurrencia real en PostgreSQL **local** (`seller-requests.integration.test.ts`, 14 pruebas) | ✅ **Ejecutada por el responsable del proyecto el 15-nov-2026 en un PostgreSQL 17 local** (`127.0.0.1:5432`, base `cosave_test`): **14 de 14 pasaron en 12,18 s**, según lo informado; esta sesión no reprodujo la ejecución. Lo que esas pruebas afirman y que por tanto quedó cumplido: transacciones en conexiones distintas; un control sin candado, determinista, que sí deja dos abiertas (el detector funciona); dos y cinco creaciones simultáneas con una sola ganadora y el resto 409; crear + reabrir y dos reaperturas simultáneas con exactamente una ganadora y una sola abierta; aislamiento entre dos usuarios sintéticos; espera real del candado visible en `pg_locks`, sin bloquear a otras personas ni a otros tipos; liberación del candado aunque la transacción falle; vencimiento de `lock_timeout` a los 3 s con error crudo de Prisma `P2010` / `55P03`, traducido a 503 `busy` y a su cuerpo HTTP, sin dejar nada a medias; y dos recorridos con Express real (201 + 409 simultáneos, y 503 con el candado ocupado). **Líneas informativas de esa ejecución, ya revisadas:** (a) el control natural, sin candado, dejó duplicados en **15 de 15 rondas**: la carrera ocurre de forma fiable en esa máquina, así que los casos de 15 rondas con candado no pasan por azar; (b) el error de `lock_timeout` llegó a Prisma como `PrismaClientKnownRequestError` con código `P2010` y `meta.code = 55P03`, tras **3018 ms**, con el mensaje de PostgreSQL en **español** (la traducción a 503 se basa en el código SQLSTATE y no en el texto, así que no depende del idioma del servidor); (c) la limpieza borró **72 perfiles de los 72 registrados** en esa ejecución (`d515fe2c`), y ese número coincide con los usuarios que crean las pruebas. Límite: los casos de 15 rondas no fuerzan el solapamiento con una barrera; lo respaldan el control natural y la repetición. Usuarios y datos sintéticos, no cuentas reales. **Es evidencia de los escenarios probados; no garantiza la ausencia de cualquier fallo** |
| **Sin comprobar: el pooler de Supabase** | La validación anterior usó una **conexión directa a un PostgreSQL 17 local, sin pooler**. No se ha comprobado que `SET LOCAL lock_timeout` y `pg_advisory_xact_lock` se comporten igual a través del pooler de Supabase (puerto 6543, pgbouncer en modo transacción, con `pgbouncer=true` en `DATABASE_URL`), ni con el PostgreSQL 17.11 de Supabase, ni con los límites propios de su rol (por ejemplo `statement_timeout`). Hacerlo exige escribir filas de prueba en una base de Supabase (la operativa o un proyecto o rama de pruebas), cosa que no está autorizada |
| Duplicados previos en la base operativa (consulta **solo de lectura y agregada**) | ✅ `SellerRequest`: 0 filas, 0 abiertas, 0 parejas duplicadas. No se escribió nada en Supabase |

**Cobertura pendiente:**
- Comprobación del candado de `SellerRequest` a través del pooler de Supabase (la concurrencia real ya se validó en un PostgreSQL local; ver el bloque anterior).
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
- **Paginación y filtros en el servidor (Etapa 3):** el api ya los ofrece en `/properties/search*` sin cambiar `GET /properties` ni `/catalog`. Falta decidir cuándo migrar el web. La devDependency `@electric-sql/pglite` se conserva (decisión del 15-nov-2026).
- **Licencia del proyecto:** el `README.md` aún tiene `[elegir: MIT, Apache 2.0, etc.]`.
- **Ramas: limpieza hecha el 15-nov-2026.** Se borraron, en local y en `origin` donde existían: `fix/h1-h2-contacto-y-fechas` y `feature/m1-quiero-vender` (ambas en `0bf67cf`; el PR #12 se fusionó desde la segunda), `docs/estado-ramas` (`e3dcb0d`, PR #11), `backup/main-antes-de-integrar` (`26a18d6`, solo local; su contenido ya estaba en `main`) y `feature/primera-etapa` (`4984596`, la única no integrada: un solo commit que cambiaba `apps/api/.env.example`; ver la sección 9). Las integradas se borraron con `git branch -d`, que las habría rechazado de tener commits sin integrar. Antes, el 5-nov-2026, se habían borrado `integracion/m0a-rediseno`, `feature/admin-rediseno`, `docs/estado-post-admin-rediseno` y siete `feature/*`. Los commits de las ramas integradas siguen en `main`. Integradas en `main` y todavía sin borrar: `docs/estado-post-pr12` (PR #13) y `feature/m1-api-solicitudes` (PR #14); borrarlas es decisión del responsable del proyecto.

## 9. Riesgos y dependencias

| Riesgo / dependencia | Detalle |
|---|---|
| **Cambios sin commit** | Ninguno de código. `AGENTS.md` figura como modificado solo por finales de línea (Turbo lo reescribe con `core.autocrlf=true`; `git diff --ignore-space-at-eol` no muestra diferencias de contenido) y no se confirma. La devDependency `@electric-sql/pglite` (`^0.5.14`) ya está declarada en `apps/api/package.json` y en `pnpm-lock.yaml` desde M2b y forma parte de `main`; **se conserva como dependencia de desarrollo: decisión confirmada el 15-nov-2026**. Desde M1 etapa 1 la usan también `seller-requests.sql.test.ts` y `test-database.test.ts` (además de `property-search.db.test.ts`), así que quitarla afectaría a tres archivos de pruebas. |
| **Contraseña de la BD expuesta en el historial (mitigada)** | El commit `4984596` (25-oct-2026), de la rama `feature/primera-etapa` ya borrada, escribió en `apps/api/.env.example` una cadena de conexión con la contraseña real de la base de datos en un repositorio de GitHub **público**. Se comprobó el 14-nov-2026 que coincidía con la de `apps/api/.env`, que el valor aparecía solo en ese commit y que **nunca estuvo en `main`**. **Mitigación:** el 15-nov-2026 se restableció la contraseña en Supabase y `apps/api/.env` ya tiene una distinta (`DATABASE_URL` y `DIRECT_URL`); ese mismo día se borró la rama. **Límites:** el commit sigue accesible en GitHub por su SHA (comprobado el 15-nov-2026) y puede estar en clones o cachés ajenos, pero la contraseña antigua ya no debería servir. **Sin comprobar:** que la API conecte con la contraseña nueva (se omitió a propósito), que se haya actualizado en servicios o despliegues que la usen, y los registros de la base de datos en busca de accesos ajenos. Si hubiera otros secretos reales en el historial, no se ha hecho una búsqueda completa. |
| **Verificaciones automáticas** | No hay verificaciones de calidad configuradas (sin CI): los PR #9 y #12 no mostraron ningún check y los únicos «checks» actuales son los de Vercel. Solo se corrieron a mano `typecheck`, `lint`, `build` y las pruebas del api. |
| **Despliegues automáticos de Vercel** | Desde el PR #13 (15-nov-2026), cada `push` o PR crea una vista previa en **dos proyectos de Vercel** (`cosave` y `cosave-qvlr`). El repositorio no tiene `vercel.json`, `.github` ni otros archivos de despliegue, y ninguna compilación ejecuta migraciones, semillas ni código que se conecte a la base (`build` = `esbuild`, `next build` y `tsc`; `postinstall` = `prisma generate`). **Comprobado por el responsable del proyecto el 15-nov-2026 en las pantallas de Vercel** (esta sesión no las vio): ambos proyectos publican `apps/web` y no tienen variables de entorno ni variables compartidas, así que no publican la API ni guardan credenciales de la base. En el repositorio coincide: el web usa solo variables públicas `NEXT_PUBLIC_*`, no tiene rutas de servidor ni middleware, y su compilación no se conecta a la base. Un cambio en `packages/shared` sí regenera la vista previa del sitio, que no escribe en la base. Si esa configuración cambiara (otra carpeta o variables de base de datos), hay que repetir la comprobación. Las vistas previas del PR #14 terminaron bien (comprobaciones de Vercel en verde). |
| **Candado de `SellerRequest` (M1)** | «Una abierta por tipo y persona» se garantiza con `pg_advisory_xact_lock` en el api, **no** con una restricción única de la base: solo vale si toda escritura que abre o reabre pasa por `lib/seller-requests.ts`. Hoy lo cumplen `POST /seller-requests` y `PATCH /admin/seller-requests/:id`. Su funcionamiento bajo concurrencia real se validó en un PostgreSQL 17 local (14 de 14 pruebas, sección 6); **no se ha comprobado a través del pooler de Supabase**. Sin índice por `sellerId`. Las 3 solicitudes abiertas posibles por persona no son un límite de peticiones. |
| **Sin límite de peticiones** | Ningún endpoint del api tiene rate limiting, incluido el público `GET /postal-codes/:code`. Pendiente para la Etapa 6. |
| **`sharp`** | Librería nativa: el despliegue debe instalar sus binarios en la plataforma destino y probarse antes del lanzamiento. |
| **Catálogo de códigos postales** | Sin él, `GET /postal-codes/:code` da 404 y guardar una propiedad falla con 422. Hoy está cargado en el proyecto `cosave`. En cualquier BD nueva hay que correr `pnpm --filter @cosave/api db:postal-codes <MX.txt>`. |
| **Catálogo de hasta 500** | El web aún filtra en el cliente; con muchas propiedades se vuelve lento hasta que use `/properties/search`. |
| **Cobertura baja** | Gran parte de la lógica de negocio no tiene pruebas automáticas. |
| **Llamadas repetidas al api (H4, 12-nov-2026)** | Medido en `/home`: `/me`, `/favorites` y `/notifications` se piden **una vez** por carga. Repeticiones reales y pequeñas: `/me` una vez por componente que usa `useProfile` (cabecera, panel admin, modal «Me interesa»; no se comparte como sí hace `favorites`); y las listas del admin se piden dos veces, probablemente por el doble efecto de React en desarrollo (sin confirmar con un build de producción). **No es un problema hoy** y se decidió no optimizar ni añadir React Query ni otra caché. El consumo que sí pesa es `/properties/catalog` (hasta 500 propiedades en cada pantalla que lo usa), que se resuelve al migrar el web a `/properties/search*`. Revisar si aparece lentitud real. Si algún día se comparte `/me`, hay que separarlo por usuario y refrescarlo al editar el perfil o cambiar de rol. |
| **Correos `pending` acumulados** | Hay avisos del canal `email` en `pending` (hoy 4, de propiedades de prueba) que nunca se enviaron. Al integrar Resend (M4) hay que decidir si se envían o se descartan, para no mandar correos viejos de golpe. |
| **Documentación desactualizada** | Corregidas las discrepancias conocidas (sección 11). `docs/DESIGN.md` y `docs/CONTRIBUTING.md` no se revisaron. |
| **Dependencia del correo** | Los avisos por email dependen de elegir e integrar Resend. |

## 10. Próximas actividades recomendadas

En orden sugerido. Cada una requiere autorización explícita antes de empezar.

0. **Panel admin (PR #9):** aprobar y retirar una propiedad se comprobaron con datos reales el 12-nov-2026 (recorrido M0). **Falta la vista móvil del admin**, que se probará a mano en el navegador. La cuenta del administrador conserva `COS-001003` rechazada con un aviso de prueba y `COS-001004` retirada (con su foto) como dato de prueba conservado a propósito.
1. **Recorrido manual autenticado (M0, 12-nov-2026):** publicar con foto, enviar a revisión, aprobar, retirar, favoritos, guardar una búsqueda, mapa y las pantallas del perfil funcionaron. **Siguen sin comprobarse:** Ctrl+rueda y gestos táctiles del mapa, enviar una consulta real y ver la bandeja del dueño (necesitan una segunda cuenta real), el correo de confirmación de cuenta y la recuperación de contraseña. 🧪
2. **Correcciones H1, H2, H3 y H5: terminadas e integradas.** Entraron en `main` con el PR #12 (`ffeba71`, 13-nov-2026): `e8aada3` (H1+H2), `fbe0a35` (H3) y `0cf5d95` (H5). No queda nada pendiente de push ni de PR. La rama `feature/primera-etapa` se borró y la contraseña de la base se rotó el 15-nov-2026 (ver sección 9); queda por comprobar que la API conecte con la nueva y que esté actualizada en todo servicio que la use.
3. **M2b (api implementado y auditado):** probar `/properties/search*` contra Supabase y migrar el web para consumirlos. La devDependency `@electric-sql/pglite` se conserva.
4. Alternativa a M2: **comparador de propiedades** (Etapa 4), tras decidir dónde se guarda.
5. **Pruebas automáticas** de `property-service` y de las rutas principales, antes de seguir con funciones nuevas.
6. Etapa 5: flujo de **asesores** y avisos por **email**.
7. Etapa 6: **rate limiting**, respaldos y revisión de seguridad.
8. **Mejoras del panel admin** (de la planificación del 5-nov): paginación y filtro por rol en usuarios y solicitudes, pantalla de bitácora, y revisión atómica de publicaciones (evita que dos admins revisen a la vez; toca el api). Menores de la auditoría: el panel no abre con `?ver=` de una propiedad fuera de la página cargada, un motivo de solo puntos queda vacío en el aviso, «Rechazar» y «Retirar» perdieron el rojo al pasar el cursor y los estilos de los chips están duplicados.
9. **Diseño móvil (pendiente; módulo posterior a M1, no implementar antes).** Hallazgos de las capturas del admin en ~600 px (12-nov-2026): (a) las tablas de Propiedades, Usuarios y Solicitudes conservan su ancho de escritorio y se desplazan en horizontal (en Usuarios el nombre queda cortado; en Propiedades se pierde el nombre al ver Acciones) → mostrar cada fila como tarjeta por debajo de ~768 px; (b) el cajón del menú oculta «Configuración» en pantallas bajas y tapa «Cerrar sesión» → compactar la cabecera y dejar el pie fijo; (c) los chips de estado ocupan 4 líneas → una fila con desplazamiento o un selector. **También falta revisar las pantallas públicas en móvil** (portada, listado, ficha, publicar, perfil), que no se han revisado.
10. **Otros pendientes anotados el 12-nov-2026:** ocultar «Me interesa» al dueño de la propiedad (mejora aparte, no incluida en la corrección de H1); y `EditableField` conserva props sin uso (`options`, `optional`, `onEditing`) tras H3, por decisión expresa de no limpiarlas ahora.
11. **H5, error de hidratación de `PropertiesExplorer`: corregido el 12-nov-2026** (commit `0cf5d95`). Causa: `useCatalog` leía una variable de módulo en el render inicial y, si el catálogo llegaba antes de que el explorador se hidratara (está dentro de un `Suspense`), el cliente no coincidía con el HTML del servidor («Cargando propiedades…»). Corrección: `useSyncExternalStore` con un snapshot de servidor «no listo» (`lib/use-catalog.ts`). Limitación documentada en la sección 6: la carrera no se reprodujo en la app real tras la corrección y la prueba depende de un arnés determinista.
12. **M1 «Quiero vender» (Etapa 5): etapa 1 integrada en `main` con el PR #14 (15-nov-2026); etapas 2 a 6 sin empezar.** Significado: `SellerRequest` es una **solicitud general de atención del cliente**, no un expediente de una propiedad; `self_publish` no publica nada, `find_agent` pide un asesor y `services` pide información, sin confirmar contrataciones ni pagos (ver `docs/API.md`). **Pendiente de la etapa 1:** comprobar el candado a través del pooler de Supabase (sección 6; la concurrencia real ya se validó en un PostgreSQL local); esto permite revisar el cambio, pero **no equivale a validar su uso con clientes**. **Decisión del 15-nov-2026 sobre `assigned` y `agentId`:** se mantiene el comportamiento actual; `assigned` es solo una etiqueta («En proceso»), el `PATCH` del admin no asigna asesor ni toca `agentId`, y la etiqueta no asigna automáticamente a nadie. Su significado funcional **debe resolverse antes de implementar las pantallas** (etapa 3); se recomienda decidirlo también antes de redactar los avisos de la etapa 2, porque afecta a su texto. Se implementa por etapas, cada una con autorización explícita: (1) API, validaciones, permisos y pruebas; (2) avisos `in_app` al administrador y al solicitante; (3) pantalla `/quiero-vender`; (4) «Mis solicitudes» en el perfil; (5) panel admin; (6) pruebas completas y documentación. Decisiones: `open` y `assigned` cuentan como abiertas; una por tipo y persona (candado transaccional, sin migración); `closed` permite otra; cualquier cuenta con sesión puede solicitar; solo avisos `in_app`, sin correo ni enlaces; estados visibles Pendiente / En proceso / Cerrada; «Mis solicitudes» filtra solo por el usuario del token; reabrir una solicitud con otra abierta del mismo tipo da error claro. Las pruebas de aislamiento entre usuarios necesitan una segunda cuenta real, a coordinar con el equipo.

## 11. Discrepancias de documentación detectadas

Se detectaron cuatro al recopilar este estado y **se corrigieron el 3 de noviembre de 2026** (sin commit todavía):

- `docs/DATABASE.md`: ya no dice "borrador de Fase 0"; incluye la tabla «Estado de las migraciones» (13 en el repositorio, 8 comprobadas como aplicadas, 5 no consultadas).
- El diagrama ER de `docs/DATABASE.md` ya incluye `PropertyStatusEvent` (relacionada con `Property`) y `PostalCode` y `AuditLog` como tablas sin clave foránea.
- `docs/ARCHITECTURE.md`: la ruta es `/properties`.
- `README.md`: ya menciona `PROJECT_STATUS.md` (estructura, roadmap y documentación adicional) y reemplazó "Versión 1.0 (Fase 0)" por el estado del MVP.

Sin discrepancias abiertas conocidas entre `README.md`, este archivo y `docs/`. No se revisó `docs/DESIGN.md` ni `docs/CONTRIBUTING.md`.

## 12. Documentación relacionada

`README.md` · `AGENTS.md` / `CLAUDE.md` (reglas) · `docs/ARCHITECTURE.md` · `docs/DATABASE.md` · `docs/API.md` · `docs/DECISIONS.md` · `docs/DESIGN.md` · `docs/CONTRIBUTING.md`.
