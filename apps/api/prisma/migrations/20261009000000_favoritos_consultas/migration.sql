-- AlterEnum
ALTER TYPE "PropertyStatus" ADD VALUE 'rented';
ALTER TYPE "PropertyStatus" ADD VALUE 'paused';

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('pending', 'answered');

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Inquiry_senderId_createdAt_idx" ON "Inquiry"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "Inquiry_propertyId_createdAt_idx" ON "Inquiry"("propertyId", "createdAt");

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
