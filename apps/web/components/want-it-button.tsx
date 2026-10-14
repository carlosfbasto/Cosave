"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUrl, useSession } from "@/lib/auth";
import { useDemoUser } from "@/lib/demo-session";

/**
 * "Me interesa": con sesión lleva al formulario de contacto de la propiedad;
 * sin sesión, al login, y al entrar regresa al formulario.
 */
export function WantItButton({ code, variant = "card" }: { code: string; variant?: "card" | "detail" }) {
  const router = useRouter();
  const { session, loading } = useSession();
  const { user } = useDemoUser();
  const target = `/contacto/${code}`;
  const authed = loading || !!session || !!user;
  const href = authed ? target : loginUrl(target, "login", "contacto");
  const cls =
    variant === "detail"
      ? "rounded-md bg-accent px-5 py-2 text-[0.9rem] font-semibold text-navy transition-colors hover:bg-accent-hover"
      : "mt-1 block w-full rounded-md border border-navy px-3 py-2 text-center text-[0.9rem] font-semibold text-navy transition-colors hover:bg-accent hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  return (
    <Link
      href={href}
      className={cls}
      onClick={(e) => {
        if (authed || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        // Recuerda dónde estaba (lista con filtros o ficha) para "← Volver" en el login.
        e.preventDefault();
        router.push(loginUrl(target, "login", "contacto", window.location.pathname + window.location.search));
      }}
    >
      Me interesa
    </Link>
  );
}
