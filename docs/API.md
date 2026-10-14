# API

Base: `/api/v1` · JSON · auth con `Authorization: Bearer <jwt de Supabase>`.
Implementado: `GET /health` (fuera de `/api/v1`) y los endpoints marcados ✅. El resto está **planeado**.

## Errores
```json
{ "error": { "code": "not_found", "message": "Ruta no encontrada" } }
```
Códigos: `unauthorized` 401 · `forbidden` 403 · `not_found` 404 · `unavailable` / `own_property` / `account_conflict` / `invalid_transition` / `locked` / `limited` / `possible_duplicate` 409 · `too_large` 413 · `validation` / `incomplete` / `invalid_image` / `too_many_images` 422 · `internal` 500.

Respuestas exitosas: `{ "data": ..., "meta": ... }`. Error de validación: 422 con `details`.

## Acceso: público vs. cuenta
- **Público (sin registro):** ver y buscar propiedades — `GET /properties`, `GET /properties/:code`.
- **Requiere cuenta:** contactar al vendedor, favoritos, guardar búsquedas, publicar y pedir asesor/servicios, perfil y admin.

## Endpoints

| Etapa | Método y ruta | Descripción |
|---|---|---|
| 1 ✅ | `GET /me` · `PATCH /me` | Perfil propio (`fullName`, `phone`). El Profile se crea solo en el primer acceso |
| 1 ✅ | `GET /admin/users?page&pageSize&role&q` | Listar usuarios (solo admin) |
| 1 ✅ | `PATCH /admin/users/:id/role` | Cambiar rol (solo admin; no el propio) |
| 2 ✅ | `GET /me/properties` · `POST /me/properties` · `GET/PATCH /me/properties/:id` | Mis propiedades (todos los estados). Crear exige solo `operation` y `type`: un borrador puede estar incompleto. Una ajena responde 404. Editar según estado: borrador/rechazada todo; publicada/pausada solo precio, descripción y características (409 `limited`); pendiente/vendida/rentada/retirada nada (409 `locked`) |
| 2 ✅ | `POST /me/properties/:id/submit` | Envía a revisión; valida lo obligatorio y exige ≥1 foto (422 `incomplete`). Con coincidencias responde 409 `possible_duplicate` + `details.codes`; se reenvía con `{ confirmDuplicate: true }`. Nunca borra nada |
| 2 ✅ | `POST /me/properties/:id/status` | `{ to }`: pausar, reactivar, `sold`/`rented`, `archived`, `draft`. Solo transiciones válidas (409 `invalid_transition`) |
| 2 ✅ | `POST /me/properties/:id/images` · `DELETE …/images/:imageId` · `PATCH …/images/:imageId/cover` | Fotos: el cuerpo es el archivo (una por petición), JPG/PNG/WebP detectado por contenido, 8 MB, máx. 10 |
| 2 ✅ | `GET /admin/properties?status=pending` · `POST /admin/properties/:id/review` | Cola de revisión; `{ decision: "approve"\|"reject", note }` (el motivo es obligatorio al rechazar) y avisa al dueño |
| 2 ✅ | `PATCH /inquiries/:id` | El anunciante marca una consulta recibida como `answered` |
| 3 ✅ (básico) | `GET /properties` | **Público.** Solo `published`; filtros `operation, type, city, minPrice, maxPrice`, paginación |
| 3 ✅ | `GET /properties/catalog` | **Público.** Todo lo publicado (máx. 500), con fotos y coordenadas; la web filtra y cuenta |
| 3 ✅ | `GET /properties/:code` | **Público.** Detalle y `status` (pausada, vendida… la ficha avisa que ya no está disponible); borrador, pendiente y rechazada responden 404 |
| 4 ✅ | `GET /favorites` | Mis favoritos, con el `status` actual de cada propiedad. Requiere cuenta |
| 4 ✅ | `PUT /favorites/:code` · `DELETE /favorites/:code` | Guardar (idempotente, sin duplicados; 409 `unavailable` si no está publicada) / quitar |
| 4 ✅ | `POST /properties/:code/contact` | "Me interesa": body `{ message, contactName, contactEmail, contactPhone }`. 201; 409 `unavailable` si no está publicada o `own_property` si es tuya |
| 4 ✅ | `GET /inquiries?property=` | Mis consultas enviadas (opcional: solo de una propiedad) |
| 4 ✅ | `GET /inquiries/received` | Consultas recibidas en mis propiedades (con los datos de contacto compartidos) |
| 5 | `POST/GET/DELETE /saved-searches` | Búsquedas guardadas |
| 5 | `GET /professionals` · `POST /seller-requests` | Asesores y solicitudes |
