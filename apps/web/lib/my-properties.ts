"use client";

import { useCallback, useEffect, useState } from "react";
import type { OperationType, PropertyPatch, PropertyStatus, PropertyType } from "@cosave/shared";
import { api } from "./api";

/** Mi propiedad tal como la entrega `GET /me/properties` (todos los estados). */
export interface MyProperty {
  id: string;
  code: string;
  type: PropertyType;
  operation: OperationType;
  status: PropertyStatus;
  title: string;
  description: string | null;
  price: number;
  state: string;
  city: string;
  zone: string | null;
  address: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpots: number | null;
  landAreaM2: number | null;
  builtAreaM2: number | null;
  reviewNote: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  images: { id: string; url: string; position: number }[];
  pendingInquiries?: number;
  history?: { from: PropertyStatus; to: PropertyStatus; note: string | null; at: string }[];
}

const json = (body: unknown) => JSON.stringify(body);

export const mineApi = {
  list: () => api<MyProperty[]>("/me/properties"),
  get: (id: string) => api<MyProperty>(`/me/properties/${id}`),
  create: (input: PropertyPatch) => api<MyProperty>("/me/properties", { method: "POST", body: json(input) }),
  patch: (id: string, input: PropertyPatch) => api<MyProperty>(`/me/properties/${id}`, { method: "PATCH", body: json(input) }),
  submit: (id: string, confirmDuplicate = false) => api<MyProperty>(`/me/properties/${id}/submit`, { method: "POST", body: json({ confirmDuplicate }) }),
  setStatus: (id: string, to: PropertyStatus) => api<MyProperty>(`/me/properties/${id}/status`, { method: "POST", body: json({ to }) }),
  uploadImage: (id: string, file: File) =>
    api<MyProperty>(`/me/properties/${id}/images`, { method: "POST", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } }),
  deleteImage: (id: string, imageId: string) => api<MyProperty>(`/me/properties/${id}/images/${imageId}`, { method: "DELETE" }),
  setCover: (id: string, imageId: string) => api<MyProperty>(`/me/properties/${id}/images/${imageId}/cover`, { method: "PATCH" }),
};

/** Mis propiedades con recarga manual. */
export function useMyProperties(enabled: boolean) {
  const [items, setItems] = useState<MyProperty[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    mineApi
      .list()
      .then((rows) => alive && setItems(rows))
      .catch((err) => alive && setError(err instanceof Error ? err.message : "No se pudieron cargar tus propiedades"));
    return () => {
      alive = false;
    };
  }, [enabled]);

  const replace = useCallback((next: MyProperty) => setItems((prev) => prev && prev.map((p) => (p.id === next.id ? { ...p, ...next } : p))), []);
  return { items, error, replace };
}
