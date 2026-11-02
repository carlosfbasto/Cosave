-- Tipos de bodega separados del local comercial.
ALTER TYPE "PropertyType" ADD VALUE 'commercial_warehouse';
ALTER TYPE "PropertyType" ADD VALUE 'industrial_warehouse';

-- Características (amenidades) y materiales: claves del catálogo de packages/shared.
ALTER TABLE "PropertyFeatures" ADD COLUMN "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "PropertyFeatures" ADD COLUMN "materials" TEXT[] DEFAULT ARRAY[]::TEXT[];
