# COSAVE — Plataforma de Búsqueda y Coincidencia de Propiedades

## 🏠 ¿Qué es COSAVE?

COSAVE es una **plataforma inmobiliaria** donde las personas pueden buscar casas, terrenos y otras propiedades. Lo diferente es que si alguien **no encuentra lo que busca en el momento**, puede **guardar esa búsqueda** y el sistema le avisará automáticamente cuando aparezca una propiedad que cumpla sus criterios.

### El problema que resuelve

**Ejemplo real:**
- Juan busca una casa en Mérida con máximo presupuesto de $1,200,000.
- Hoy no hay resultados.
- Juan guarda esa búsqueda en COSAVE.
- Dos semanas después, alguien publica exactamente esa casa.
- **COSAVE detecta la coincidencia y le avisa a Juan automáticamente.**

Es como una "alerta de empleos" pero para propiedades: el sistema trabaja para el usuario aunque no esté buscando activamente.

---

## 🎯 Flujos principales del usuario

### 1. Comprador: Buscar una propiedad
```
Entro a COSAVE 
    → Busco (ubicación, precio, tipo)
    → Aplico filtros
    → Veo resultados
    → Guardo favoritos
    → Contacto al vendedor
```

### 2. Comprador: No encuentro lo que busco
```
No encuentro → Presiono "No encontré lo que busco"
    → Guardo mis criterios (tipo, ubicación, precio)
    → COSAVE busca coincidencias automáticamente
    → Me avisa cuando encuentra algo
    → Contacto al vendedor
```

### 3. Vendedor/Propietario: Quiero vender
```
Ingreso a COSAVE
    → "Quiero vender mi propiedad"
    → Opción A: Publico yo mismo la propiedad
    → Opción B: Busco un asesor inmobiliario
    → Opción C: Solicito servicios (fotos, video, etc.)
```

### 4. Asesor inmobiliario: Conseguir clientes
```
Creo perfil profesional
    → Subo mis propiedades
    → Recibo solicitudes de personas que quieren vender
    → Me conectan con compradores interesados
```

---

# Stack

| Capa | Tecnología |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS, Radix UI, React Query, React Three Fiber (Three.js) |
| **Backend** | Express 5, TypeScript, Prisma 6, Supabase Storage, pdf-parse / DALL-E / OpenRouter |
| **DB** | PostgreSQL (Supabase) |
| **AI** | OpenRouter (chat/upsell/palette), DALL-E (logos) |
| **Payments** | Stripe o Conekta (tarjeta/OXXO/SPEI) |
| **Notificaciones** | WhatsApp Business API + Email (Resend) + Push |
| **Build** | pnpm workspaces + Turborepo + esbuild |

## 📁 Estructura del proyecto

```
cosave/
├── apps/
│   ├── web/                 # Next.js 16 (puerto 5300)
│   └── api/                 # Express 5 + Prisma 6 (puerto 3300)
│       ├── src/{routes,controllers,middleware,lib}
│       └── prisma/schema.prisma
├── packages/shared/         # Enums y esquemas zod compartidos
├── docs/                    # ARCHITECTURE, DATABASE, API, DECISIONS, CONTRIBUTING
├── AGENTS.md  CLAUDE.md     # Reglas del proyecto
├── turbo.json  pnpm-workspace.yaml  .env.example
```

---

## 🚀 Cómo empezar

Requisitos: **Node 22+**, **pnpm 11** (`corepack enable`) y PostgreSQL (local o Supabase).

```bash
pnpm install
cp .env.example apps/api/.env        # completa los valores; igual para apps/web/.env.local
pnpm dev                              # web http://localhost:5300 · api http://localhost:3300/health
```

Otros comandos: `pnpm build`, `pnpm lint`, `pnpm typecheck`. Aplicar la BD: `pnpm --filter @cosave/api db:migrate` (con `DATABASE_URL` configurada). Primer admin: ver `docs/CONTRIBUTING.md`.

---

## 📊 Modelo de datos (explicado simple)

### Las 4 entidades principales

#### 1. **USERS** (Usuarios)
Quiénes usan COSAVE. Cada usuario tiene:
- Email
- Contraseña (guardada de forma segura)
- Nombre
- Tipo de usuario (comprador, vendedor, asesor, admin)

#### 2. **PROPERTIES** (Propiedades)
Las casas, terrenos, etc. que se venden/rentan. Cada propiedad tiene:
- ID único (COS-000001)
- Tipo (casa, terreno, departamento, etc.)
- Ubicación (ciudad, zona, coordenadas)
- Precio
- Características (habitaciones, baños, etc.)
- Imágenes
- Descripción

#### 3. **FAVORITES** (Favoritos)
Relación entre usuarios y propiedades que guardaron.
- Qué usuario guardó
- Qué propiedad guardó
- Cuándo la guardó

#### 4. **USER_REQUESTS** (Solicitudes/Búsquedas guardadas)
Cuando un usuario dice "no encontré, pero busco esto":
- Tipo de propiedad
- Ubicación
- Precio máximo
- Características deseadas
- El sistema compara esto con nuevas propiedades y avisa

**Otras entidades importantes:**
- **PROFESSIONALS**: Asesores inmobiliarios
- **PROPERTY_IMAGES**: Fotos de propiedades
- **PROPERTY_FEATURES**: Características (habitaciones, baños, etc.)
- **PROPERTY_LOCATIONS**: Información de ubicación

---

## 🗺️ Etapas de desarrollo (Roadmap)

Contrastado con el *Documento Técnico-Funcional y Modelo de Negocio* (secciones 20 y 44). Las etapas 1–6 son el MVP; las fases A–C son el crecimiento posterior al lanzamiento.

### MVP

| Etapa | Qué se hace | Estado |
|---|---|---|
| **Fase 0** | Arquitectura, planos, stack | ✅ Completa |
| **Etapa 1** | Base de datos, usuarios, roles, admin | 🔄 Código listo; falta aplicar migración y probar con Supabase. Falta: registro de acciones importantes (auditoría) y respaldos |
| **Etapa 2** | Publicar propiedades, fotos, revisión | 🔄 Código listo (publicar, fotos, revisión, Mis propiedades, panel admin, estados, aviso de duplicados); falta aplicar migraciones, crear el bucket y probar con Supabase. Falta: videos / recorridos virtuales, tipos *local, oficina, bodega, rancho* y amenidades |
| **Etapa 3** | Buscador, filtros, resultados, mapa | 🔄 Listado, ficha, portada y mapa leen del api; falta paginar/filtrar en el servidor (hoy el catálogo carga hasta 500), filtrar por zona/estado/características y por el área visible del mapa |
| **Etapa 4** | Favoritos, comparador, contacto | 🔄 Favoritos y consultas hechos (falta aplicar migración). **Falta el comparador** |
| **Etapa 5** | "No encontré lo que busco", asesores, "Quiero vender" | 🔄 Búsquedas guardadas hechas ("Guardar mi búsqueda" cuando no hay resultados y "Mis búsquedas guardadas" en el perfil). Tablas ya modeladas (`SearchMatch`, `SellerRequest`, `Professional`, `Notification`); faltan: matching de búsquedas guardadas, perfil y alta de asesor (con revisión COSAVE), directorio de asesores (el cliente elige), solicitudes de venta/servicios, leads para asesores, avisos por email (Resend) |
| **Etapa 6** | Pruebas, seguridad, lanzamiento | ⏳ Pruebas automáticas, permisos de documentos, respaldos, auditoría, correcciones y lanzamiento |

### Después del MVP (modelo de negocio)

| Fase | Qué se hace | Estado |
|---|---|---|
| **A — Monetización inicial** | Publicación destacada, planes de asesor (básico/profesional/premium), pagos (Stripe o Conekta), servicios seleccionados | ⏳ Sin iniciar; requiere decidir pasarela (ver `docs/DECISIONS.md`) |
| **B — Consolidación** | Verificación de propiedad (3 niveles), prospectos de pago, marketplace de servicios, inmobiliarias / desarrolladores (COSAVE PRO), publicidad, WhatsApp y push | ⏳ |
| **C — Escalamiento** | Capa de integraciones (conectores, normalizador, `Source`, `ImportLog`), detección de duplicados y "Ver otras publicaciones", app móvil, IA (lenguaje natural, precio sugerido), inteligencia de mercado | ⏳ Hoy solo hay base: código `COS-` y aviso de posible duplicado al publicar |

### Hecho vs. pendiente respecto al documento

- **Cubierto:** usuarios y roles (comprador, vendedor, asesor, admin), propiedades con ubicación/características/fotos, ID `COS-000001`, flujo de publicación con revisión y estados, favoritos, contacto, mapa, panel admin (usuarios, propiedades, solicitudes), arquitectura API-first.
- **Brecha principal del MVP:** la función estratégica *"Estoy buscando una propiedad / No encontré lo que busco"* y el flujo de asesores (Etapa 5), más el comparador (Etapa 4).
- **Brechas de modelo de datos:** `PROPERTY_SOURCES`, `PROPERTY_VERIFICATION`, `PROFESSIONAL_SERVICES/AREAS`, `LEADS/LEAD_ASSIGNMENTS`, `SOURCES`, `IMPORT_LOGS`, y operación de estado comercial "apartada".

---|---|---|
| **Fase 0** | Arquitectura, planos, stack | ✅ Completa |
| **Etapa 1** | Base de datos, usuarios, admin | 🔄 Código listo; falta aplicar migración y probar con Supabase |
| **Etapa 2** | Publicar propiedades, fotos | 🔄 Código listo (publicar, fotos, revisión, Mis propiedades, panel admin); falta aplicar migraciones, crear el bucket y probar con Supabase |
| **Etapa 3** | Buscador, filtros, resultados | 🔄 Listado, ficha, portada y mapa ya leen del api; falta paginar/filtrar en el servidor |
| **Etapa 4** | Favoritos, comparador, contacto | 🔄 Favoritos y consultas hechos (falta aplicar migración y comparador) |
| **Etapa 5** | Asesores, solicitudes, matching | ⏳ |
| **Etapa 6** | Pruebas, seguridad, lanzamiento | ⏳ |

---

## 👥 Guía para colaboradores

### Antes de escribir código

1. **Lee este README** completamente.
2. **Lee CLAUDE.md** (reglas del proyecto).
3. **Revisa la etapa actual** en el roadmap (qué se está haciendo).
4. **Pregunta primero** si no entiendes qué hacer.

### Regla de oro: Concepto primero, código después

Para cada parte nueva:
1. ¿Qué problema resuelve? (explicar simple)
2. ¿Cómo se guarda en la BD? (tablas, relaciones)
3. **Recién ahí** → escribir código

No avances a código hasta entender el concepto.

### Cómo hacer un cambio en el código

```bash
# 1. Actualizar tu código local
git pull origin main

# 2. Crear una rama nueva (no tocar main directamente)
git checkout -b feature/mi-nueva-funcionalidad

# 3. Hacer cambios y probar

# 4. Guardar cambios
git add .
git commit -m "Agregué búsqueda por ubicación"

# 5. Subir cambios
git push origin feature/mi-nueva-funcionalidad

# 6. Crear un Pull Request en GitHub para que otros revisen
```

---

## 🐛 Reportar problemas

Si encuentras un bug o error:

1. Describe **qué pasó** (¿qué hiciste?, ¿qué se rompió?)
2. Explica **cómo reproducir el error** (pasos)
3. Comparte **qué esperabas** que pasara
4. Abre un "Issue" en GitHub

---

## 📖 Documentación adicional

- **[DATABASE.md](./docs/DATABASE.md)** — Explicación detallada de todas las tablas
- **[API.md](./docs/API.md)** — Listado de endpoints y cómo usarlos
- **[CLAUDE.md](./CLAUDE.md)** — Reglas para colaborar con IA
- **[CONTRIBUTING.md](./docs/CONTRIBUTING.md)** — Guía completa para contribuyentes

---

## 💡 Principios del proyecto

1. **Comenzar simple, estar preparado para crecer** — No hacemos todo a la vez, pero el diseño permite escalar.
2. **API-first** — El frontend y la app móvil (futura) hablan con el mismo backend.
3. **Concepto primero, código después** — Entender antes de programar.
4. **Preparado para integraciones** — Aunque hoy solo tengamos propiedades propias, el sistema está listo para conectar otras fuentes.

---

## ❓ Preguntas frecuentes

**¿Tengo que saber programación para contribuir?**
No necesariamente. Puedes ayudar con:
- Documentación
- Diseño (UI/UX)
- Testing (probar que todo funcione)
- Reportar bugs

**¿Puedo trabajar en lo que quiera?**
No. Revisa la etapa actual del roadmap y coordina. Así evitamos conflictos.

**¿Cuánto tiempo toma cada etapa?**
Depende de la complejidad. Etapa 1 (fundamentos): 2-3 semanas. Etapa 3 (búsqueda): 3-4 semanas.

**¿Quién revisa mi código?**
Los colaboradores del proyecto antes de que se "merge" a main.

---

## 📞 Contacto

- **Issues/Bugs**: Abre un "Issue" en GitHub
- **Preguntas**: Abre una "Discussion" o contacta al lead del proyecto
- **Sugerencias**: Envía un email o abre una "Discussion"

---

## 📄 Licencia

Este proyecto está bajo licencia [elegir: MIT, Apache 2.0, etc.].

---

**Última actualización:** Octubre 2026
**Versión:** 1.0 (Fase 0)
