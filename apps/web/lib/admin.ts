"use client";

import { useEffect, useState } from "react";
import type { PropertyStatus } from "@cosave/shared";
import { api } from "./api";

export interface AdminStats {
  properties: { published: number; pending: number; byStatus: Partial<Record<PropertyStatus, number>>; publishedByType: Record<string, number> };
  users: { total: number; byRole: Record<string, number> };
  requests: { open: number; byKind: Record<string, number> };
}

export interface AdminConfig {
  requiresApproval: boolean;
  storageConfigured: boolean;
  imageLimits: { maxCount: number; maxBytes: number; mimeTypes: string[] };
}

/** Carga un recurso de /admin una vez; `error` trae el mensaje si falla. */
export function useAdminData<T>(path: string): { data: T | null; error: string | null } {
  const [state, setState] = useState<{ path: string; data: T | null; error: string | null } | null>(null);
  useEffect(() => {
    let alive = true;
    api<T>(path)
      .then((data) => alive && setState({ path, data, error: null }))
      .catch((err) => alive && setState({ path, data: null, error: err instanceof Error ? err.message : "No se pudo cargar" }));
    return () => {
      alive = false;
    };
  }, [path]);
  const current = state && state.path === path ? state : null;
  return { data: current?.data ?? null, error: current?.error ?? null };
}
