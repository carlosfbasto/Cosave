"use client";

import { useToast } from "@/lib/toast";

/** Muestra el mensaje temporal activo (ver `showToast`). Se monta una vez en el layout. */
export function ToastHost() {
  const toast = useToast();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[1200] flex justify-center px-4">
      {toast && (
        <p
          key={toast.id}
          role="status"
          className={`rounded-lg px-5 py-3 text-sm font-semibold shadow-veil ${
            toast.tone === "success" ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-slate-200"
          }`}
        >
          {toast.tone === "success" && <span className="mr-2 text-azure">✓</span>}
          {toast.message}
        </p>
      )}
    </div>
  );
}
