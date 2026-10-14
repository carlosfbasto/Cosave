import { PASSWORD_MIN } from "./validation";

export interface AuthFailure {
  message: string;
  /** El correo ya tiene cuenta: la pantalla ofrece iniciar sesión. */
  existing?: boolean;
}

/**
 * Traduce errores de Supabase Auth a mensajes en español que no revelan información sensible
 * (por ejemplo, no distingue "correo inexistente" de "contraseña incorrecta").
 */
export function authFailure(err: unknown): AuthFailure {
  const e = (err ?? {}) as { code?: string; message?: string; status?: number; name?: string };
  const code = e.code ?? "";
  const msg = e.message ?? "";

  if (code === "user_already_exists" || /already registered/i.test(msg)) {
    return { message: "Este correo ya está registrado.", existing: true };
  }
  if (code === "invalid_credentials" || /invalid login credentials/i.test(msg)) {
    return { message: "Correo o contraseña incorrectos." };
  }
  if (code === "email_not_confirmed" || /not confirmed/i.test(msg)) {
    return { message: "Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada." };
  }
  if (code === "weak_password") {
    return { message: `La contraseña es demasiado débil. Usa al menos ${PASSWORD_MIN} caracteres.` };
  }
  if (code === "same_password") {
    return { message: "Elige una contraseña distinta a la actual." };
  }
  if (e.status === 429 || /rate_limit/.test(code)) {
    return { message: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
  }
  if (/fetch|network/i.test(msg) || e.name === "AuthRetryableFetchError") {
    return { message: "No hay conexión con el servidor. Inténtalo de nuevo." };
  }
  if (/Faltan NEXT_PUBLIC/.test(msg)) {
    return { message: "El acceso no está disponible por ahora." };
  }
  return { message: "No se pudo completar la acción. Inténtalo de nuevo." };
}
