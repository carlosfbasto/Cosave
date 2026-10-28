import L from "leaflet";

/** Dispositivo cuyo puntero principal es el dedo (celular o tableta). */
export const isTouchDevice = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/**
 * Evita que el mapa «atrape» la página al hacer scroll:
 * - Con mouse, la rueda desplaza la página; el mapa solo se acerca con Ctrl (⌘ en Mac) + rueda.
 * - En pantallas táctiles, un dedo desliza la página; el mapa se mueve y se acerca con dos dedos.
 * `onHint` recibe el aviso que hay que mostrar (o null para ocultarlo).
 */
export function controlledGestures(map: L.Map, container: HTMLElement, onHint: (text: string | null) => void): () => void {
  const touch = isTouchDevice();
  const mac = /Mac|iPhone|iPad/.test(navigator.userAgent);
  map.scrollWheelZoom.disable();
  if (touch) map.dragging.disable();

  let timer: ReturnType<typeof setTimeout> | undefined;
  const hint = (text: string) => {
    onHint(text);
    clearTimeout(timer);
    timer = setTimeout(() => onHint(null), 1400);
  };

  let lastZoom = 0;
  const onWheel = (e: WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) {
      hint(`Usa ${mac ? "⌘" : "Ctrl"} + rueda del mouse para acercar o alejar el mapa`);
      return;
    }
    // Ctrl + rueda: un nivel de zoom por movimiento, alrededor del puntero (sin zoom de la página).
    e.preventDefault();
    onHint(null);
    const now = Date.now();
    if (now - lastZoom < 250) return;
    lastZoom = now;
    const point = map.mouseEventToContainerPoint(e as unknown as MouseEvent);
    map.setZoomAround(point, map.getZoom() + (e.deltaY < 0 ? 1 : -1));
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1) hint("Usa dos dedos para mover el mapa");
    else onHint(null);
  };

  container.addEventListener("wheel", onWheel, { passive: false });
  if (touch) container.addEventListener("touchmove", onTouchMove, { passive: true });
  return () => {
    clearTimeout(timer);
    container.removeEventListener("wheel", onWheel);
    container.removeEventListener("touchmove", onTouchMove);
  };
}
