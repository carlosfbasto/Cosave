# API

Base: `/api/v1` · JSON · auth con `Authorization: Bearer <jwt de Supabase>`.
Implementado: `GET /health` (fuera de `/api/v1`) y los endpoints marcados ✅. El resto está **planeado**.

## Errores
```json
{ "error": { "code": "not_found", "message": "Ruta no encontrada" } }
```
Códigos: `unauthorized` 401 · `forbidden` 403 · `not_found` 404 · `unavailable` / `own_property` / `account_conflict` / `invalid_transition` / `locked` / `limited` / `possible_duplicate` 409 · `too_large` 413 · `validation` / `incomplete` / `invalid_image` / `blurry_image` / `unknown_postal_code` / `too_many_images` 422 · `internal` 500.

Respuestas exitosas: `{ "data": ..., "meta": ... }`. Error de validación: 422 con `details`.

## Acceso: público vs. cuenta
- **Público (sin registro):** ver y buscar propiedades — `GET /properties`, `GET /properties/:code`; consultar códigos postales — `GET /postal-codes/:code`.
- **Requiere cuenta:** contactar al vendedor, favoritos, guardar búsquedas, publicar y pedir asesor/servicios, perfil y admin.

## Endpoints

| Etapa | Método y ruta | Descripción |
|---|---|---|
| 1 ✅ | `GET /me` · `PATCH /me` | Perfil propio (`fullName`, `phone`). El Profile se crea solo en el primer acceso |
| 1 ✅ | `GET /admin/users?page&pageSize&role&q` | Listar usuarios (solo admin) |
| 1 ✅ | `PATCH /admin/users/:id/role` | Cambiar rol (solo admin; no el propio). Queda en la bitácora |
| 1 ✅ | `GET /admin/audit?entityType&entityId&actorId&action&page&pageSize` | Bitácora de acciones (solo admin), más recientes primero, con `actor` (nombre y correo) |
| 2 ✅ | `GET /me/properties` · `POST /me/properties` · `GET/PATCH /me/properties/:id` | Mis propiedades (todos los estados). Crear exige solo `operation` y `type`: un borrador puede estar incompleto. Una ajena responde 404. Editar según estado: borrador/rechazada todo; publicada/pausada solo precio, descripción y características (409 `limited`); pendiente/vendida/rentada/retirada nada (409 `locked`). `type` admite también `commercial_warehouse` e `industrial_warehouse`. Campos opcionales: `maintenanceFee` (cuota mensual; solo departamentos o propiedades en privada, si no aplica se borra), `amenities` y `materials` (listas de claves del catálogo de `packages/shared`; las claves desconocidas dan 422 `validation` y las que no aplican al tipo se descartan). En publicada/pausada también se editan `maintenanceFee`, `amenities` y `materials` |
| 2 ✅ | `POST /me/properties/:id/submit` | Envía a revisión; valida lo obligatorio y exige ≥1 foto (422 `incomplete`). Con coincidencias responde 409 `possible_duplicate` + `details.codes`; se reenvía con `{ confirmDuplicate: true }`. Nunca borra nada |
| 2 ✅ | `POST /me/properties/:id/status` | `{ to }`: pausar, reactivar, `sold`/`rented`, `archived`, `draft`. Solo transiciones válidas (409 `invalid_transition`) |
| 2 ✅ | `POST /me/properties/:id/images` · `DELETE …/images/:imageId` · `PATCH …/images/:imageId/cover` | Fotos: el cuerpo es el archivo (una por petición), JPG/PNG/WebP detectado por contenido, 8 MB, máx. 10. Rechaza fotos borrosas (422 `blurry_image`): misma medida que hace el navegador antes de subir (`SHARPNESS` y `laplacianVariance` en `packages/shared`, mínimo 50) |
| 2 ✅ | `GET /postal-codes/:code` | **Público.** Estado, ciudad, `municipality`, colonias, `center` (centro aproximado) y `bounds` (recuadro del municipio, para encuadrarlo en el mapa) de un código postal (catálogo GeoNames); 404 si no existe. Al guardar una propiedad el api toma estado y ciudad de su código postal (422 `unknown_postal_code` si no existe) |
| 2 ✅ | `GET /admin/properties?status=pending` · `POST /admin/properties/:id/review` · `POST /admin/properties/:id/archive` | Cola de revisión; `{ decision: "approve"|"reject", note }` (el motivo es obligatorio al rechazar) y retiro con `{ note }` obligatorio. Cada acción avisa al dueño con dos avisos del mismo texto: uno `email` (queda `pending` hasta que exista el envío de correos) y uno `in_app` (`sent`, lo ve en la campana; solo lleva `matchPropertyId` si se aprobó, porque una publicación rechazada o retirada no tiene ficha pública a la que llevarlo). Al aprobar, avisa también en la app a quien tenga una búsqueda guardada que coincida |
| 2 ✅ | `PATCH /inquiries/:id` | El anunciante marca una consulta recibida como `answered` |
| 3 ✅ (básico) | `GET /properties` | **Público.** Solo `published`; filtros `operation, type, city, minPrice, maxPrice`, paginación |
| 3 ✅ | `GET /properties/catalog` | **Público.** Todo lo publicado (máx. 500), con fotos y coordenadas; la web filtra y cuenta (portada, ficha, buscadores y favoritos lo siguen usando) |
| 3 ✅ (M2a) | `GET /properties/search` | **Público.** Lista paginada con filtros, texto libre y orden en el servidor. Ver «Búsqueda en el servidor». Aún no la consume la web (M2c). Facets y mapa (`/search/facets`, `/search/map`) llegan en M2b |
| 3 ✅ | `GET /properties/:code` | **Público.** Detalle y `status` (pausada, vendida… la ficha avisa que ya no está disponible); borrador, pendiente y rechazada responden 404 |
| 4 ✅ | `GET /favorites` | Mis favoritos, con el `status` actual de cada propiedad. Requiere cuenta |
| 4 ✅ | `PUT /favorites/:code` · `DELETE /favorites/:code` | Guardar (idempotente, sin duplicados; 409 `unavailable` si no está publicada) / quitar |
| 4 ✅ | `POST /properties/:code/contact` | "Me interesa": body `{ message, contactName, contactEmail, contactPhone }`. 201; 409 `unavailable` si no está publicada o `own_property` si es tuya |
| 4 ✅ | `GET /inquiries?property=` | Mis consultas enviadas (opcional: solo de una propiedad) |
| 4 ✅ | `GET /inquiries/received` | Consultas recibidas en mis propiedades (con los datos de contacto compartidos) |
| 5 ✅ | `GET /saved-searches` | Mis búsquedas guardadas activas (más recientes primero). Requiere cuenta |
| 5 ✅ | `POST /saved-searches` · `DELETE /saved-searches/:id` | Guardar criterios `{ operation, propertyType?, state?, city?, minPrice?, maxPrice? }` (201) / eliminar una búsqueda propia |
| 5 ✅ | `GET /notifications?limit` | Mis avisos `in_app`, más recientes primero: coincidencias de búsquedas guardadas y resultado de la revisión de mis publicaciones (aprobada, rechazada o retirada, con el motivo). `propertyCode` viene en las coincidencias y en las aprobaciones; en rechazos y retiros es `null`. `meta.unread` = sin leer. Requiere cuenta |
| 5 ✅ | `PATCH /notifications/:id/read` · `POST /notifications/read-all` · `DELETE /notifications/:id` | Marcar uno o todos como leídos (204) / eliminar uno propio (204; 404 si no es tuyo) |
| 5 | `GET /professionals` · `POST /seller-requests` | Asesores y solicitudes |

## Búsqueda en el servidor (`GET /properties/search`)

**Público.** Solo propiedades `published`. `GET /properties` y `GET /properties/catalog` no cambian; este endpoint es nuevo y lo usará el explorador de `/properties` (M2c). Cualquier valor inválido responde 422 `validation`.

**Parámetros** (todos opcionales). Los repetibles aceptan `?city=A&city=B` o un solo valor.

| Parámetro | Regla |
|---|---|
| `page` / `pageSize` | Entero ≥ 1 (máx. 100.000) / 1–50, por defecto 12 |
| `sort` | `recent` (defecto, más recientes primero) · `price_asc` · `price_desc`. El orden es estable: desempata por fecha de alta y por id, así las páginas no repiten ni omiten filas |
| `operation` | `sale` o `rent` |
| `type` | Repetible (máx. 10): `house`, `apartment`, `land`, `commercial`, `commercial_warehouse`, `industrial_warehouse`, `other` |
| `state`, `city`, `zone` | Repetibles (máx. 20), hasta 100 caracteres. Ver «Identidad de una ubicación» |
| `minPrice`, `maxPrice` | MXN, ≥ 0, incluyen los extremos. `minPrice` > `maxPrice` da 422. La conversión de USD la hace la web |
| `minBedrooms`/`maxBedrooms`, `minBathrooms`/`maxBathrooms`, `minBuilt`/`maxBuilt`, `minLand`/`maxLand` | Número ≥ 0, incluyen los extremos |
| `q` | Texto libre, hasta 100 caracteres. Ver «Texto libre» |

**Respuesta:** `{ "data": [...], "meta": { "page", "pageSize", "total", "totalPages" } }`. Cada elemento de `data` tiene la misma forma que `GET /properties/catalog` (vista pública). `totalPages` es `ceil(total / pageSize)` con mínimo 1. Una página mayor a la última devuelve `data: []` con `total` y `totalPages` correctos. Cabecera `Cache-Control: public, max-age=15`.

**Valores por defecto heredados del explorador** (el servidor los replica para dar los mismos resultados que el filtrado que hoy hace el navegador):
- Recámaras y baños nulos cuentan como 0.
- La superficie construida usa `construida`, luego `terreno`, luego 0. El terreno nulo cuenta como 0.
- **Zona nula, vacía o de solo espacios = «Centro».** Es una **regla de presentación heredada del explorador, no un dato almacenado** de la propiedad (en la BD la zona sigue nula). Sirve para filtrar por zona y para el texto libre.

**Texto libre (`q`).** Interpreta palabras y precio ("casa en Mérida hasta 2 millones", "desde 800 mil", "20k"). Cada palabra debe aparecer en título, descripción, ciudad, tipo, zona, estado o las palabras de la operación (renta/rentar/alquiler, venta/vender/comprar). Sin acentos ni mayúsculas ("merida" encuentra Mérida). Plurales: solo se quita la `s` final ("casas" → "casa"); **no** hay regla para `-es`. En la búsqueda libre `ñ` se pliega a `n` ("pena" encuentra Peña). Un precio dentro del texto se combina con `minPrice`/`maxPrice` por intersección (el mayor de los mínimos y el menor de los máximos). Un número menor a 1.000 en el texto se descarta (no se interpreta como recámaras).

**Identidad de una ubicación (`state`, `city`, `zone`).** Dos valores son el mismo lugar solo si tienen la misma clave (`locationKey`): se ignoran acentos, mayúsculas y los tramos de espacios repetidos; **`ñ` se conserva** (`Peña` ≠ `Pena`) y la puntuación distingue (`San Pedro` ≠ `San-Pedro`). Así `Tizimin` y `Tizimín` se encuentran con cualquiera de las dos escrituras. Se consideran espacios exactamente los caracteres Unicode `White_Space` (tabulador, saltos de línea, `U+0020`, `U+00A0`, `U+2000`–`U+200A`, `U+3000`, etc.); los caracteres de ancho cero (`U+200B`, `U+FEFF`) **no** lo son. Un valor cuya clave queda vacía (vacío, solo espacios) se rechaza con 422: nunca coincide con filas sin valor. La comparación se hace en el servidor con la misma tabla en TypeScript y en SQL.

**Seguridad.** Todo valor viaja como parámetro SQL (nada se concatena). No usa extensiones, columnas ni migraciones.
