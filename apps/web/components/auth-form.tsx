"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner, linkCls, AuthShell, SubmitButton, TextField } from "@/components/auth/auth-shell";
import { loginUrl, safeFrom, safeNext, useAuthState } from "@/lib/auth";
import { authFailure } from "@/lib/auth-errors";
import { findDemoCredential } from "@/lib/demo-credentials";
import { useDemoUser } from "@/lib/demo-session";
import { getSupabase } from "@/lib/supabase";
import { validateConfirm, validateEmail, validateName, validatePassword } from "@/lib/validation";

type Field = "fullName" | "email" | "password" | "confirm";
type Errors = Partial<Record<Field, string>>;

const REASON_TEXT = {
  favorito: "Inicia sesión para guardar esta propiedad y consultarla cuando quieras.",
  contacto: "Inicia sesión para contactar al anunciante de esta propiedad.",
} as const;

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasNext = !!searchParams.get("next");
  const next = safeNext(searchParams.get("next"));
  const motivo = searchParams.get("motivo");
  const reason = motivo === "favorito" || motivo === "contacto" ? motivo : undefined;
  const { signIn: demoSignIn } = useDemoUser();
  const { session, authed, demo, loading: sessionLoading } = useAuthState();
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [existing, setExisting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Entre iniciar sesión y navegar, la sesión ya existe: no se debe mostrar "ya tienes sesión".
  const [redirecting, setRedirecting] = useState(false);
  const isRegister = mode === "register";
  const title = isRegister ? "Crear cuenta" : "Iniciar sesión";
  // "← Volver": a la página de origen; para favoritos, a la propiedad; si no se sabe, al inicio
  // (nunca a `next` en una página privada, que redirigiría de nuevo aquí).
  const from = safeFrom(searchParams.get("volver"));
  const backHref = from ?? (reason === "favorito" && hasNext ? next : "/home");

  if (sessionLoading && !redirecting) {
    return <AuthShell title={title} backHref={backHref} />;
  }

  // U12: con sesión activa no se vuelve a pedir registro ni login.
  if (authed && !redirecting) {
    return (
      <AuthShell title="Ya iniciaste sesión" subtitle="No necesitas crear otra cuenta." backHref={backHref}>
        <div className="flex flex-col gap-3">
          <Link
            href={hasNext ? next : "/home"}
            className="rounded-lg bg-ink px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-ink-hover"
          >
            Continuar
          </Link>
          <Link
            href={session ? `/profile/${session.user.id}` : demo ? `/profile/${demo.id}` : "/perfil"}
            className="rounded-lg border border-slate-300 px-4 py-3 text-center font-semibold text-ink transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            Ir a mi perfil
          </Link>
        </div>
      </AuthShell>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setExisting(false);
    setNotice(null);
    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("fullName") ?? "");
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    const found: Errors = {
      email: validateEmail(email),
      password: validatePassword(password, isRegister),
      ...(isRegister ? { fullName: validateName(fullName), confirm: validateConfirm(password, confirm) } : {}),
    };
    const clean = Object.fromEntries(Object.entries(found).filter(([, v]) => v)) as Errors;
    setErrors(clean);
    if (Object.keys(clean).length) return;

    setLoading(true);
    try {
      if (!isRegister) {
        // Usuarios ficticios: entran directo a su perfil (o a la ruta pedida en `next`).
        const demoUser = findDemoCredential(email, password);
        if (demoUser) {
          setRedirecting(true);
          demoSignIn(demoUser.userId);
          router.push(hasNext ? next : `/profile/${demoUser.userId}`);
          return;
        }
      }
      const supabase = getSupabase();
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}${next}`,
          },
        });
        if (error) throw error;
        // Con confirmación de correo activa, Supabase no da error si el correo ya existe: devuelve un usuario sin identidades.
        if (data.user && data.user.identities?.length === 0) {
          setExisting(true);
          setFormError("Este correo ya está registrado.");
          return;
        }
        if (!data.session) {
          setNotice("Te enviamos un correo para confirmar tu cuenta. Ábrelo para activar el acceso.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      setRedirecting(true);
      router.push(next);
    } catch (err) {
      setRedirecting(false);
      const failure = authFailure(err);
      setExisting(!!failure.existing);
      setFormError(failure.message);
    } finally {
      setLoading(false);
    }
  }

  const otherMode = isRegister ? "login" : "registro";
  // Sin `next` explícito no se inventa uno: así "Volver" no apunta a una página privada.
  const altHref = (mode: "login" | "registro") => (hasNext ? loginUrl(next, mode, reason, from ?? undefined) : `/${mode}`);
  return (
    <AuthShell title={title} subtitle={isRegister ? "Es gratis y toma un minuto." : "Bienvenido de nuevo a COSAVE."} backHref={backHref}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {reason && <Banner tone="info">{REASON_TEXT[reason]}</Banner>}
        {isRegister && (
          <TextField id="fullName" label="Nombre completo" maxLength={120} autoComplete="name" placeholder="Tu nombre" error={errors.fullName} />
        )}
        <TextField id="email" label="Correo" type="email" autoComplete="email" placeholder="nombre@correo.com" error={errors.email} />
        <TextField
          id="password"
          label="Contraseña"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          placeholder={isRegister ? "Mínimo 8 caracteres" : "Tu contraseña"}
          error={errors.password}
        />
        {isRegister && (
          <TextField id="confirm" label="Confirmar contraseña" type="password" autoComplete="new-password" placeholder="Repite tu contraseña" error={errors.confirm} />
        )}
        {!isRegister && (
          <Link href="/recuperar" className="-mt-2 self-end text-sm text-slate-600 underline transition-colors hover:text-ink">
            ¿Olvidaste tu contraseña?
          </Link>
        )}
        {formError && (
          <Banner tone="error">
            {formError}
            {existing && (
              <>
                {" "}
                <Link href={altHref("login")} className={linkCls}>
                  Iniciar sesión
                </Link>
              </>
            )}
          </Banner>
        )}
        {notice && <Banner tone="success">{notice}</Banner>}
        <SubmitButton loading={loading}>{loading ? "Enviando…" : isRegister ? "Registrarme" : "Entrar"}</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        {isRegister ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
        <Link href={altHref(otherMode)} className={linkCls}>
          {isRegister ? "Inicia sesión" : "Regístrate"}
        </Link>
      </p>
    </AuthShell>
  );
}
