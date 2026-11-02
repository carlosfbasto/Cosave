import { z } from "zod";

export const USER_ROLES = ["buyer", "seller", "agent", "admin"] as const;
export const PROPERTY_TYPES = ["house", "land", "apartment", "commercial", "commercial_warehouse", "industrial_warehouse", "other"] as const;
export const OPERATION_TYPES = ["sale", "rent"] as const;
export const PROPERTY_STATUSES = ["draft", "pending", "published", "paused", "sold", "rented", "rejected", "archived"] as const;
export const INQUIRY_STATUSES = ["pending", "answered"] as const;

export const userRoleSchema = z.enum(USER_ROLES);
export const propertyTypeSchema = z.enum(PROPERTY_TYPES);
export const operationTypeSchema = z.enum(OPERATION_TYPES);
export const propertyStatusSchema = z.enum(PROPERTY_STATUSES);
export const inquiryStatusSchema = z.enum(INQUIRY_STATUSES);

export type UserRole = z.infer<typeof userRoleSchema>;
export type PropertyType = z.infer<typeof propertyTypeSchema>;
export type OperationType = z.infer<typeof operationTypeSchema>;
export type PropertyStatus = z.infer<typeof propertyStatusSchema>;
export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;

/** Texto para el usuario cuando una propiedad ya no está publicada. `published` no tiene etiqueta. */
export const UNAVAILABLE_LABEL: Partial<Record<PropertyStatus, string>> = {
  draft: "Retirada",
  pending: "Retirada",
  rejected: "Retirada",
  sold: "Vendida",
  rented: "Rentada",
  paused: "Pausada",
  archived: "Retirada",
};

/** Nombre de cada tipo de inmueble para el usuario. */
export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  house: "Casa",
  apartment: "Departamento",
  land: "Terreno",
  commercial: "Local comercial",
  commercial_warehouse: "Bodega comercial",
  industrial_warehouse: "Bodega industrial",
  other: "Otro",
};

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  pending: "Pendiente",
  answered: "Respondida",
};

/** Criterios de una búsqueda guardada ("No encontré lo que busco"). */
export const savedSearchCriteriaSchema = z
  .object({
    operation: operationTypeSchema,
    propertyType: propertyTypeSchema.optional(),
    state: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    zone: z.string().min(1).optional(),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().positive().optional(),
    minBedrooms: z.number().int().nonnegative().optional(),
    minBathrooms: z.number().int().nonnegative().optional(),
  })
  .refine((c) => c.minPrice === undefined || c.maxPrice === undefined || c.minPrice <= c.maxPrice, {
    message: "minPrice no puede ser mayor que maxPrice",
    path: ["minPrice"],
  });

export type SavedSearchCriteria = z.infer<typeof savedSearchCriteriaSchema>;

/** Etiqueta de cada estado para el propietario (Mis propiedades). */
export const PROPERTY_STATUS_LABEL: Record<PropertyStatus, string> = {
  draft: "Borrador",
  pending: "Pendiente de revisión",
  published: "Publicada",
  paused: "Pausada",
  sold: "Vendida",
  rented: "Rentada",
  rejected: "Rechazada",
  archived: "Retirada",
};

/** Límites de fotografías: los usa el api al validar y la web al avisar antes de subir. */
export const IMAGE_LIMITS = {
  maxCount: 10,
  maxBytes: 8 * 1024 * 1024,
  mimeTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;
export const IMAGE_LABEL = "JPG, PNG o WebP";

/**
 * Nitidez mínima de una foto. La miden igual el navegador (antes de subir) y el api (al recibir):
 * la foto se reduce a `size` px por el lado mayor, en escala de grises, y se calcula `laplacianVariance`.
 */
export const SHARPNESS = { size: 800, min: 50 } as const;
export const BLURRY_IMAGE_MESSAGE = "la foto se ve borrosa. Tómala de nuevo con buena luz y el celular firme, o elige otra más nítida.";

/**
 * Varianza del laplaciano (detección de bordes) de una imagen en escala de grises (0–255, fila por fila).
 * Una foto enfocada tiene bordes marcados y una varianza alta; una borrosa o movida, baja.
 */
export function laplacianVariance(gray: ArrayLike<number>, width: number, height: number): number {
  let sum = 0;
  let sq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const v = gray[i - width]! + gray[i + width]! + gray[i - 1]! + gray[i + 1]! - 4 * gray[i]!;
      sum += v;
      sq += v * v;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sq / n - mean * mean;
}

/** Campos de características que aplican a cada tipo de inmueble. */
export type FeatureField = "bedrooms" | "bathrooms" | "parkingSpots" | "landAreaM2" | "builtAreaM2";
export const FEATURE_FIELDS_BY_TYPE: Record<PropertyType, readonly FeatureField[]> = {
  house: ["bedrooms", "bathrooms", "parkingSpots", "landAreaM2", "builtAreaM2"],
  apartment: ["bedrooms", "bathrooms", "parkingSpots", "builtAreaM2"],
  land: ["landAreaM2"],
  commercial: ["bathrooms", "parkingSpots", "landAreaM2", "builtAreaM2"],
  commercial_warehouse: ["bathrooms", "parkingSpots", "landAreaM2", "builtAreaM2"],
  industrial_warehouse: ["bathrooms", "parkingSpots", "landAreaM2", "builtAreaM2"],
  other: ["landAreaM2", "builtAreaM2"],
};

const WAREHOUSES: PropertyType[] = ["commercial_warehouse", "industrial_warehouse"];

/**
 * Características (amenidades) que el anunciante puede marcar, y en qué tipos aplican.
 * En la BD se guarda la clave (`PropertyFeatures.amenities`); la etiqueta es solo para mostrar.
 */
export const AMENITIES = [
  { key: "kitchen", label: "Cocina integral", types: ["house", "apartment"] },
  { key: "covered_garage", label: "Cochera cubierta", types: ["house"] },
  { key: "pool", label: "Alberca", types: ["house", "apartment"] },
  { key: "garden", label: "Jardín", types: ["house"] },
  { key: "terrace", label: "Terraza", types: ["house", "apartment"] },
  { key: "palapa", label: "Palapa", types: ["house"] },
  { key: "balcony", label: "Balcón", types: ["apartment"] },
  { key: "service_room", label: "Cuarto de servicio", types: ["house"] },
  { key: "furnished", label: "Amueblado", types: ["house", "apartment"] },
  { key: "air_conditioning", label: "Aire acondicionado", types: ["house", "apartment", "commercial"] },
  { key: "elevator", label: "Elevador", types: ["apartment", "commercial"] },
  { key: "green_areas", label: "Áreas verdes", types: ["house", "apartment", "land"] },
  { key: "gated", label: "Privada o fraccionamiento cerrado", types: ["house", "apartment", "land"] },
  { key: "security", label: "Vigilancia 24 horas", types: ["house", "apartment", "commercial", ...WAREHOUSES] },
  { key: "water_drainage", label: "Agua potable y drenaje", types: ["house", "apartment", "land", "commercial", ...WAREHOUSES] },
  { key: "electricity", label: "Servicio de luz", types: ["land"] },
  { key: "avenue_front", label: "Frente a avenida", types: ["land", "commercial", ...WAREHOUSES] },
  { key: "offices", label: "Oficinas administrativas", types: WAREHOUSES },
  { key: "loading_dock", label: "Andén de carga", types: WAREHOUSES },
  { key: "maneuver_yard", label: "Patio de maniobras", types: WAREHOUSES },
  { key: "trailer_access", label: "Acceso para tráileres", types: WAREHOUSES },
  { key: "three_phase", label: "Instalación eléctrica trifásica", types: ["commercial", ...WAREHOUSES] },
  { key: "substation", label: "Subestación eléctrica", types: ["industrial_warehouse"] },
] as const satisfies readonly { key: string; label: string; types: readonly PropertyType[] }[];

/** Materiales de construcción. No aplican a terrenos. */
export const MATERIALS = [
  { key: "block_concrete", label: "Muros de block y concreto" },
  { key: "vigueta_bovedilla", label: "Losa de vigueta y bovedilla" },
  { key: "concrete_slab", label: "Losa de concreto armado" },
  { key: "steel_structure", label: "Estructura de acero" },
  { key: "galvanized_roof", label: "Techo de lámina galvanizada" },
  { key: "porcelain_floor", label: "Piso de porcelanato" },
  { key: "polished_concrete_floor", label: "Piso de concreto pulido" },
  { key: "concrete_floor", label: "Piso de concreto armado" },
  { key: "aluminum_windows", label: "Cancelería de aluminio" },
] as const;

export type Amenity = (typeof AMENITIES)[number]["key"];
export type Material = (typeof MATERIALS)[number]["key"];
export const AMENITY_LABEL = Object.fromEntries(AMENITIES.map((a) => [a.key, a.label])) as Record<Amenity, string>;
export const MATERIAL_LABEL = Object.fromEntries(MATERIALS.map((m) => [m.key, m.label])) as Record<Material, string>;

/** Características que se ofrecen para un tipo; «Otro» admite todas. */
export const amenitiesFor = (type: PropertyType): Amenity[] =>
  AMENITIES.filter((a) => type === "other" || (a.types as readonly PropertyType[]).includes(type)).map((a) => a.key);
/** Materiales que se ofrecen para un tipo (ninguno en terrenos). */
export const materialsFor = (type: PropertyType): Material[] => (type === "land" ? [] : MATERIALS.map((m) => m.key));

const amenityKeys = AMENITIES.map((a) => a.key) as [Amenity, ...Amenity[]];
const materialKeys = MATERIALS.map((m) => m.key) as [Material, ...Material[]];
/** Lista sin repetidos. */
const uniqueList = <T extends string>(keys: [T, ...T[]]) => z.array(z.enum(keys)).transform((l) => [...new Set(l)]);

const draftFields = {
  operation: operationTypeSchema,
  type: propertyTypeSchema,
  title: z.string().trim().min(5, "Mínimo 5 caracteres").max(120),
  description: z.string().trim().max(2000).optional(),
  price: z.number({ message: "Indica el precio" }).positive("Debe ser mayor a 0"),
  state: z.string().trim().min(1, "Indica el estado").max(80),
  city: z.string().trim().min(1, "Indica la ciudad").max(80),
  zone: z.string().trim().max(80).optional(),
  address: z.string().trim().max(200).optional(),
  postalCode: z.string({ message: "Indica el código postal" }).trim().regex(/^\d{5}$/, "Debe tener 5 dígitos"),
  maintenanceFee: z.number().nonnegative("No puede ser negativa").max(1_000_000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  bedrooms: z.number().int().nonnegative().max(50).optional(),
  bathrooms: z.number().int().nonnegative().max(50).optional(),
  parkingSpots: z.number().int().nonnegative().max(50).optional(),
  landAreaM2: z.number().nonnegative().optional(),
  builtAreaM2: z.number().nonnegative().optional(),
  amenities: uniqueList(amenityKeys).optional(),
  materials: uniqueList(materialKeys).optional(),
};

/** Datos COMPLETOS para enviar a revisión (formulario "Publicar propiedad"). */
export const propertyDraftSchema = z.object(draftFields);

/** Un borrador puede guardarse incompleto: solo se exige la operación y el tipo; lo demás, si viene, debe ser válido. */
export const propertyPartialSchema = z
  .object(draftFields)
  .partial()
  .required({ operation: true, type: true });

/** Edición: los opcionales aceptan `null` para borrarlos. Al crear solo se exige operación y tipo. */
export const propertyPatchSchema = z
  .object(draftFields)
  .partial()
  .extend({
    description: draftFields.description.nullable(),
    zone: draftFields.zone.nullable(),
    address: draftFields.address.nullable(),
    postalCode: draftFields.postalCode.nullable(),
    maintenanceFee: draftFields.maintenanceFee.nullable(),
    latitude: draftFields.latitude.nullable(),
    longitude: draftFields.longitude.nullable(),
    bedrooms: draftFields.bedrooms.nullable(),
    bathrooms: draftFields.bathrooms.nullable(),
    parkingSpots: draftFields.parkingSpots.nullable(),
    landAreaM2: draftFields.landAreaM2.nullable(),
    builtAreaM2: draftFields.builtAreaM2.nullable(),
  })
  .strict();
export type PropertyPatch = z.infer<typeof propertyPatchSchema>;
export const propertyCreateSchema = propertyPatchSchema.required({ operation: true, type: true });

export type PropertyPartial = z.infer<typeof propertyPartialSchema>;

/** Nombres de los campos obligatorios, para decirle al usuario qué falta. */
export const REQUIRED_FIELD_LABEL: Record<string, string> = {
  title: "el título",
  price: "el precio",
  postalCode: "el código postal",
  state: "el estado",
  city: "la ciudad",
};

/** La cuota de mantenimiento solo aplica a departamentos y a propiedades en privada o fraccionamiento cerrado. */
export const needsMaintenanceFee = (type: PropertyType, amenities: readonly string[] = []) => type === "apartment" || amenities.includes("gated");

/** Respuesta de `GET /postal-codes/:code`: estado y ciudad del código y sus colonias. */
export interface PostalCodeInfo {
  code: string;
  state: string;
  city: string;
  settlements: string[];
  /** Municipio del código (la ciudad puede ser otra en zonas metropolitanas). */
  municipality: string;
  /** Centro aproximado del código postal; null si el catálogo no trae coordenadas. */
  center: { lat: number; lng: number } | null;
  /** Recuadro [[sur, oeste], [norte, este]] del municipio, para encuadrarlo en el mapa; null si no hay coordenadas. */
  bounds: [[number, number], [number, number]] | null;
}

/**
 * Quién puede mover una propiedad de un estado a otro. El estado nunca se edita libremente:
 * toda transición pasa por aquí (api) y la interfaz solo ofrece las válidas.
 */
export type StatusActor = "owner" | "admin";

const TRANSITIONS: { from: PropertyStatus; to: PropertyStatus; actor: StatusActor }[] = [
  { from: "draft", to: "pending", actor: "owner" },
  { from: "rejected", to: "pending", actor: "owner" },
  { from: "pending", to: "draft", actor: "owner" },
  { from: "rejected", to: "draft", actor: "owner" },
  { from: "published", to: "paused", actor: "owner" },
  { from: "paused", to: "published", actor: "owner" },
  { from: "published", to: "sold", actor: "owner" },
  { from: "paused", to: "sold", actor: "owner" },
  { from: "published", to: "rented", actor: "owner" },
  { from: "paused", to: "rented", actor: "owner" },
  { from: "draft", to: "archived", actor: "owner" },
  { from: "pending", to: "archived", actor: "owner" },
  { from: "rejected", to: "archived", actor: "owner" },
  { from: "published", to: "archived", actor: "owner" },
  { from: "paused", to: "archived", actor: "owner" },
  { from: "pending", to: "published", actor: "admin" },
  { from: "pending", to: "rejected", actor: "admin" },
  { from: "published", to: "archived", actor: "admin" },
  { from: "paused", to: "archived", actor: "admin" },
];

/** Estados a los que puede pasar `actor` desde `from`. `sold` solo en ventas y `rented` solo en rentas. */
export function allowedTransitions(from: PropertyStatus, actor: StatusActor, operation: OperationType): PropertyStatus[] {
  return TRANSITIONS.filter((t) => t.from === from && t.actor === actor)
    .map((t) => t.to)
    .filter((to) => (to === "sold" ? operation === "sale" : to === "rented" ? operation === "rent" : true));
}

export const canTransition = (from: PropertyStatus, to: PropertyStatus, actor: StatusActor, operation: OperationType) =>
  allowedTransitions(from, actor, operation).includes(to);

/** Qué puede editar el dueño según el estado. `locked`: solo lectura (en revisión o concluida). */
export type EditScope = "all" | "limited" | "locked";
export function editScope(status: PropertyStatus): EditScope {
  if (status === "draft" || status === "rejected") return "all";
  if (status === "published" || status === "paused") return "limited";
  return "locked";
}
/** En `limited` solo cambian estos campos; tipo, operación y ubicación exigen regresarla a borrador. */
export const LIMITED_EDIT_FIELDS = ["description", "price", "bedrooms", "bathrooms", "parkingSpots", "landAreaM2", "builtAreaM2", "amenities", "materials", "maintenanceFee"] as const;

export type PropertyDraft = z.infer<typeof propertyDraftSchema>;

/** Consulta a un anunciante sobre una propiedad (formulario "Me interesa"). */
export const INQUIRY_MESSAGE_MAX = 500;
export const inquiryInputSchema = z.object({
  message: z.string().trim().min(1, "Escribe tu mensaje").max(INQUIRY_MESSAGE_MAX),
  contactName: z.string().trim().min(1, "Escribe tu nombre").max(120),
  contactEmail: z.string().trim().email("Correo no válido").max(160),
  /** Lada + 10 dígitos, p. ej. "+52 9991234567". */
  contactPhone: z.string().trim().regex(/^\+\d{1,3} \d{10}$/, "Teléfono no válido"),
});

export type InquiryInput = z.infer<typeof inquiryInputSchema>;

/** Acciones que quedan en la bitácora de auditoría (`AuditLog.action`). */
export const AUDIT_ACTIONS = [
  "user.role_changed",
  "property.reviewed",
  "property.archived_by_admin",
  "property.image_deleted",
  "property.edited",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  "user.role_changed": "Cambio de rol",
  "property.reviewed": "Revisión de publicación",
  "property.archived_by_admin": "Publicación retirada por COSAVE",
  "property.image_deleted": "Foto eliminada",
  "property.edited": "Edición de propiedad publicada",
};
