"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthShell, Banner, SubmitButton, TextField } from "@/components/auth/auth-shell";
import { authFailure } from "@/lib/auth-errors";
import { getSupabase } from "@/lib/supabase";
import { showToast } from "@/lib/toast";
import { validateConfirm, validatePassword } from "@/lib/validation";

type Status = "checking" | "ready" | "expired";

/**
 * Destino del enlace del correo. Supabase abre una sesión de recuperación al cargar la página;
 * si el enlace venció o ya se usó no hay sesión y se ofrece pedir uno nuevo.
 */
export function ResetForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // El enlace vencido llega como #error=access_denied&error_code=otp_expired.
    const failed = /error/i.test(window.location.hash) || /error/i.test(window.location.search);
    let supabase;
    try {
      supabase = getSupabase();
    } catch {
      queueMicrotask(() => setStatus("expired"));
      return;
    }
    if (failed) {
      queueMicrotask(() => setStatus("expired"));
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });
    supabase.auth.getSession().then(({ data: s }) => setStatus((cur) => (cur === "ready" ? cur : s.session ? "ready" : "expired")));
    return () => data.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    const found = { password: validatePassword(password, true), confirm: validateConfirm(password, confirm) };
    setErrors(found);
    if (found.password || found.confirm) return;
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.updateUser({ password });
      if (error) throw error;
      showToast("Contraseña actualizada");
      router.push("/perfil");
    } catch (err) {
      setFormError(authFailure(err).message);
    } finally {
      setLoading(false);
    }
  }

  if (status === "checking") return <AuthShell title="Restablecer contraseña" backHref="/login" backLabel="← Volver a iniciar sesión" />;

  if (status === "expired") {
    return (
      <AuthShell title="Enlace no válido" subtitle="Este enlace venció o ya se utilizó." backHref="/login" backLabel="← Volver a iniciar sesión">
        <Link
          href="/recuperar"
          className="block rounded-md bg-accent px-4 py-3 text-center font-semibold text-navy transition-colors hover:bg-accent-hover"
        >
          Solicitar un enlace nuevo
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Restablecer contraseña" subtitle="Elige una contraseña nueva para tu cuenta." backHref="/login" backLabel="← Volver a iniciar sesión">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField id="password" label="Contraseña nueva" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" error={errors.password} />
        <TextField id="confirm" label="Confirmar contraseña" type="password" autoComplete="new-password" placeholder="Repite tu contraseña" error={errors.confirm} />
        {formError && <Banner tone="error">{formError}</Banner>}
        <SubmitButton loading={loading}>{loading ? "Guardando…" : "Guardar contraseña"}</SubmitButton>
      </form>
    </AuthShell>
  );
}
