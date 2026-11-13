# Estado del proyecto COSAVE

**Última actualización:** 12 de noviembre de 2026. Las verificaciones de la sección 5 son del 2 de noviembre; las pruebas de la sección 6, del 2 al 5 de noviembre y del 12 de noviembre (bloque «Ejecutadas el 12-nov-2026») · **Rama de trabajo:** `fix/h1-h2-contacto-y-fechas`, creada desde `main`, con tres commits ya confirmados (`e8aada3` H1+H2, `fbe0a35` H3, `0cf5d95` H5) y esta actualización de la documentación como cuarto commit; sin push. `main` y `origin/main` están en `bf72815` (PR #11, solo documentación). Lo último de código que entró en `main` es el PR #9 (`feature/admin-rediseno`: rediseño del panel admin, panel de revisión de propiedades y avisos `in_app` al dueño). El PR #7 (`integracion/m0a-rediseno`: rediseños de publicación y perfil, y M2b) y el PR #8 también están en `main`.

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
| `admin` | Usuarios, roles, bitácora, cola de revisión de propiedades. Al aprobar, rechazar o retirar, avisa al dueño con un aviso `email` (queda `pending`: aún no hay envío de correos) y uno `in_app` (`lib/review-notifications.ts`, 7 pruebas ✅); el `in_app` solo enlaza a la ficha si se aprobó | 📄 (la bitácora y el cambio de rol tienen la tabla `AuditLog` en la BD ✅). El rechazo y su aviso en la campana se comprobaron con datos reales el 5-nov-2026 ✅; aprobar y retirar solo por pruebas unitarias |
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
- **Qué hacer con las ramas que quedan:** `feature/primera-etapa` (local y remota) **no está fusionada en `main`** y no se revisó su contenido; `backup/main-antes-de-integrar` (solo local) es una copia de seguridad previa a una integración. Decidir si se conservan, se fusionan o se borran. Las demás ramas ya fusionadas (`integracion/m0a-rediseno`, `feature/admin-rediseno`, `docs/estado-post-admin-rediseno` y siete `feature/*` anteriores) se borraron el 5-nov-2026, en local y en `origin`; sus commits siguen en `main`.

## 9. Riesgos y dependencias

| Riesgo / dependencia | Detalle |
|---|---|
| **Cambios sin commit** | Solo esta documentación (cuarto commit) en la rama `fix/h1-h2-contacto-y-fechas`; H1+H2 (`e8aada3`), H3 (`fbe0a35`) y H5 (`0cf5d95`) ya están confirmados, sin push (el rediseño del panel y los avisos `in_app` ya están en `main`, PR #9). `AGENTS.md` figura como modificado solo por finales de línea (Turbo lo reescribe con `core.autocrlf=true`; el contenido es idéntico a `HEAD`) y no se confirma. La devDependency `@electric-sql/pglite` sigue pendiente de tu confirmación expresa. |
| **Rama sin integrar** | Una: `feature/primera-etapa` (local y remota) no está fusionada en `main`; no se revisó qué contiene. Las demás ramas de trabajo ya están en `main` (los PR #7 y #9 se fusionaron el 5-nov-2026, UTC). No hay verificaciones automáticas configuradas (el PR #9 mostró 0 checks); solo se corrieron a mano `typecheck`, `lint`, `build` y las pruebas del api. |
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
2. **Rama `fix/h1-h2-contacto-y-fechas`:** commits 1 a 3 confirmados (`e8aada3`, `fbe0a35`, `0cf5d95`); el cuarto es esta documentación. Falta decidir el PR hacia `main` y el push, que no se hacen sin autorización.
3. **M2b (api implementado y auditado):** probar `/properties/search*` contra Supabase y migrar el web para consumirlos. Confirmar antes la devDependency `@electric-sql/pglite`.
4. Alternativa a M2: **comparador de propiedades** (Etapa 4), tras decidir dónde se guarda.
5. **Pruebas automáticas** de `property-service` y de las rutas principales, antes de seguir con funciones nuevas.
6. Etapa 5: flujo de **asesores** y avisos por **email**.
7. Etapa 6: **rate limiting**, respaldos y revisión de seguridad.
8. **Mejoras del panel admin** (de la planificación del 5-nov): paginación y filtro por rol en usuarios y solicitudes, pantalla de bitácora, y revisión atómica de publicaciones (evita que dos admins revisen a la vez; toca el api). Menores de la auditoría: el panel no abre con `?ver=` de una propiedad fuera de la página cargada, un motivo de solo puntos queda vacío en el aviso, «Rechazar» y «Retirar» perdieron el rojo al pasar el cursor y los estilos de los chips están duplicados.
9. **Diseño móvil (pendiente; módulo posterior a M1, no implementar antes).** Hallazgos de las capturas del admin en ~600 px (12-nov-2026): (a) las tablas de Propiedades, Usuarios y Solicitudes conservan su ancho de escritorio y se desplazan en horizontal (en Usuarios el nombre queda cortado; en Propiedades se pierde el nombre al ver Acciones) → mostrar cada fila como tarjeta por debajo de ~768 px; (b) el cajón del menú oculta «Configuración» en pantallas bajas y tapa «Cerrar sesión» → compactar la cabecera y dejar el pie fijo; (c) los chips de estado ocupan 4 líneas → una fila con desplazamiento o un selector. **También falta revisar las pantallas públicas en móvil** (portada, listado, ficha, publicar, perfil), que no se han revisado.
10. **Otros pendientes anotados el 12-nov-2026:** ocultar «Me interesa» al dueño de la propiedad (mejora aparte, no incluida en la corrección de H1); y `EditableField` conserva props sin uso (`options`, `optional`, `onEditing`) tras H3, por decisión expresa de no limpiarlas ahora.
11. **H5, error de hidratación de `PropertiesExplorer`: corregido el 12-nov-2026** (commit `0cf5d95`). Causa: `useCatalog` leía una variable de módulo en el render inicial y, si el catálogo llegaba antes de que el explorador se hidratara (está dentro de un `Suspense`), el cliente no coincidía con el HTML del servidor («Cargando propiedades…»). Corrección: `useSyncExternalStore` con un snapshot de servidor «no listo» (`lib/use-catalog.ts`). Limitación documentada en la sección 6: la carrera no se reprodujo en la app real tras la corrección y la prueba depende de un arnés determinista.
12. **M1 «Quiero vender» (Etapa 5): aprobado, a implementar por etapas** tras confirmar el cuarto commit y comprobar la rama `feature/m1-quiero-vender`: (1) API, validaciones, permisos y pruebas; (2) avisos `in_app` al administrador y al solicitante; (3) pantalla `/quiero-vender`; (4) «Mis solicitudes» en el perfil; (5) panel admin; (6) pruebas completas y documentación. Decisiones: `open` y `assigned` cuentan como abiertas; una por tipo y persona (candado transaccional, sin migración); `closed` permite otra; cualquier cuenta con sesión puede solicitar; solo avisos `in_app`, sin correo ni enlaces; estados visibles Pendiente / En proceso / Cerrada; «Mis solicitudes» filtra solo por el usuario del token; reabrir una solicitud con otra abierta del mismo tipo da error claro. Las pruebas de aislamiento entre usuarios necesitan una segunda cuenta real, a coordinar con el equipo.

## 11. Discrepancias de documentación detectadas

Se detectaron cuatro al recopilar este estado y **se corrigieron el 3 de noviembre de 2026** (sin commit todavía):

- `docs/DATABASE.md`: ya no dice "borrador de Fase 0"; incluye la tabla «Estado de las migraciones» (13 en el repositorio, 8 comprobadas como aplicadas, 5 no consultadas).
- El diagrama ER de `docs/DATABASE.md` ya incluye `PropertyStatusEvent` (relacionada con `Property`) y `PostalCode` y `AuditLog` como tablas sin clave foránea.
- `docs/ARCHITECTURE.md`: la ruta es `/properties`.
- `README.md`: ya menciona `PROJECT_STATUS.md` (estructura, roadmap y documentación adicional) y reemplazó "Versión 1.0 (Fase 0)" por el estado del MVP.

Sin discrepancias abiertas conocidas entre `README.md`, este archivo y `docs/`. No se revisó `docs/DESIGN.md` ni `docs/CONTRIBUTING.md`.

## 12. Documentación relacionada

`README.md` · `AGENTS.md` / `CLAUDE.md` (reglas) · `docs/ARCHITECTURE.md` · `docs/DATABASE.md` · `docs/API.md` · `docs/DECISIONS.md` · `docs/DESIGN.md` · `docs/CONTRIBUTING.md`.
