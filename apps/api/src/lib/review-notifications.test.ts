import { describe, expect, it } from "vitest";
import { reviewNotices } from "./review-notifications.js";

const target = { ownerId: "owner-1", propertyId: "prop-1", title: "Casa con alberca", code: "COS-001003" };
const now = new Date("2026-11-05T12:00:00Z");
const pick = (rows: ReturnType<typeof reviewNotices>, channel: string) => rows.find((r) => r.channel === channel)!;

describe("reviewNotices", () => {
  it("crea siempre un aviso de email y uno dentro de la app, para el dueño", () => {
    for (const outcome of ["approved", "rejected", "archived"] as const) {
      const rows = reviewNotices(outcome, target, "motivo", now);
      expect(rows.map((r) => r.channel).sort()).toEqual(["email", "in_app"]);
      expect(rows.every((r) => r.userId === "owner-1")).toBe(true);
    }
  });

  it("el aviso in_app sale como enviado y con la hora indicada; el de email queda pendiente", () => {
    const rows = reviewNotices("approved", target, null, now);
    expect(pick(rows, "in_app")).toMatchObject({ status: "sent", sentAt: now });
    expect(pick(rows, "email").status).toBeUndefined();
    expect(pick(rows, "email").sentAt).toBeUndefined();
  });

  it("al aprobar, avisa y enlaza a la propiedad en ambos canales", () => {
    const rows = reviewNotices("approved", target, null, now);
    expect(pick(rows, "in_app").subject).toBe("Tu propiedad ya está publicada");
    expect(pick(rows, "in_app").body).toContain("COS-001003");
    expect(pick(rows, "in_app").matchPropertyId).toBe("prop-1");
    expect(pick(rows, "email").matchPropertyId).toBe("prop-1");
  });

  it("al rechazar, incluye el motivo y no enlaza el aviso in_app a una ficha inexistente", () => {
    const rows = reviewNotices("rejected", target, "Las fotos están borrosas", now);
    const inApp = pick(rows, "in_app");
    expect(inApp.subject).toBe("Tu publicación necesita cambios");
    expect(inApp.body).toContain("Motivo: Las fotos están borrosas.");
    expect(inApp.matchPropertyId).toBeNull();
    expect(pick(rows, "email").matchPropertyId).toBe("prop-1");
  });

  it("al retirar, incluye el motivo y no enlaza el aviso in_app", () => {
    const rows = reviewNotices("archived", target, "Dato duplicado", now);
    const inApp = pick(rows, "in_app");
    expect(inApp.subject).toBe("Tu publicación fue retirada");
    expect(inApp.body).toContain("Motivo: Dato duplicado.");
    expect(inApp.matchPropertyId).toBeNull();
  });

  it("no duplica el punto cuando el motivo ya termina en punto o espacios", () => {
    for (const outcome of ["rejected", "archived"] as const) {
      const body = pick(reviewNotices(outcome, target, "Fotos borrosas. ", now), "in_app").body;
      expect(body).toContain("Motivo: Fotos borrosas.");
      expect(body).not.toContain("..");
    }
  });

  it("el texto del email y el de la campana es el mismo", () => {
    const rows = reviewNotices("rejected", target, "x", now);
    expect(pick(rows, "email").body).toBe(pick(rows, "in_app").body);
    expect(pick(rows, "email").subject).toBe(pick(rows, "in_app").subject);
  });
});
