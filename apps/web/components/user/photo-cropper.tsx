"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PHOTO_SIDE } from "@/lib/profile-photo";

const VIEW = 256; // lado (px) del recuadro de recorte en pantalla
const MAX_ZOOM = 3;

/**
 * Modal para encuadrar la foto de perfil: se arrastra la imagen dentro del círculo y se acerca con el control o la rueda.
 * `onSave` recibe el recorte exacto (cuadrado de PHOTO_SIDE px, JPG) como data URL.
 */
export function PhotoCropper({ file, onSave, onCancel }: { file: File; onSave: (dataUrl: string) => void; onCancel: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const img = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 }); // centro de la imagen respecto al centro del recuadro
  const [failed, setFailed] = useState(false);

  // Escala base: la imagen siempre cubre el recuadro; el zoom la agranda desde ahí.
  const base = size ? VIEW / Math.min(size.w, size.h) : 1;
  const scale = base * zoom;

  const clamp = (o: { x: number; y: number }, z = zoom) => {
    if (!size) return o;
    const s = base * z;
    const mx = Math.max(0, (size.w * s - VIEW) / 2);
    const my = Math.max(0, (size.h * s - VIEW) / 2);
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
  };

  function changeZoom(z: number) {
    const next = Math.min(MAX_ZOOM, Math.max(1, z));
    setZoom(next);
    setOff((o) => clamp(o, next));
  }

  function onPointerDown(e: PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
  }
  function onPointerMove(e: PointerEvent) {
    const d = drag.current;
    if (d) setOff(clamp({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y }));
  }
  function onKeyDown(e: KeyboardEvent) {
    const step = 12;
    const move = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (move) {
      e.preventDefault();
      setOff((o) => clamp({ x: o.x + move[0]!, y: o.y + move[1]! }));
    } else if (e.key === "+" || e.key === "=") changeZoom(zoom + 0.2);
    else if (e.key === "-") changeZoom(zoom - 0.2);
  }

  function save() {
    const el = img.current;
    if (!el || !size) return;
    const side = VIEW / scale; // lado del recorte en píxeles de la imagen original
    const sx = (-VIEW / 2 - off.x) / scale + size.w / 2;
    const sy = (-VIEW / 2 - off.y) / scale + size.h / 2;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = PHOTO_SIDE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return setFailed(true);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, PHOTO_SIDE, PHOTO_SIDE);
    ctx.drawImage(el, sx, sy, side, side, 0, 0, PHOTO_SIDE, PHOTO_SIDE);
    onSave(canvas.toDataURL("image/jpeg", 0.88));
  }

  return (
    <ConfirmDialog open title="Ajusta tu foto" confirmLabel="Guardar" busy={!size && !failed} onConfirm={save} onClose={onCancel}>
      <p>Arrastra la imagen para encuadrarla y usa el control para acercar. Lo que quede dentro del círculo será tu foto.</p>
      <div className="flex flex-col items-center gap-4 pt-2">
        <div
          role="group"
          tabIndex={0}
          aria-label="Área de recorte: usa las flechas para mover y + o - para acercar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={(e) => changeZoom(zoom - e.deltaY / 500)}
          onKeyDown={onKeyDown}
          style={{ width: VIEW, height: VIEW, touchAction: "none" }}
          className="relative cursor-grab select-none overflow-hidden rounded-lg bg-slate-200 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob) */}
          <img
            ref={img}
            src={url}
            alt="Foto que vas a recortar"
            draggable={false}
            onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            onError={() => setFailed(true)}
            style={
              size
                ? { position: "absolute", maxWidth: "none", width: size.w * scale, height: size.h * scale, left: VIEW / 2 - (size.w * scale) / 2 + off.x, top: VIEW / 2 - (size.h * scale) / 2 + off.y }
                : { visibility: "hidden" }
            }
          />
          {/* Máscara: oscurece lo que queda fuera del círculo */}
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white" style={{ boxShadow: "0 0 0 999px rgba(16,38,74,0.55)" }} />
        </div>
        {failed ? (
          <p role="alert" className="text-sm text-red-600">No se pudo leer esa imagen. Elige otra.</p>
        ) : (
          <label className="flex w-full items-center gap-3 text-xs font-medium text-slate-600">
            Zoom
            <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(e) => changeZoom(Number(e.target.value))} aria-label="Zoom" className="flex-1 accent-[#f5b800]" />
          </label>
        )}
      </div>
    </ConfirmDialog>
  );
}
