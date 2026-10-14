"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { loginUrl, useSession } from "@/lib/auth";
import { useDemoUser } from "@/lib/demo-session";

/** Protege una página: sin sesión redirige a /login y vuelve aquí después. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const { user } = useDemoUser();
  const authed = !!session || !!user;
  // La sesión demo vive en localStorage: hasta montar no se sabe si existe.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (mounted && !loading && !authed) router.replace(loginUrl(pathname, "login"));
  }, [mounted, loading, authed, router, pathname]);

  if (loading || !authed) return <p className="p-8">Cargando…</p>;
  return <>{children}</>;
}
