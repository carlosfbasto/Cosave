"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { loginUrl, useSession } from "@/lib/auth";
import { useDemoUser } from "@/lib/demo-session";

/**
 * Enlace a una acción que exige cuenta (vender, contactar…).
 * Sin sesión lleva a iniciar sesión, recordando la página actual para "← Volver",
 * y al entrar regresa a `href`.
 */
export function AuthLink({ href, onClick, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const router = useRouter();
  const { session, loading } = useSession();
  const { user } = useDemoUser();
  const authed = loading || !!session || !!user;
  return (
    <Link
      {...props}
      href={authed ? href : loginUrl(href, "login")}
      onClick={(e) => {
        onClick?.(e);
        if (authed || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        router.push(loginUrl(href, "login", undefined, window.location.pathname + window.location.search));
      }}
    />
  );
}
