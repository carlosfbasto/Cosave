/**
 * Acción pendiente: lo que el visitante intentó hacer antes de iniciar sesión (hoy: guardar un favorito).
 * Se guarda en localStorage (sobrevive al correo de confirmación en otra pestaña) con caducidad corta,
 * para no ejecutar algo que la persona ya olvidó.
 */
const KEY = "cosave:pending-action";
const TTL_MS = 15 * 60 * 1000;

export function setPendingFavorite(code: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ type: "favorite", code, at: Date.now() }));
  } catch {
    /* almacenamiento bloqueado: se pierde la acción, el usuario puede repetirla */
  }
}

/** Devuelve el código del favorito pendiente (si no caducó) y lo borra: solo se ejecuta una vez. */
export function takePendingFavorite(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return null;
    const { type, code, at } = v as Record<string, unknown>;
    return type === "favorite" && typeof code === "string" && typeof at === "number" && Date.now() - at < TTL_MS ? code : null;
  } catch {
    return null;
  }
}
