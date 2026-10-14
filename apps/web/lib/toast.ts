"use client";

import { useSyncExternalStore } from "react";

/** Mensaje temporal (toast) global. Un solo mensaje a la vez; el último reemplaza al anterior. */
export interface Toast {
  id: number;
  message: string;
  tone: "success" | "info";
}

let current: Toast | null = null;
let nextId = 1;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function showToast(message: string, tone: Toast["tone"] = "success", ms = 3000) {
  current = { id: nextId++, message, tone };
  clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, ms);
  emit();
}

export function useToast(): Toast | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    () => current,
    () => null,
  );
}
