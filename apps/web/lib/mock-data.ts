/** Datos FICTICIOS solo para diseñar la portada. Se reemplazarán por datos del api (Etapa 3). */

export interface MockProperty {
  code: string;
  title: string;
  operation: "sale" | "rent";
  price: number;
  city: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  image: string;
}

export const featuredProperties: MockProperty[] = [
  { code: "COS-000001", city: "Mérida", title: "Casa moderna con alberca", operation: "sale", price: 4850000, description: "Casa de dos niveles con alberca, jardín amplio y acabados de lujo en zona residencial.", bedrooms: 4, bathrooms: 3, area: 320, image: "/img/casa-alberca.jpg" },
  { code: "COS-000002", city: "Mérida", title: "Departamento céntrico", operation: "rent", price: 14500, description: "Departamento luminoso y amueblado cerca de parques, restaurantes y transporte.", bedrooms: 2, bathrooms: 2, area: 85, image: "/img/depto-sala.jpg" },
  { code: "COS-000003", city: "Valladolid", title: "Residencia con porche", operation: "sale", price: 3200000, description: "Casa familiar de estilo clásico con porche, patio y cochera para dos autos.", bedrooms: 3, bathrooms: 2, area: 210, image: "/img/casa-porche.jpg" },
  { code: "COS-000004", city: "Mérida", title: "Casa de lujo con vista", operation: "sale", price: 7900000, description: "Diseño contemporáneo con terraza, espacios abiertos y vista panorámica al jardín.", bedrooms: 5, bathrooms: 4, area: 480, image: "/img/casa-lujo.jpg" },
];

export const recentProperties: MockProperty[] = [
  { code: "COS-000005", city: "Tizimín", title: "Casa en privada", operation: "rent", price: 22000, description: "Casa en fraccionamiento cerrado con seguridad 24 horas y áreas verdes.", bedrooms: 3, bathrooms: 2, area: 190, image: "/img/casa-calle.jpg" },
  { code: "COS-000006", city: "Mérida", title: "Loft con plantas y luz natural", operation: "rent", price: 11800, description: "Espacio abierto con grandes ventanales, ideal para una persona o pareja.", bedrooms: 1, bathrooms: 1, area: 56, image: "/img/depto-plantas.jpg" },
  { code: "COS-000007", city: "Panabá", title: "Villa con alberca y terraza", operation: "sale", price: 5600000, description: "Villa de descanso con alberca, terraza techada y cuarto de servicio.", bedrooms: 4, bathrooms: 3, area: 360, image: "/img/villa-piscina.jpg" },
  { code: "COS-000008", city: "Valladolid", title: "Casa de campo", operation: "sale", price: 1450000, description: "Casa pequeña rodeada de naturaleza, perfecta para escapar de la ciudad.", bedrooms: 2, bathrooms: 1, area: 95, image: "/img/casa-campo.jpg" },
];

export const allMockProperties = [...featuredProperties, ...recentProperties];

export const steps = [
  { title: "Busca", text: "Filtra por ubicación, tipo y presupuesto para ver las propiedades disponibles." },
  { title: "Guarda tu búsqueda", text: "¿No hay nada aún? Guarda tus criterios y COSAVE trabaja por ti." },
  { title: "Te avisamos", text: "Recibes una alerta en cuanto se publique una propiedad que coincida." },
  { title: "Contacta", text: "Habla directo con el propietario o con un asesor y da el siguiente paso." },
];

export const trustStats = [
  { value: "+2,700", label: "Propiedades publicadas" },
  { value: "+15,000", label: "Usuarios registrados" },
  { value: "+1,200", label: "Alertas cumplidas" },
  { value: "4.8/5", label: "Satisfacción promedio" },
];

export const testimonials = [
  { name: "Mariana López", role: "Compradora, Mérida", text: "Guardé mi búsqueda y a las dos semanas me avisaron de una casa justo en mi presupuesto." },
  { name: "Jorge Ramírez", role: "Propietario, Monterrey", text: "Publiqué mi departamento en minutos y recibí contactos reales desde el primer día." },
  { name: "Andrea Torres", role: "Asesora inmobiliaria", text: "Las solicitudes llegan ya filtradas. Me ahorra horas de trabajo cada semana." },
];

export const formatMxn = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

/* ---------- Módulo /properties (datos ficticios) ---------- */

export type PropertyType = "Bodega Comercial" | "Bodega Industrial" | "Casa" | "Departamento" | "Terreno" | "Local comercial" | "Otro";
export const cities = ["Panabá", "Tizimín", "Valladolid", "Mérida"] as const;
export const types: PropertyType[] = ["Bodega Comercial", "Bodega Industrial", "Casa", "Departamento"];

export interface ListedProperty extends MockProperty {
  type: PropertyType;
  landArea: number;
  publishedAt: string;
  /** Posición ficticia en el mapa (% del recuadro); solo las de demostración. */
  map: { x: number; y: number };
  /** Fotos en orden (la primera es la principal) y coordenadas reales, si el api las trae. */
  images?: string[];
  latitude?: number | null;
  longitude?: number | null;
  postalCode?: string | null;
  parkingSpots?: number | null;
  state: string;
  zone: string;
}

type ListedCore = Omit<ListedProperty, "state" | "zone">;

const extra: Record<string, Pick<ListedCore, "type" | "landArea" | "publishedAt" | "map">> = {
  "COS-000001": { type: "Casa", landArea: 450, publishedAt: "2026-10-01", map: { x: 22, y: 30 } },
  "COS-000002": { type: "Departamento", landArea: 0, publishedAt: "2026-09-28", map: { x: 30, y: 52 } },
  "COS-000003": { type: "Casa", landArea: 300, publishedAt: "2026-09-20", map: { x: 70, y: 40 } },
  "COS-000004": { type: "Casa", landArea: 700, publishedAt: "2026-10-03", map: { x: 40, y: 22 } },
  "COS-000005": { type: "Casa", landArea: 260, publishedAt: "2026-10-04", map: { x: 82, y: 22 } },
  "COS-000006": { type: "Departamento", landArea: 0, publishedAt: "2026-10-05", map: { x: 26, y: 66 } },
  "COS-000007": { type: "Casa", landArea: 520, publishedAt: "2026-09-15", map: { x: 62, y: 14 } },
  "COS-000008": { type: "Casa", landArea: 400, publishedAt: "2026-09-10", map: { x: 66, y: 60 } },
};

const more: ListedCore[] = [
  { code: "COS-000009", title: "Bodega industrial con andén", operation: "rent", price: 48000, description: "Nave industrial con andén de carga, oficinas y amplio patio de maniobras.", bedrooms: 0, bathrooms: 2, area: 900, image: "/img/bodega-industrial.jpg", city: "Mérida", type: "Bodega Industrial", landArea: 1400, publishedAt: "2026-10-02", map: { x: 14, y: 44 } },
  { code: "COS-000010", title: "Bodega comercial sobre avenida", operation: "sale", price: 3750000, description: "Local tipo bodega con frente a avenida principal, ideal para distribución.", bedrooms: 0, bathrooms: 1, area: 340, image: "/img/bodega-comercial.jpg", city: "Valladolid", type: "Bodega Comercial", landArea: 420, publishedAt: "2026-09-25", map: { x: 74, y: 70 } },
  { code: "COS-000011", title: "Departamento con balcón", operation: "rent", price: 9800, description: "Departamento en edificio nuevo con balcón, estacionamiento y vigilancia.", bedrooms: 2, bathrooms: 1, area: 70, image: "/img/edificio.jpg", city: "Tizimín", type: "Departamento", landArea: 0, publishedAt: "2026-10-06", map: { x: 88, y: 38 } },
  { code: "COS-000012", title: "Casa con alberca y jardín", operation: "sale", price: 2980000, description: "Casa de una planta con alberca, palapa y jardín arbolado en zona tranquila.", bedrooms: 3, bathrooms: 2, area: 180, image: "/img/casa-alberca.jpg", city: "Panabá", type: "Casa", landArea: 600, publishedAt: "2026-09-30", map: { x: 54, y: 30 } },
  { code: "COS-000013", title: "Bodega industrial en parque", operation: "sale", price: 8900000, description: "Bodega en parque industrial con acceso para tráileres y subestación eléctrica.", bedrooms: 0, bathrooms: 3, area: 1500, image: "/img/bodega-industrial.jpg", city: "Mérida", type: "Bodega Industrial", landArea: 2400, publishedAt: "2026-09-18", map: { x: 12, y: 62 } },
  { code: "COS-000014", title: "Casa de descanso con cabaña", operation: "rent", price: 16500, description: "Casa rodeada de árboles con cabaña anexa, perfecta para fines de semana.", bedrooms: 3, bathrooms: 2, area: 150, image: "/img/cabana.jpg", city: "Valladolid", type: "Casa", landArea: 800, publishedAt: "2026-10-05", map: { x: 60, y: 76 } },
];

/** Zona ficticia de cada propiedad dentro de su ciudad. */
const zoneByCode: Record<string, string> = {
  "COS-000001": "Norte", "COS-000002": "Centro", "COS-000003": "Centro", "COS-000004": "Norte",
  "COS-000005": "Oriente", "COS-000006": "Centro", "COS-000007": "Sur", "COS-000008": "Sur",
  "COS-000009": "Zona industrial", "COS-000010": "Centro", "COS-000011": "Oriente",
  "COS-000012": "Sur", "COS-000013": "Zona industrial", "COS-000014": "Norte",
};

export const listedProperties: ListedProperty[] = [
  ...allMockProperties.map((p) => ({ ...p, ...extra[p.code] })),
  ...more,
].map((p) => ({ ...p, state: "Yucatán", zone: zoneByCode[p.code] ?? "Centro" }));

export const states = ["Yucatán"] as const;
export const zones = ["Centro", "Norte", "Sur", "Oriente", "Zona industrial"] as const;

/** "Mérida" → "merida": valor estable para usar en la URL (?ciudad=merida). */
export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const countBy = (key: "type" | "city", value: string) => listedProperties.filter((p) => p[key] === value).length;

/** Categorías de la portada: coinciden con los tipos reales y filtran en /properties?tipo=<slug>. */
export const propertyTypeTiles = [
  { value: "Casa", label: "Casas", image: "/img/casa-porche.jpg" },
  { value: "Departamento", label: "Departamentos", image: "/img/edificio.jpg" },
  { value: "Bodega Comercial", label: "Bodegas comerciales", image: "/img/bodega-comercial.jpg" },
  { value: "Bodega Industrial", label: "Bodegas industriales", image: "/img/bodega-industrial.jpg" },
].map((t) => ({ ...t, slug: slugify(t.value), count: countBy("type", t.value) }));

/** Ubicaciones de la portada: filtran en /properties?ciudad=<slug>. */
export const locationTiles = [
  { value: "Mérida", image: "/img/casa-calle.jpg" },
  { value: "Valladolid", image: "/img/casa-campo.jpg" },
  { value: "Tizimín", image: "/img/ciudad.jpg" },
  { value: "Panabá", image: "/img/villa-piscina.jpg" },
].map((l) => ({ ...l, label: l.value, slug: slugify(l.value), count: countBy("city", l.value) }));

export const USD_RATE = 17; // ficticio

/* ---------- Ficha de propiedad (datos ficticios) ---------- */

const galleryPool: Partial<Record<PropertyType, string[]>> = {
  Casa: ["casa-lujo", "casa-moderna", "casa-noche", "sala", "casa-arbol", "villa-resort", "casa-porche"],
  Departamento: ["depto-sala", "depto-plantas", "sala", "edificio"],
  "Bodega Comercial": ["bodega-comercial", "bodega-industrial", "edificio", "rascacielos"],
  "Bodega Industrial": ["bodega-industrial", "bodega-comercial", "edificio", "rascacielos"],
};

/** 4 fotos: la principal + 3 de apoyo según el tipo. */
export function galleryFor(p: ListedProperty): string[] {
  const extras = (galleryPool[p.type] ?? []).map((n) => `/img/${n}.jpg`).filter((src) => src !== p.image);
  return [p.image, ...extras.slice(0, 3)];
}

export const cityCoords: Record<string, { lat: number; lon: number }> = {
  Mérida: { lat: 20.9674, lon: -89.5926 },
  Valladolid: { lat: 20.6896, lon: -88.2017 },
  Tizimín: { lat: 21.1426, lon: -88.1503 },
  Panabá: { lat: 21.2917, lon: -88.2689 },
};

export function detailsFor(p: ListedProperty) {
  const industrial = p.type.startsWith("Bodega");
  return {
    paragraphs: [
      `${p.title} es una propiedad ${p.operation === "rent" ? "en renta" : "en venta"} ubicada en ${p.city}, Yucatán. ${p.description}`,
      industrial
        ? "Cuenta con estructura metálica, piso de concreto pulido de alta resistencia, buena iluminación natural y accesos amplios para vehículos de carga."
        : "Cuenta con espacios amplios y bien ventilados, acabados de calidad y una distribución pensada para la comodidad de la familia.",
    ],
    features: industrial
      ? ["Andén de carga", "Oficinas administrativas", "Piso de concreto pulido", "Instalación eléctrica trifásica", "Vigilancia 24 horas", "Patio de maniobras"]
      : ["Cocina integral", "Cochera cubierta", "Pisos de porcelanato", "Ventanas de aluminio", "Agua potable y drenaje", "Áreas verdes"],
    materials: industrial
      ? ["Estructura de acero", "Muros de block y concreto", "Techo de lámina galvanizada", "Piso de concreto armado"]
      : ["Muros de block y concreto", "Losa de vigueta y bovedilla", "Piso de porcelanato", "Cancelería de aluminio"],
  };
}

/** Propiedades similares: mismo tipo y operación primero, luego misma ciudad, luego el resto. */
export function similarTo(p: ListedProperty, pool: ListedProperty[] = listedProperties, n = 8): ListedProperty[] {
  const score = (x: ListedProperty) => (x.type === p.type ? 4 : 0) + (x.operation === p.operation ? 2 : 0) + (x.city === p.city ? 1 : 0);
  return pool
    .filter((x) => x.code !== p.code)
    .sort((a, b) => score(b) - score(a))
    .slice(0, n);
}
