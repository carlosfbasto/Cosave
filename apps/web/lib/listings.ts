"use client";

import type { PropertyDraft } from "@cosave/shared";

/**
 * Propiedades enviadas a publicar (DEMO: localStorage por usuario).
 * Equivale a crear una `Property` en estado `draft` hasta que exista `POST /properties` (Etapa 2).
 */
export interface SubmittedListing extends PropertyDraft {
  id: string;
  ownerId: string;
  status: "draft";
  createdAt: string;
}

const key = (ownerId: string) => `cosave:listings:${ownerId}`;

export function saveListing(ownerId: string, draft: PropertyDraft): SubmittedListing {
  const listing: SubmittedListing = { ...draft, id: crypto.randomUUID(), ownerId, status: "draft", createdAt: new Date().toISOString() };
  try {
    const prev: unknown = JSON.parse(localStorage.getItem(key(ownerId)) ?? "[]");
    localStorage.setItem(key(ownerId), JSON.stringify([listing, ...(Array.isArray(prev) ? prev : [])]));
  } catch {
    /* almacenamiento bloqueado: se ignora */
  }
  return listing;
}

/** Texto guardado (o "[]"); null en el servidor o si el almacenamiento falla. Sirve de snapshot estable. */
export function listingsSnapshot(ownerId: string): string | null {
  try {
    return localStorage.getItem(key(ownerId)) ?? "[]";
  } catch {
    return null;
  }
}

export function parseListings(raw: string): SubmittedListing[] {
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? (v as SubmittedListing[]) : [];
  } catch {
    return [];
  }
}
