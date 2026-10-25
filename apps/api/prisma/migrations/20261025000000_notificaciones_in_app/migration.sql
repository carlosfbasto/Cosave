-- Avisos dentro de la app (campana del header) para coincidencias de búsquedas guardadas.

-- AlterEnum
ALTER TYPE "NotificationChannel" ADD VALUE 'in_app';

-- AlterTable: cuándo la persona vio el aviso; null = sin leer
ALTER TABLE "Notification" ADD COLUMN     "readAt" TIMESTAMP(3);

-- CreateIndex: listar las notificaciones de una persona, más recientes primero
CREATE INDEX "Notification_userId_channel_createdAt_idx" ON "Notification"("userId", "channel", "createdAt");
