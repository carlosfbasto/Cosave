export const regions = [
  { code: "+52", label: "México (+52)" },
  { code: "+1", label: "Estados Unidos (+1)" },
  { code: "+34", label: "España (+34)" },
  { code: "+57", label: "Colombia (+57)" },
  { code: "+54", label: "Argentina (+54)" },
];

export const MAX_MSG = 100;
export const NAME_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** (999) 123-4567 — solo dígitos, máx. 10. */
export function formatPhone(digits: string) {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Teléfono guardado en el perfil → solo los 10 dígitos nacionales. */
export const nationalDigits = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "").slice(-10);

/** Lada del perfil si viene como "+34 …"; si no, México. */
export const regionOf = (v: string | null | undefined) =>
  regions.find((r) => (v ?? "").trim().startsWith(`${r.code} `) || (v ?? "").trim().startsWith(`${r.code}${nationalDigits(v)}`))?.code ?? "+52";

export const validateContactName = (v: string) =>
  !v.trim() ? "Escribe tu nombre." : !NAME_RE.test(v.trim()) ? "Solo letras, sin números ni símbolos." : null;
export const validateContactEmail = (v: string) =>
  !v.trim() ? "Escribe tu correo." : !EMAIL_RE.test(v.trim()) ? "Correo no válido (ej. nombre@correo.com)." : null;
export const validateContactPhone = (v: string) =>
  !v ? "Escribe tu teléfono." : v.length !== 10 ? "El teléfono debe tener 10 dígitos." : null;
