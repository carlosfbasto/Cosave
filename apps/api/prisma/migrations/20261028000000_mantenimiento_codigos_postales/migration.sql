-- Cuota mensual de mantenimiento (departamentos y propiedades en privada).
ALTER TABLE "Property" ADD COLUMN "maintenanceFee" DECIMAL(12,2);

-- Catálogo de códigos postales (GeoNames). Una fila por colonia.
CREATE TABLE "PostalCode" (
    "id" SERIAL NOT NULL,
    "code" CHAR(5) NOT NULL,
    "settlement" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "city" TEXT,

    CONSTRAINT "PostalCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PostalCode_code_idx" ON "PostalCode"("code");

-- El web nunca lee tablas directo: todo pasa por el api.
ALTER TABLE "PostalCode" ENABLE ROW LEVEL SECURITY;
