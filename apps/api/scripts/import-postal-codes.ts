// Uso: pnpm --filter @cosave/api db:postal-codes <ruta a MX.txt>
// Carga el catálogo de códigos postales de México desde GeoNames (https://download.geonames.org/export/zip/MX.zip,
// licencia CC BY 4.0: hay que dar crédito a geonames.org). Reemplaza el catálogo completo en una transacción.
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma.js";

const file = process.argv[2];
if (!file) {
  console.error("Indica la ruta de MX.txt (descomprime MX.zip de GeoNames).");
  process.exit(1);
}

const coord = (v: string | undefined) => (v && Number.isFinite(Number(v)) ? Number(v) : null);

// Columnas (tab): país, código, colonia, estado, clave estado, municipio, clave municipio, ciudad, clave ciudad, lat, lng, precisión.
const rows = readFileSync(file, "utf8")
  .split("\n")
  .map((line) => line.split("\t"))
  .filter((c) => c[0] === "MX" && /^\d{5}$/.test(c[1] ?? "") && c[2] && c[3] && c[5])
  .map((c) => ({
    code: c[1]!,
    settlement: c[2]!.trim(),
    state: c[3]!.trim(),
    municipality: c[5]!.trim(),
    city: c[7]?.trim() || null,
    latitude: coord(c[9]),
    longitude: coord(c[10]),
  }));

const BATCH = 5000;
await prisma.$transaction(
  async (tx) => {
    await tx.postalCode.deleteMany();
    for (let i = 0; i < rows.length; i += BATCH) await tx.postalCode.createMany({ data: rows.slice(i, i + BATCH) });
  },
  { timeout: 600_000 },
);
console.log(`${rows.length} colonias cargadas (${new Set(rows.map((r) => r.code)).size} códigos postales).`);
await prisma.$disconnect();
