"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { BLURRY_IMAGE_MESSAGE, IMAGE_LABEL, IMAGE_LIMITS, laplacianVariance, SHARPNESS } from "@cosave/shared";
import { ApiError } from "@/lib/api";
import { mineApi, type MyProperty } from "@/lib/my-properties";
import { card, Icon, outlineBtn } from "./form-parts";

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1).replace(".0", "");

/** «No se pudo cargar «foto.jpg»: <motivo>». */
const failed = (file: File, why: string) => `No se pudo cargar «${file.name}»: ${why.charAt(0).toLowerCase()}${why.slice(1)}`;

/** Revisa un archivo antes de subirlo; devuelve el motivo del rechazo y cómo corregirlo, o null si sirve. */
function problemWith(file: File): string | null {
  if (!(IMAGE_LIMITS.mimeTypes as readonly string[]).includes(file.type)) {
    return failed(file, `no es una imagen permitida. Usa ${IMAGE_LABEL}.`);
  }
  if (file.size > IMAGE_LIMITS.maxBytes) {
    return failed(file, `pesa ${mb(file.size)} MB y el máximo es ${mb(IMAGE_LIMITS.maxBytes)} MB. Reduce su tamaño o resolución e inténtalo de nuevo.`);
  }
  return null;
}

/**
 * Nitidez de la foto en el navegador, con el mismo cálculo que el api (`SHARPNESS`, `laplacianVariance`):
 * se reduce a 800 px por el lado mayor, se pasa a grises y se miden los bordes.
 */
async function measureSharpness(file: File): Promise<number> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, SHARPNESS.size / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("sin canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const rgba = ctx.getImageData(0, 0, w, h).data;
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0; i < gray.length; i++) gray[i] = 0.299 * rgba[i * 4]! + 0.587 * rgba[i * 4 + 1]! + 0.114 * rgba[i * 4 + 2]!;
  return laplacianVariance(gray, w, h);
}

/** Paso 2: subir fotos (botón o arrastrando), elegir la portada y quitarlas. Cada cambio se guarda al instante. */
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
  const [over, setOver] = useState(false);
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
      const of = ok.length > 1 ? ` (${i + 1} de ${ok.length})` : "";
      // Primero se revisa la nitidez aquí mismo: una foto borrosa ni siquiera se envía.
      setBusy(`Revisando la nitidez de «${f.name}»${of}…`);
      const score = await measureSharpness(f).catch(() => null);
      if (score !== null && score < SHARPNESS.min) {
        setProblems((prev) => [...prev, failed(f, BLURRY_IMAGE_MESSAGE)]);
        continue;
      }
      setBusy(`Subiendo «${f.name}»${of}…`);
      try {
        current = await mineApi.uploadImage(property.id, f);
        onChange(current);
      } catch (err) {
        setProblems((prev) => [...prev, failed(f, err instanceof ApiError ? err.message : "no se pudo subir, inténtalo de nuevo.")]);
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

  const canAdd = !readOnly && !busy && room > 0;

  return (
    <section className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="headline-sm text-ink">Fotografías</h2>
          <p className="mt-1 text-sm text-slate-600">
            Formatos {IMAGE_LABEL}, hasta {mb(IMAGE_LIMITS.maxBytes)} MB cada una. La foto de portada es la que se ve en los resultados de búsqueda.
          </p>
        </div>
        <span className="label-sm rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
          {images.length} de {IMAGE_LIMITS.maxCount} fotos
        </span>
      </div>

      {!readOnly && (
        <div
          onDragOver={(e) => {
            if (!canAdd) return;
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            if (canAdd) void add([...e.dataTransfer.files]);
          }}
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            over ? "border-azure bg-sky-50" : "border-slate-300 bg-slate-50"
          }`}
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-azure shadow-sm ring-1 ring-slate-200">
            <Icon className="h-7 w-7"><path d="M7 18a4 4 0 01-.5-8 6 6 0 0111.5 1.5A3.5 3.5 0 0117.5 18M12 12v8M9 15l3-3 3 3" /></Icon>
          </span>
          <div>
            <p className="font-display text-[1.05rem] font-semibold text-ink">{room <= 0 ? "Llegaste al máximo de fotos" : "Arrastra tus fotos aquí"}</p>
            <p className="mt-1 text-sm text-slate-500">
              {room <= 0 ? "Quita alguna foto para agregar otras." : `Puedes agregar ${room} ${room === 1 ? "foto más" : "fotos más"}.`}
            </p>
          </div>
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
          <button type="button" disabled={!canAdd} onClick={() => pick.current?.click()} className={`${outlineBtn} bg-white`}>
            <Icon className="h-4 w-4"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></Icon>
            Elegir fotos del dispositivo
          </button>
          {busy && <p role="status" className="text-sm font-semibold text-azure">{busy}</p>}
        </div>
      )}

      {problems.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}

      {images.length === 0 ? (
        <p className="text-center text-sm text-slate-500">Aún no hay fotos. Agrega al menos una para poder enviar tu propiedad.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {images.map((img, i) => (
            <li key={img.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <Image src={img.url} alt={`Foto ${i + 1}`} fill sizes="(min-width: 1024px) 300px, 45vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                {i === 0 && <span className="label-sm absolute left-2 top-2 rounded-md bg-ink px-2.5 py-1 text-white">Foto portada</span>}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs">
                <span className="font-semibold text-slate-600">Foto {i + 1}</span>
                {!readOnly && (
                  <span className="flex items-center gap-3 font-semibold">
                    {i > 0 && (
                      <button type="button" disabled={!!busy} onClick={() => void run("Cambiando la portada…", () => mineApi.setCover(property.id, img.id))} className="cursor-pointer text-azure hover:underline disabled:opacity-50">
                        Hacer portada
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => void run("Quitando…", () => mineApi.deleteImage(property.id, img.id))}
                      className="flex cursor-pointer items-center gap-1 text-slate-500 hover:text-red-600 disabled:opacity-50"
                      aria-label={`Quitar foto ${i + 1}`}
                    >
                      <Icon className="h-4 w-4"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4h6v3" /></Icon>
                      Quitar
                    </button>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
