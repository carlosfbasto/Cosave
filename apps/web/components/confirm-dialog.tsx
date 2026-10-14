"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Diálogo de confirmación (elemento <dialog> nativo: foco atrapado y Esc para cerrar). */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[min(92vw,26rem)] rounded-xl p-0 shadow-2xl backdrop:bg-navy/50">
      <div className="space-y-3 p-6">
        <h2 className="text-lg font-bold text-navy">{title}</h2>
        <div className="space-y-2 text-sm text-slate-600">{children}</div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100">
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`cursor-pointer rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${danger ? "bg-red-600 text-white hover:bg-red-700" : "bg-accent text-navy hover:bg-accent-hover"}`}
          >
            {busy ? "Un momento…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
