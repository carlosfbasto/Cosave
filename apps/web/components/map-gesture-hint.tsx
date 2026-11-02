/** Aviso sobre el mapa que explica el gesto (Ctrl + rueda, dos dedos). Ver `controlledGestures`. */
export function MapGestureHint({ text }: { text: string | null }) {
  return (
    <div
      aria-live="polite"
      className={`pointer-events-none absolute inset-0 z-[600] grid place-items-center bg-ink/45 p-6 text-center text-sm font-semibold text-white transition-opacity duration-200 ${
        text ? "opacity-100" : "opacity-0"
      }`}
    >
      {text}
    </div>
  );
}
