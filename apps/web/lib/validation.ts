/** Validaciones de formularios de cuenta. Devuelven el mensaje de error o undefined si es válido. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PASSWORD_MIN = 8;

export function validateEmail(v: string): string | undefined {
  if (!v.trim()) return "Escribe tu correo.";
  if (!EMAIL_RE.test(v.trim())) return "Correo no válido (ej. nombre@correo.com).";
}

export function validateName(v: string): string | undefined {
  if (!v.trim()) return "Escribe tu nombre completo.";
}

/** `isNew`: al crear contraseña se exige el mínimo; al entrar solo que no esté vacía. */
export function validatePassword(v: string, isNew: boolean): string | undefined {
  if (!v) return "Escribe tu contraseña.";
  if (isNew && v.length < PASSWORD_MIN) return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
}

export function validateConfirm(password: string, confirm: string): string | undefined {
  if (!confirm) return "Confirma tu contraseña.";
  if (password !== confirm) return "Las contraseñas no coinciden.";
}
