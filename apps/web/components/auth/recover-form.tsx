"use client";

import { useState, type FormEvent } from "react";
import { AuthShell, Banner, SubmitButton, TextField } from "@/components/auth/auth-shell";
import { authFailure } from "@/lib/auth-errors";
import { getSupabase } from "@/lib/supabase";
import { validateEmail } from "@/lib/validation";

/** Pide el correo y envía el enlace de recuperación. La respuesta es la misma exista o no la cuenta. */
export function RecoverForm() {
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    const invalid = validateEmail(email);
    setError(invalid);
    if (invalid) return;
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/restablecer`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setFormError(authFailure(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Escribe tu correo y te enviaremos un enlace para elegir una contraseña nueva."
      backHref="/login"
      backLabel="← Volver a iniciar sesión"
    >
      {sent ? (
        <div className="space-y-4">
          <Banner tone="success">Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.</Banner>
          <button type="button" onClick={() => setSent(false)} className="cursor-pointer text-sm font-semibold text-ink underline">
            Usar otro correo
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <TextField id="email" label="Correo" type="email" autoComplete="email" placeholder="nombre@correo.com" error={error} />
          {formError && <Banner tone="error">{formError}</Banner>}
          <SubmitButton loading={loading}>{loading ? "Enviando…" : "Enviar enlace"}</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
