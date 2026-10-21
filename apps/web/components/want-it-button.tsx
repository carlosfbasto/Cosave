"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUrl } from "@/lib/auth";
import { useCurrentUser } from "@/lib/current-user";
import { ContactModal } from "@/components/property-detail/contact-modal";

/**
 * "Me interesa": con sesión abre el modal de contacto con el anunciante;
 * sin sesión, lleva al login y al entrar regresa a la ficha.
 */
export function WantItButton({ code, title }: { code: string; title: string }) {
  const router = useRouter();
  const { id, loading } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const authed = !!id;
  const cls =
    "cursor-pointer rounded-md bg-accent px-5 py-2 text-[0.9rem] font-semibold text-navy transition-colors hover:bg-accent-hover";
  return (
    <>
      <button
        type="button"
        className={cls}
        disabled={loading}
        onClick={() => {
          if (authed) setOpen(true);
          // Recuerda dónde estaba (lista con filtros o ficha) para "← Volver" en el login.
          else router.push(loginUrl(`/properties/${code}`, "login", "contacto", window.location.pathname + window.location.search));
        }}
      >
        Me interesa
      </button>
      <ContactModal open={open} code={code} title={title} onClose={() => setOpen(false)} />
    </>
  );
}
