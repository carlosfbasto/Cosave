import type { Prisma } from "@prisma/client";

export type ReviewOutcome = "approved" | "rejected" | "archived";

interface Target {
  ownerId: string;
  propertyId: string;
  title: string;
  code: string;
}

const COPY: Record<ReviewOutcome, { subject: string; body: (t: Target, note: string | null) => string }> = {
  approved: {
    subject: "Tu propiedad ya está publicada",
    body: (t) => `«${t.title}» (${t.code}) fue aprobada y ya es visible en COSAVE.`,
  },
  rejected: {
    subject: "Tu publicación necesita cambios",
    body: (t, note) => `«${t.title}» (${t.code}) no fue aprobada. Motivo: ${note}. Puedes corregirla y enviarla de nuevo.`,
  },
  archived: {
    subject: "Tu publicación fue retirada",
    body: (t, note) => `«${t.title}» (${t.code}) fue retirada por el equipo de COSAVE. Motivo: ${note}.`,
  },
};

/**
 * Avisos al dueño tras una acción del admin sobre su publicación:
 * - `email`: queda pendiente hasta que exista el envío de correos.
 * - `in_app`: lo ve en la campana de inmediato. Solo se enlaza a la ficha si la aprobaron;
 *   una publicación rechazada o retirada no tiene ficha pública a la que llevarlo.
 */
export function reviewNotices(outcome: ReviewOutcome, target: Target, note: string | null, now: Date = new Date()): Prisma.NotificationCreateManyInput[] {
  const { subject, body } = COPY[outcome];
  // Las plantillas cierran el motivo con su propio punto: se quita el del admin para no duplicarlo.
  const text = body(target, note?.replace(/[\s.]+$/, "") ?? null);
  return [
    { userId: target.ownerId, channel: "email", subject, body: text, matchPropertyId: target.propertyId },
    {
      userId: target.ownerId,
      channel: "in_app",
      status: "sent",
      sentAt: now,
      subject,
      body: text,
      matchPropertyId: outcome === "approved" ? target.propertyId : null,
    },
  ];
}
