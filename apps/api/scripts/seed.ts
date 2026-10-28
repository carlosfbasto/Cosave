// Uso: pnpm --filter @cosave/api db:seed
// Siembra las propiedades de ejemplo del web (mock-data) como `published`, para probar favoritos y contacto.
// Es idempotente: se puede correr varias veces. Requiere haber aplicado las migraciones.
import type { Amenity, Material, PropertyType } from "@cosave/shared";
import { prisma } from "../src/lib/prisma.js";

// Import dinámico: los datos son del web y no deben entrar al typecheck estricto del api.
type WebType = "Casa" | "Departamento" | "Bodega Comercial" | "Bodega Industrial";
interface SeedProperty {
  code: string; title: string; description: string; operation: "sale" | "rent"; price: number;
  type: WebType;
  publishedAt: string; map: { x: number; y: number }; city: string; state: string; zone: string; image: string; bedrooms: number; bathrooms: number; area: number; landArea: number;
  amenities: Amenity[]; materials: Material[];
}
const mockPath = "../../web/lib/mock-data.ts";
const { listedProperties, DB_TYPE } = (await import(mockPath)) as { listedProperties: SeedProperty[]; DB_TYPE: Record<WebType, PropertyType> };

// Centro de cada ciudad + un desplazamiento pequeño según la posición ficticia del mapa.
const CITY: Record<string, [number, number]> = { Mérida: [20.9674, -89.5926], Valladolid: [20.6896, -88.2017], Tizimín: [21.1427, -88.1503], Panabá: [21.2894, -88.2689] };
const coords = (p: SeedProperty) => {
  const c = CITY[p.city];
  return c ? { latitude: c[0] + (p.map.y - 50) / 2000, longitude: c[1] + (p.map.x - 50) / 2000 } : {};
};

const SEED_OWNER_ID = "00000000-0000-4000-8000-000000000001";

const owner = await prisma.profile.upsert({
  where: { id: SEED_OWNER_ID },
  update: {},
  create: { id: SEED_OWNER_ID, email: "anunciante.demo@cosave.local", fullName: "Anunciante Demo", role: "seller" },
});

for (const p of listedProperties) {
  const data = {
    type: DB_TYPE[p.type],
    operation: p.operation,
    status: "published" as const,
    title: p.title,
    description: p.description,
    price: p.price,
    ownerId: owner.id,
  };
  await prisma.property.upsert({
    where: { publicCode: p.code },
    update: {},
    create: {
      publicCode: p.code,
      ...data,
      publishedAt: new Date(p.publishedAt),
      location: { create: { state: p.state, city: p.city, zone: p.zone, ...coords(p) } },
      images: { create: { storagePath: p.image, position: 0 } },
      features: {
        create: { bedrooms: p.bedrooms, bathrooms: p.bathrooms, builtAreaM2: p.area, landAreaM2: p.landArea || null, amenities: p.amenities, materials: p.materials },
      },
    },
  });
}
// Las que ya existían (corridas anteriores) reciben foto, fecha, tipo de bodega, características y materiales si les faltaban.
for (const p of listedProperties) {
  const row = await prisma.property.findUnique({
    where: { publicCode: p.code },
    select: { id: true, type: true, publishedAt: true, ownerId: true, features: { select: { amenities: true, materials: true } }, _count: { select: { images: true } } },
  });
  if (!row) continue;
  if (row._count.images === 0) await prisma.propertyImage.create({ data: { propertyId: row.id, storagePath: p.image, position: 0 } });
  if (!row.publishedAt) await prisma.property.update({ where: { id: row.id }, data: { publishedAt: new Date(p.publishedAt) } });
  // Antes las dos bodegas se guardaban como `commercial`; solo se corrige en las del anunciante demo.
  if (row.ownerId === owner.id && row.type === "commercial" && DB_TYPE[p.type] !== "commercial") {
    await prisma.property.update({ where: { id: row.id }, data: { type: DB_TYPE[p.type] } });
  }
  if (row.ownerId === owner.id && row.features && !row.features.amenities.length && !row.features.materials.length) {
    await prisma.propertyFeatures.update({ where: { propertyId: row.id }, data: { amenities: p.amenities, materials: p.materials } });
  }
  await prisma.propertyLocation.updateMany({ where: { propertyId: row.id, latitude: null }, data: coords(p) });
}
console.log(`${listedProperties.length} propiedades de ejemplo listas (dueño: ${owner.email})`);
await prisma.$disconnect();
