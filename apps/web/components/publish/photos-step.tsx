"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { IMAGE_LABEL, IMAGE_LIMITS } from "@cosave/shared";
import { ApiError } from "@/lib/api";
import { mineApi, type MyProperty } from "@/lib/my-properties";
import { card, outlineBtn } from "./form-parts";

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1).replace(".0", "");

/** Revisa un archivo antes de subirlo; devuelve el motivo del rechazo y cómo corregirlo, o null si sirve. */
function problemWith(file: File): string | null {
  if (!(IMAGE_LIMITS.mimeTypes as readonly string[]).includes(file.type)) {
    return `«${file.name}» no es una imagen permitida. Usa ${IMAGE_LABEL}.`;
  }
  if (file.size > IMAGE_LIMITS.maxBytes) {
    return `«${file.name}» pesa ${mb(file.size)} MB y el máximo es ${mb(IMAGE_LIMITS.maxBytes)} MB. Reduce su tamaño o resolución e inténtalo de nuevo.`;
  }
  return null;
}

/** Paso 2: subir fotos, elegir la principal y quitarlas. Cada cambio se guarda al instante. */
export function PhotosStep({
  property,
  onChange,
  readOnly,
}: {
  property: MyProperty;
  onChange: (p: MyProperty) => void;
  readOnly: boolean;
}) {
  const pick = useRef<HTMLInputElement>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const images = property.images;
  const room = IMAGE_LIMITS.maxCount - images.length;

  async function add(files: File[]) {
    if (!files.length) return;
    const found: string[] = [];
    const ok: File[] = [];
    for (const f of files) {
      const why = problemWith(f);
      if (why) found.push(why);
      else ok.push(f);
    }
    if (ok.length > room) {
      const skipped = ok.slice(Math.max(room, 0));
      found.push(
        `Solo puedes tener ${IMAGE_LIMITS.maxCount} fotos por propiedad. No se subieron: ${skipped.map((f) => `«${f.name}»`).join(", ")}. Elimina alguna foto para agregar otras.`,
      );
      ok.length = Math.max(room, 0);
    }
    setProblems(found);
    let current = property;
    for (const [i, f] of ok.entries()) {
      setBusy(`Subiendo ${i + 1} de ${ok.length}…`);
      try {
        current = await mineApi.uploadImage(property.id, f);
        onChange(current);
      } catch (err) {
        setProblems((prev) => [...prev, `«${f.name}»: ${err instanceof ApiError ? err.message : "no se pudo subir, inténtalo de nuevo."}`]);
      }
    }
    setBusy(null);
  }

  async function run(label: string, fn: () => Promise<MyProperty>) {
    setBusy(label);
    setProblems([]);
    try {
      onChange(await fn());
    } catch (err) {
      setProblems([err instanceof Error ? err.message : "No se pudo completar la acción"]);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={card}>
      <div>
        <h2 className="text-lg font-bold text-navy">Fotografías</h2>
        <p className="text-sm text-slate-600">
          Formatos {IMAGE_LABEL}. Máximo {IMAGE_LIMITS.maxCount} fotos de {mb(IMAGE_LIMITS.maxBytes)} MB cada una. La primera es la principal y se ve en los resultados.
        </p>
      </div>

      {!readOnly && (
        <div>
          <input
            ref={pick}
            type="file"
            multiple
            accept={IMAGE_LIMITS.mimeTypes.join(",")}
            hidden
            onChange={(e) => {
              void add([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
          <button type="button" disabled={!!busy || room <= 0} onClick={() => pick.current?.click()} className={outlineBtn}>
            {room <= 0 ? "Llegaste al máximo de fotos" : "Agregar fotos"}
          </button>
          <span className="ml-3 text-xs text-slate-500">{images.length} de {IMAGE_LIMITS.maxCount}</span>
          {busy && <span role="status" className="ml-3 text-sm text-slate-600">{busy}</span>}
        </div>
      )}

      {problems.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}

      {images.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Aún no hay fotos. Agrega al menos una para poder enviar tu propiedad.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((img, i) => (
            <li key={img.id} className="overflow-hidden rounded-lg border border-slate-200">
              <div className="relative aspect-[4/3]">
                <Image src={img.url} alt={`Foto ${i + 1}`} fill sizes="(min-width: 640px) 220px, 45vw" className="object-cover" />
                {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-navy shadow">Principal</span>}
              </div>
              {!readOnly && (
                <div className="flex items-center justify-between gap-2 p-2 text-xs font-semibold">
                  {i === 0 ? (
                    <span className="text-slate-500">Foto principal</span>
                  ) : (
                    <button type="button" disabled={!!busy} onClick={() => void run("Cambiando la principal…", () => mineApi.setCover(property.id, img.id))} className="cursor-pointer text-navy underline disabled:opacity-50">
                      Hacer principal
                    </button>
                  )}
                  <button type="button" disabled={!!busy} onClick={() => void run("Quitando…", () => mineApi.deleteImage(property.id, img.id))} className="cursor-pointer text-slate-600 underline hover:text-red-600 disabled:opacity-50">
                    Quitar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
