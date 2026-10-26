import { Router } from "express";
import { z } from "zod";
import { AUDIT_ACTIONS, canTransition, IMAGE_LIMITS, PROPERTY_STATUSES, userRoleSchema } from "@cosave/shared";
import { auditCreate } from "../lib/audit.js";
import { env } from "../lib/env.js";
import { handler, HttpError } from "../lib/errors.js";
import { moveStatus } from "../lib/property-service.js";
import { ownerView, propertyInclude } from "../lib/property-view.js";
import { prisma } from "../lib/prisma.js";
import { notifySavedSearchMatches } from "../lib/search-matching.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: userRoleSchema.optional(),
  q: z.string().trim().min(1).optional(),
});

adminRouter.get(
  "/users",
  handler(async (req, res) => {
    const { page, pageSize, role, q } = listQuery.parse(req.query);
    const where = {
      ...(role && { role }),
      ...(q && { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { fullName: { contains: q, mode: "insensitive" as const } }] }),
    };
    const [data, total] = await Promise.all([
      prisma.profile.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.profile.count({ where }),
    ]);
    res.json({ data, meta: { page, pageSize, total } });
  }),
);

adminRouter.patch(
  "/users/:id/role",
  handler(async (req, res) => {
    const id = z.string().uuid().parse(req.params["id"]);
    const { role } = z.object({ role: userRoleSchema }).strict().parse(req.body);
    if (id === req.user!.id) throw new HttpError(400, "invalid", "No puedes cambiar tu propio rol");
    const current = await prisma.profile.findUnique({ where: { id }, select: { role: true } });
    if (!current) throw new HttpError(404, "not_found", "Usuario no encontrado");
    const [profile] = await prisma.$transaction([
      prisma.profile.update({ where: { id }, data: { role } }),
      ...(current.role !== role
        ? [auditCreate({ actorId: req.user!.id, action: "user.role_changed", entityType: "profile", entityId: id, before: { role: current.role }, after: { role } })]
        : []),
    ]);
    res.json({ data: profile });
  }),
);

const propertyList = z.object({
  status: z.enum(PROPERTY_STATUSES).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** Todas las propiedades (opcionalmente por estado y búsqueda). Las pendientes salen de la más antigua a la más nueva. */
adminRouter.get(
  "/properties",
  handler(async (req, res) => {
    const { status, q, page, pageSize } = propertyList.parse(req.query);
    const where = {
      ...(status && { status }),
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { publicCode: { contains: q, mode: "insensitive" as const } },
          { location: { is: { city: { contains: q, mode: "insensitive" as const } } } },
          { owner: { is: { fullName: { contains: q, mode: "insensitive" as const } } } },
        ],
      }),
    };
    const [rows, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy: status === "pending" ? { submittedAt: "asc" } : { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { ...propertyInclude, owner: { select: { fullName: true, email: true } } },
      }),
      prisma.property.count({ where }),
    ]);
    res.json({ data: rows.map((p) => ({ ...ownerView(p), owner: p.owner })), meta: { page, pageSize, total } });
  }),
);

/** Cifras reales para el resumen y los reportes. */
adminRouter.get(
  "/stats",
  handler(async (_req, res) => {
    const [byStatus, byType, byRole, openRequests, requestsByKind] = await Promise.all([
      prisma.property.groupBy({ by: ["status"], _count: true }),
      prisma.property.groupBy({ by: ["type"], where: { status: "published" }, _count: true }),
      prisma.profile.groupBy({ by: ["role"], _count: true }),
      prisma.sellerRequest.count({ where: { status: "open" } }),
      prisma.sellerRequest.groupBy({ by: ["kind"], _count: true }),
    ]);
    const count = <T extends { _count: number }>(rows: T[], key: keyof T) => Object.fromEntries(rows.map((r) => [String(r[key]), r._count]));
    const properties = count(byStatus, "status");
    res.json({
      data: {
        properties: { published: properties["published"] ?? 0, pending: properties["pending"] ?? 0, byStatus: properties, publishedByType: count(byType, "type") },
        users: { total: byRole.reduce((n, r) => n + r._count, 0), byRole: count(byRole, "role") },
        requests: { open: openRequests, byKind: count(requestsByKind, "kind") },
      },
    });
  }),
);

const reviewBody = z
  .object({ decision: z.enum(["approve", "reject"]), note: z.string().trim().max(500).optional() })
  .strict()
  .refine((b) => b.decision === "approve" || !!b.note, { message: "Indica el motivo del rechazo", path: ["note"] });

/** Aprueba o rechaza una publicación pendiente y avisa al dueño. */
adminRouter.post(
  "/properties/:id/review",
  handler(async (req, res) => {
    const id = z.string().uuid().parse(req.params["id"]);
    const { decision, note } = reviewBody.parse(req.body);
    const p = await prisma.property.findUnique({ where: { id }, include: propertyInclude });
    if (!p) throw new HttpError(404, "not_found", "Propiedad no encontrada");
    if (p.status !== "pending") throw new HttpError(409, "invalid_transition", "Solo se revisan publicaciones pendientes");
    const to = decision === "approve" ? "published" : "rejected";
    await moveStatus(p, to, req.user!.id, {
      note,
      data: { reviewNote: decision === "reject" ? note : null },
      audit: {
        actorId: req.user!.id,
        action: "property.reviewed",
        entityType: "property",
        entityId: p.id,
        before: { status: p.status },
        after: { status: to, decision, ...(note && { note }) },
      },
    });
    await prisma.notification.create({
      data: {
        userId: p.ownerId,
        channel: "email",
        subject: decision === "approve" ? "Tu propiedad ya está publicada" : "Tu publicación necesita cambios",
        body:
          decision === "approve"
            ? `«${p.title}» (${p.publicCode}) fue aprobada y ya es visible en COSAVE.`
            : `«${p.title}» (${p.publicCode}) no fue aprobada. Motivo: ${note}. Puedes corregirla y enviarla de nuevo.`,
        matchPropertyId: p.id,
      },
    });
    const fresh = await prisma.property.findUniqueOrThrow({ where: { id }, include: propertyInclude });
    // Avisar a quien guardó una búsqueda que coincide. Si falla, la aprobación ya quedó hecha.
    if (decision === "approve") await notifySavedSearchMatches(fresh).catch((err: unknown) => console.error("Coincidencias de búsquedas guardadas:", err));
    res.json({ data: ownerView(fresh) });
  }),
);

/** Retira una publicación (visible, pausada o pendiente) con una nota; queda en el historial. */
adminRouter.post(
  "/properties/:id/archive",
  handler(async (req, res) => {
    const id = z.string().uuid().parse(req.params["id"]);
    const { note } = z.object({ note: z.string().trim().min(1, "Indica el motivo").max(500) }).strict().parse(req.body);
    const p = await prisma.property.findUnique({ where: { id }, include: propertyInclude });
    if (!p) throw new HttpError(404, "not_found", "Propiedad no encontrada");
    if (!canTransition(p.status, "archived", "admin", p.operation)) {
      throw new HttpError(409, "invalid_transition", "Solo se puede retirar una publicación visible o pausada");
    }
    await moveStatus(p, "archived", req.user!.id, {
      note,
      audit: {
        actorId: req.user!.id,
        action: "property.archived_by_admin",
        entityType: "property",
        entityId: p.id,
        before: { status: p.status },
        after: { status: "archived", note },
      },
    });
    await prisma.notification.create({
      data: {
        userId: p.ownerId,
        channel: "email",
        subject: "Tu publicación fue retirada",
        body: `«${p.title}» (${p.publicCode}) fue retirada por el equipo de COSAVE. Motivo: ${note}.`,
        matchPropertyId: p.id,
      },
    });
    const fresh = await prisma.property.findUniqueOrThrow({ where: { id }, include: propertyInclude });
    res.json({ data: ownerView(fresh) });
  }),
);

const requestList = z.object({
  status: z.enum(["open", "assigned", "closed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** Solicitudes de vendedores (publicar solo, buscar asesor o servicios). */
adminRouter.get(
  "/seller-requests",
  handler(async (req, res) => {
    const { status, page, pageSize } = requestList.parse(req.query);
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
      prisma.sellerRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, kind: true, status: true, notes: true, createdAt: true, seller: { select: { fullName: true, email: true } } },
      }),
      prisma.sellerRequest.count({ where }),
    ]);
    res.json({ data, meta: { page, pageSize, total } });
  }),
);

adminRouter.patch(
  "/seller-requests/:id",
  handler(async (req, res) => {
    const id = z.string().uuid().parse(req.params["id"]);
    const { status } = z.object({ status: z.enum(["open", "assigned", "closed"]) }).strict().parse(req.body);
    const exists = await prisma.sellerRequest.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new HttpError(404, "not_found", "Solicitud no encontrada");
    const data = await prisma.sellerRequest.update({ where: { id }, data: { status }, select: { id: true, kind: true, status: true } });
    res.json({ data });
  }),
);

/** Configuración vigente (solo lectura: se cambia con variables de entorno). */
adminRouter.get("/config", (_req, res) => {
  res.json({
    data: {
      requiresApproval: env.PUBLISH_REQUIRES_APPROVAL,
      storageConfigured: !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
      imageLimits: { maxCount: IMAGE_LIMITS.maxCount, maxBytes: IMAGE_LIMITS.maxBytes, mimeTypes: IMAGE_LIMITS.mimeTypes },
    },
  });
});

const auditQuery = z.object({
  entityType: z.enum(["profile", "property"]).optional(),
  entityId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  action: z.enum(AUDIT_ACTIONS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

/** Bitácora de acciones importantes, más recientes primero, con el nombre de quién las hizo. */
adminRouter.get(
  "/audit",
  handler(async (req, res) => {
    const { page, pageSize, ...filters } = auditQuery.parse(req.query);
    const where = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined));
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.auditLog.count({ where }),
    ]);
    const actors = new Map(
      (await prisma.profile.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.actorId))] } }, select: { id: true, fullName: true, email: true } })).map(
        (a) => [a.id, a],
      ),
    );
    res.json({ data: rows.map((r) => ({ ...r, actor: actors.get(r.actorId) ?? null })), meta: { page, pageSize, total } });
  }),
);
