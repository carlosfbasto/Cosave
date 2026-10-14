"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** El panel de administración tiene su propia interfaz: no lleva el header ni el footer públicos. */
export function HideOnAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname === "/admin" || pathname.startsWith("/admin/") ? null : <>{children}</>;
}
