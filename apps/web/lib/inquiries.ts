"use client";

import { useCallback, useEffect, useState } from "react";
import type { InquiryInput, InquiryStatus, PropertyStatus } from "@cosave/shared";
import { api } from "./api";

/**
 * Consultas ("Me interesa") enviadas por el usuario. Dos modos, igual que los favoritos:
 *  - Cuenta real: se registran en el api (`POST /properties/:code/contact`, `GET /inquiries`).
 *  - Usuario demo: localStorage por usuario (equivale a la tabla `Inquiry`).
 * Una consulta nace `pending` y sigue así hasta que el anunciante responda: nunca se finge una respuesta.
 */
export interface InquiryItem {
  id: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  property: { code: string; title: string; status: PropertyStatus };
}

export interface ReceivedInquiry extends InquiryItem {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

interface ApiInquiry {
  id: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  property: { publicCode: string; title: string; status: PropertyStatus };
}

const fromApi = <T extends ApiInquiry>({ property, ...rest }: T): Omit<T, "property"> & { property: InquiryItem["property"] } => ({
  ...rest,
  property: { code: property.publicCode, title: property.title, status: property.status },
});

const key = (userId: string) => `cosave:inquiries:${userId}`;

function readLocal(userId: string): InquiryItem[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key(userId)) ?? "[]");
    return Array.isArray(v) ? (v as InquiryItem[]) : [];
  } catch {
    return [];
  }
}

/** Registra la consulta. En modo api lanza `ApiError` (409 si la publicación ya no está disponible). */
export async function sendInquiry(
  who: { id: string; remote: boolean },
  property: { code: string; title: string },
  input: InquiryInput,
): Promise<void> {
  if (who.remote) {
    await api(`/properties/${encodeURIComponent(property.code)}/contact`, { method: "POST", body: JSON.stringify(input) });
    return;
  }
  const item: InquiryItem = {
    id: crypto.randomUUID(),
    message: input.message,
    status: "pending",
    createdAt: new Date().toISOString(),
    property: { code: property.code, title: property.title, status: "published" },
  };
  try {
    localStorage.setItem(key(who.id), JSON.stringify([item, ...readLocal(who.id)]));
  } catch {
    /* almacenamiento bloqueado: se ignora */
  }
}

/** Mis consultas (más recientes primero), opcionalmente solo las de una propiedad. */
export function useMyInquiries(who: { id: string | null; remote: boolean }, propertyCode?: string) {
  const [items, setItems] = useState<InquiryItem[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (): Promise<InquiryItem[]> => {
    const userId = who.id;
    if (!userId) return [];
    if (!who.remote) return readLocal(userId).filter((i) => !propertyCode || i.property.code === propertyCode);
    const rows = await api<ApiInquiry[]>(`/inquiries${propertyCode ? `?property=${encodeURIComponent(propertyCode)}` : ""}`);
    return rows.map(fromApi);
  }, [who.id, who.remote, propertyCode]);

  const apply = useCallback((rows: InquiryItem[] | null) => {
    if (rows) setItems(rows);
    setError(!rows);
    setReady(true);
  }, []);

  const reload = useCallback(() => load().then(apply, () => apply(null)), [load, apply]);

  useEffect(() => {
    let alive = true;
    load().then(
      (rows) => alive && apply(rows),
      () => alive && apply(null),
    );
    return () => {
      alive = false;
    };
  }, [load, apply]);

  return { items, ready, error, reload };
}

/** Consultas recibidas en mis propiedades (solo cuenta real: es lo que ve el anunciante). */
export function useReceivedInquiries(enabled: boolean) {
  const [items, setItems] = useState<ReceivedInquiry[]>([]);
  useEffect(() => {
    if (!enabled) return;
    api<(ApiInquiry & Pick<ReceivedInquiry, "contactName" | "contactEmail" | "contactPhone">)[]>("/inquiries/received")
      .then((rows) => setItems(rows.map(fromApi) as ReceivedInquiry[]))
      .catch(() => setItems([]));
  }, [enabled]);
  return items;
}

/** Estado de una propiedad según el api; `null` si el api no responde o no la conoce (se asume disponible). */
export async function fetchPropertyStatus(code: string): Promise<PropertyStatus | null> {
  try {
    return (await api<{ status: PropertyStatus }>(`/properties/${encodeURIComponent(code)}`)).status;
  } catch {
    return null;
  }
}
