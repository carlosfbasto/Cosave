-- AlterEnum
ALTER TYPE "PropertyStatus" ADD VALUE 'pending';
ALTER TYPE "PropertyStatus" ADD VALUE 'rejected';

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Las ya publicadas conservan su fecha de alta
UPDATE "Property" SET "publishedAt" = "createdAt" WHERE "status" IN ('published', 'sold', 'rented', 'paused');

-- CreateTable
CREATE TABLE "PropertyStatusEvent" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "fromStatus" "PropertyStatus" NOT NULL,
    "toStatus" "PropertyStatus" NOT NULL,
    "actorId" UUID NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyStatusEvent_propertyId_createdAt_idx" ON "PropertyStatusEvent"("propertyId", "createdAt");

-- AddForeignKey
ALTER TABLE "PropertyStatusEvent" ADD CONSTRAINT "PropertyStatusEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Secuencia para el código público COS-000001 (las propiedades de demostración usan hasta el 14)
CREATE SEQUENCE "property_code_seq" START 1000;
