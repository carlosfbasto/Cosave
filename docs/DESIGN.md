---
name: Architectural Precision Minimalist
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  metric-price:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  gutter-lg: 2rem
  margin: 2rem
  margin-mobile: 1rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

> **Nota de implementación (COSAVE):** los colores de la cabecera YAML (`primary: #000000`,
> `secondary: #006398`) contradicen el texto. Rigen **los colores descritos en el texto**
> (`#0F172A`, `#0284C7`, `#64748B`, `#F8FAFC`, `#E2E8F0`…). Los tokens viven en
> `apps/web/app/globals.css` (`@theme`). La interfaz es solo en modo claro.

## Brand & Style

The design system projects architectural discipline, restraint, and effortless credibility. Tailored for discerning property buyers, institutional investors, and premier developers, the interface functions like high-end editorial spatial design: vast breathing room, razor-sharp alignment, quiet confidence, and zero sensory overload.

The aesthetic fuses **Architectural Minimalism** with **Warm Editorial Pragmatism**:
- **Clarity over ornament:** Decorative elements are eliminated. Structural boundaries, crisp hairline dividers, and deliberate whitespace carry the interface.
- **Visual poise:** Photography takes precedence, framed by balanced typography and disciplined tonal surfaces.
- **Tactile serenity:** Interactions are subtle and responsive, inspiring trust through absolute visual predictability and refined transitions.

## Colors

The palette is anchored in architectural pigments: deep structural slate, refined cerulean accenting, and pristine, glare-free neutrals.

- **Primary (`#0F172A`):** Deep architectural navy. Used for core brand identity, primary call-to-action buttons, high-emphasis icons, and dominant headlines.
- **Secondary (`#0284C7`):** Slate azure. Reserved strictly for contextual accents, active interactive highlights, key data visualizations, and verified property badges.
- **Neutral (`#64748B`):** Cool slate gray. Applied to supportive metadata, icon outlines, secondary descriptions, and architectural coordinates.
- **Canvas & Containers:** Base canvas is pure light neutrality (`#F8FAFC`), layered over crisp elevated white surfaces (`#FFFFFF`) with whisper-thin structural borders (`#E2E8F0`).
- **Text Contrast Levels:**
  - High-emphasis headings: `#0F172A`
  - Body & readable data: `#334155`
  - Subtext & labels: `#64748B`

## Typography

Typography establishes clear architectural hierarchy. **Plus Jakarta Sans** provides a contemporary, structured, geometric foundation for all headlines, property prices, and architectural metrics. **Inter** acts as the high-legibility workhorse for property dossiers, metadata matrices, long-form specs, and form controls.

- Headlines must preserve tight letter-spacing to emphasize structural rigor.
- Labels for technical specifications (e.g., surface area, orientation, zoning) leverage `label-sm` with slight tracking for optimal scannability.
- On small viewports, property heroes scale down cleanly via `display-hero-mobile` to maintain proportion without awkward text breaks.

## Layout & Spacing

The layout philosophy follows a disciplined **fluid-grid structure** bounded by a 1440px desktop frame:
- **Desktop (1024px+):** 12-column grid with a `gutter-lg` of 2rem and canvas margin of 3rem. Property listings switch to 3-column matrices, while detailed property viewports deploy an asymmetric 8:4 split (gallery/details vs. inquiry console).
- **Tablet (768px - 1023px):** 8-column grid with 1.5rem gutters and 2rem side margins. Listings reflow to a 2-column grid.
- **Mobile (<768px):** 4-column grid with 1rem gutters and 1rem side margins. Horizontal search filters transition to an off-canvas drawer or vertical sheet.

Spacing rhythm relies strictly on structural multiples of 8px (0.5rem) to ensure balance and proportional stability throughout property grids, filter bars, and modal sheets.

## Elevation & Depth

Visual depth is achieved through **low-contrast architectural outlines and quiet tonal layering**, completely rejecting heavy, muddy drop shadows.

- **Flat Surface Tiering:**
  - Base canvas (`#F8FAFC`) hosts secondary utilities and background groupings.
  - Interactive cards and panels sit on pure `#FFFFFF`, delineated by a crisp 1px hairline border (`#E2E8F0`).
- **Hover & Focus Elevation:**
  - When hovered, property cards and actionable surfaces do not pop upward aggressively; instead, their hairline border transitions smoothly to `#CBD5E1` accompanied by a micro-ambient glow: `0 4px 20px -2px rgba(15, 23, 42, 0.05)`.
- **Modals & Overlays:**
  - Lightbox sheets, mortgage calculators, and contact dialogues sit on elevated `#FFFFFF` with a soft architectural veil: `0 20px 40px -15px rgba(15, 23, 42, 0.12)`.
  - Backdrops use a neutral dark slate scrim at 40% opacity with a subtle `backdrop-blur(4px)` to preserve ambient focus.

## Shapes

The design system maintains a refined balance between architectural firmness and human touch. Base elements leverage a clean 0.5rem (8px) corner radius, whereas immersive media containers and property cards step gracefully into `rounded-xl` (1.5rem / 24px) to soften photographic framing.

- **Controls (Inputs, Buttons, Dropdowns):** 0.5rem (8px) for neat, precise alignment within form groups.
- **Property Media Containers:** `rounded-xl` (24px) for full-bleed architectural photos, grounding them as editorial showcases.
- **Badges & Chips:** 0.375rem (6px) or fully pill-shaped (9999px) strictly for circular status indicators to avoid competing with data boxes.

## Components

### Property Cards
- **Structure:** Encased in pure white `#FFFFFF` with a 1px `#E2E8F0` border and `rounded-xl` overflow discipline.
- **Media Presentation:** 16:10 or 4:3 high-resolution aspect ratio with zoom-on-hover micro-transitions (`scale 1.02` over 350ms).
- **Metadata Layout:** Clear division between geographical coordinates, spec points (bedrooms, bathrooms, built m²), and the bottom anchor featuring the prominent price in `Plus Jakarta Sans` alongside calculated `price/m²` in muted slate.

### Badges & Status Chips
- **Verification Badge:** Pill-shaped or subtle rounded container using an ultra-light tint (`#F0F9FF`) with secondary blue text (`#0284C7`) and a subtle 1px border (`#BAE6FD`).
- **Feature Tags:** Neutral slate backgrounds (`#F1F5F9`), slate text (`#475569`), strictly uppercase `label-sm` styling with 0.04em letter-spacing.

### Search & Filter Bar
- **Form Factor:** Seamless horizontal pill or segmented floating toolbar anchored at the viewport or hero section.
- **Separators:** 1px vertical borders (`#E2E8F0`) between segment zones (Location, Property Type, Price Range, Rooms).
- **Interactions:** Crisp popover dropdowns with zero drop shadow heaviness, utilizing clean outline definition.

### Buttons & Call-to-Actions
- **Primary:** Background `#0F172A`, text `#FFFFFF`, 0.5rem radius, font weight 600. On hover: shifts smoothly to `#1E293B`.
- **Secondary / Outline:** Background transparent, border 1px solid `#CBD5E1`, text `#0F172A`. On hover: background `#F8FAFC`, border `#94A3B8`.
- **Accent Action:** Background `#0284C7`, text `#FFFFFF`. Reserved for high-value actions such as "Schedule Private Tour" or "Make an Offer".

### Input Fields & Controls
- **Field Canvas:** `#FFFFFF` background with 1px border `#E2E8F0` and 0.5rem radius.
- **Typography:** `body-md` in `#0F172A`; placeholder text in `#94A3B8`.
- **Focus State:** Border switches cleanly to `#0284C7` with a non-intrusive 2px ring in `rgba(2, 132, 199, 0.15)`. No chaotic glow effects.
- **Checkboxes & Radios:** Sharp, understated geometry with `#0F172A` fill and crisp white glyph checkmarks.

### Modals & Dossier Overlays
- **Layout:** Centered or side-drawn structural drawers. Clean header with 1px divider, ample 2rem inner padding, sticky bottom action bar, and seamless integration of high-resolution floor plans and virtual tours.

## Listado de propiedades (`/properties`) — nota COSAVE

Basado en el diseño de Stitch «Explorador y resultados con mapa», adaptado a México (MXN, «recámaras»).

- **Vistas** (parámetro `vista` en la URL): *Lista y mapa* (predeterminada; tarjetas horizontales a la izquierda y mapa fijo a la derecha), *Cuadrícula* (3 columnas) y *Solo mapa*. En pantallas chicas, un botón flotante alterna lista ⇄ mapa.
- **Filtros**: chips de filtros activos con ✕ y «Restablecer todo»; el resto de los filtros vive en un panel lateral («Filtros»). «Guardar alerta» abre la búsqueda guardada.
- **Tarjeta horizontal** (`property-row-card.tsx`): `ZONA • CIUDAD` en `azure`, fecha de publicación, precio + $/m², características con dato real (las que valen 0 no se muestran), descripción y «Ver ficha».
- **Mapa**: pines de precio `ink`, `azure` al resaltar; pasar sobre una tarjeta resalta su pin y abrir un pin marca su tarjeta.
- **Paginación**: 12 por página (parámetro `pagina`); el mapa muestra todos los resultados.
- **Omitido del diseño por no tener datos reales**: sellos de auditoría y eficiencia energética, alerta de mercado, bajadas de precio, «sin comisión», rendimiento de inversión, capas de metro/colegios/precio por zona, orden por «relevancia» y amenidades (terraza, planta…).
