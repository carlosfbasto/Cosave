"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  editScope,
  FEATURE_FIELDS_BY_TYPE,
  OPERATION_TYPES,
  PROPERTY_STATUS_LABEL,
  propertyDraftSchema,
  PROPERTY_TYPES,
  REQUIRED_FIELD_LABEL,
  type FeatureField,
  type PropertyPatch,
  type PropertyType,
} from "@cosave/shared";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { LatLng } from "@/components/location-picker";
import { ApiError } from "@/lib/api";
import { useCurrentUser } from "@/lib/current-user";
import { formatMxn } from "@/lib/mock-data";
import { mineApi, type MyProperty } from "@/lib/my-properties";
import { showToast } from "@/lib/toast";
import { card, Field, input, outlineBtn, primaryBtn, Stepper } from "./form-parts";
import { PhotosStep } from "./photos-step";

// Leaflet necesita el navegador: se carga solo en el cliente.
const LocationPicker = dynamic(() => import("@/components/location-picker").then((m) => m.LocationPicker), {
  ssr: false,
  loading: () => <div className="grid h-72 place-items-center rounded-lg border border-slate-300 bg-slate-100 text-sm text-slate-500">Cargando mapa…</div>,
});

const TYPE_LABEL: Record<PropertyType, string> = {
  house: "Casa",
  apartment: "Departamento",
  land: "Terreno",
  commercial: "Local / bodega comercial",
  other: "Otro",
};
const OPERATION_LABEL = { sale: "Venta", rent: "Renta" } as const;
const FEATURE_LABEL: Record<FeatureField, string> = {
  bedrooms: "Recámaras",
  bathrooms: "Baños",
  parkingSpots: "Cajones de estacionamiento",
  landAreaM2: "Terreno (m²)",
  builtAreaM2: "Construcción (m²)",
};
const DECIMAL: FeatureField[] = ["landAreaM2", "builtAreaM2"];
const LIMITED_FIELDS = new Set(["description", "price", "bedrooms", "bathrooms", "parkingSpots", "landAreaM2", "builtAreaM2"]);

type Values = Record<string, string>;

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function fromProperty(p?: MyProperty): { values: Values; point: LatLng | null } {
  return {
    values: {
      operation: p?.operation ?? "sale",
      type: p?.type ?? "house",
      title: str(p?.title),
      description: str(p?.description),
      price: p && p.price > 0 ? str(p.price) : "",
      state: p ? str(p.state) : "Yucatán",
      city: str(p?.city),
      zone: str(p?.zone),
      address: str(p?.address),
      postalCode: str(p?.postalCode),
      bedrooms: str(p?.bedrooms),
      bathrooms: str(p?.bathrooms),
      parkingSpots: str(p?.parkingSpots),
      landAreaM2: str(p?.landAreaM2),
      builtAreaM2: str(p?.builtAreaM2),
    },
    point: p && p.latitude !== null && p.longitude !== null ? { lat: p.latitude, lng: p.longitude } : null,
  };
}

const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

/** Valores del formulario → lo que valida el esquema compartido (vacío = ausente). */
function toDraft(v: Values, point: LatLng | null) {
  const type = v.type as PropertyType;
  const allowed = new Set<string>(FEATURE_FIELDS_BY_TYPE[type]);
  const text = (k: string) => v[k]?.trim() || undefined;
  return {
    operation: v.operation,
    type,
    title: v.title?.trim() ?? "",
    description: text("description"),
    price: num(v.price ?? ""),
    state: v.state?.trim() ?? "",
    city: v.city?.trim() ?? "",
    zone: text("zone"),
    address: text("address"),
    postalCode: text("postalCode"),
    latitude: point?.lat,
    longitude: point?.lng,
    ...Object.fromEntries((Object.keys(FEATURE_LABEL) as FeatureField[]).map((k) => [k, allowed.has(k) ? num(v[k] ?? "") : undefined])),
  };
}

/** Lo que se manda al api: lo vacío se envía como null para borrarlo; título, precio y ubicación solo si hay valor. */
function toPatch(v: Values, point: LatLng | null): PropertyPatch {
  const d = toDraft(v, point) as Record<string, unknown>;
  const out: Record<string, unknown> = { operation: d["operation"], type: d["type"] };
  for (const k of ["title", "price", "state", "city"]) if (d[k] !== undefined && d[k] !== "") out[k] = d[k];
  for (const k of ["description", "zone", "address", "postalCode", "latitude", "longitude", ...Object.keys(FEATURE_LABEL)]) out[k] = d[k] ?? null;
  return out as PropertyPatch;
}

export function PropertyForm({ initial }: { initial?: MyProperty }) {
  const start = useMemo(() => fromProperty(initial), [initial]);
  const [property, setProperty] = useState<MyProperty | null>(initial ?? null);
  const [values, setValues] = useState<Values>(start.values);
  const [point, setPoint] = useState<LatLng | null>(start.point);
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dupes, setDupes] = useState<string[] | null>(null);
  const [sent, setSent] = useState<MyProperty | null>(null);
  const [leave, setLeave] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const me = useCurrentUser();
  const mine = me.id ? `/profile/${me.id}/publicados` : "/home";

  const status = property?.status ?? "draft";
  const scope = editScope(status);
  const readOnly = scope === "locked";
  const limited = scope === "limited";
  const type = values.type as PropertyType;
  const features = FEATURE_FIELDS_BY_TYPE[type];
  // En una propiedad publicada solo se editan precio, descripción y características.
  const locked = (name: string) => readOnly || (limited && !LIMITED_FIELDS.has(name));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function set(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (name in prev ? { ...prev, [name]: "" } : prev));
    setDirty(true);
  }

  function go(i: number) {
    setStep(i);
    setReached((r) => Math.max(r, i));
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Valida lo obligatorio y dice qué falta (P05). */
  function validate(): boolean {
    const parsed = propertyDraftSchema.safeParse(toDraft(values, point));
    if (parsed.success) {
      setErrors({});
      setBanner(null);
      return true;
    }
    const next: Record<string, string> = {};
    for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
    setErrors(next);
    const missing = Object.keys(next).map((k) => REQUIRED_FIELD_LABEL[k]).filter(Boolean);
    setBanner(missing.length ? `Falta completar ${missing.join(", ")}.` : "Revisa los campos marcados.");
    return false;
  }

  /** Crea o actualiza el borrador en el api. */
  async function save(): Promise<MyProperty | null> {
    setBusy(true);
    try {
      const patch = toPatch(values, point);
      const saved = property ? await mineApi.patch(property.id, patch) : await mineApi.create(patch);
      setProperty(saved);
      setDirty(false);
      return saved;
    } catch (err) {
      setBanner(err instanceof ApiError ? err.message : "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    if (step === 0) {
      if (readOnly) return go(1);
      if (!validate()) return;
      if (!(await save())) return;
      go(1);
    } else if (step === 1) {
      if (!property || property.images.length === 0) {
        setBanner("Agrega al menos una foto para continuar.");
        return;
      }
      setBanner(null);
      go(2);
    }
  }

  async function saveDraft() {
    if (readOnly) return;
    const saved = await save();
    if (saved) {
      showToast(limited ? "Cambios guardados" : "Borrador guardado");
      router.push(mine);
    }
  }

  async function submit(confirmDuplicate = false) {
    if (!property) return;
    setBusy(true);
    setBanner(null);
    try {
      if (dirty && !(await save())) return;
      setSent(await mineApi.submit(property.id, confirmDuplicate));
      setDupes(null);
    } catch (err) {
      if (err instanceof ApiError && err.code === "possible_duplicate") {
        setDupes(((err.details as { codes?: string[] } | undefined)?.codes) ?? []);
      } else {
        setBanner(err instanceof Error ? err.message : "No se pudo enviar");
      }
    } finally {
      setBusy(false);
    }
  }

  async function backToDraft() {
    if (!property) return;
    setBusy(true);
    try {
      setProperty(await mineApi.setStatus(property.id, "draft"));
      showToast("Volvió a borrador: ya puedes editarla", "info");
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "No se pudo regresar a borrador");
    } finally {
      setBusy(false);
    }
  }

  async function saveChanges() {
    if (!validate()) return;
    const saved = await save();
    if (saved) {
      showToast("Cambios guardados");
      router.push(mine);
    }
  }

  function publishAnother() {
    if (initial) return router.push("/vender");
    setSent(null);
    setProperty(null);
    setValues(fromProperty().values);
    setPoint(null);
    setStep(0);
    setReached(0);
    setErrors({});
    setBanner(null);
    setDirty(false);
  }

  function goBack() {
    if (dirty) setLeave(true);
    else leaveNow();
  }
  function leaveNow() {
    if (window.history.length > 1) router.back();
    else router.push("/home");
  }

  if (sent) {
    const live = sent.status === "published";
    return (
      <main className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-20">
        <div className={`${card} max-w-md text-center`}>
          <h1 className="text-2xl font-bold text-ink">{live ? "¡Tu propiedad ya está publicada!" : "¡Listo, la recibimos!"}</h1>
          <p className="text-sm text-slate-600">
            {live
              ? `La clave de tu anuncio es ${sent.code}.`
              : `Tu propiedad (${sent.code}) quedó pendiente de revisión. Te avisaremos cuando sea aprobada; mientras tanto no se puede editar.`}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={publishAnother} className={primaryBtn}>Publicar otra</button>
            <MyPropertiesLink className={outlineBtn} />
          </div>
        </div>
      </main>
    );
  }

  const cover = property?.images[0]?.url;
  const title = initial ? (limited ? "Editar propiedad" : readOnly ? "Tu propiedad" : "Continuar publicación") : "Publicar propiedad";

  return (
    <main className="flex-1 bg-slate-50">
      <div ref={top} className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <button type="button" onClick={goBack} className="inline-block cursor-pointer text-sm font-semibold text-ink transition-colors hover:text-azure-hover">
          ← Volver
        </button>
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
            {property && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{PROPERTY_STATUS_LABEL[status]}</span>}
          </div>
          <p className="text-sm text-slate-600">
            {limited
              ? "Está publicada: puedes cambiar precio, descripción, características y fotos. Para cambiar tipo, operación o ubicación, regrésala a borrador."
              : "Captura la información, agrega fotos y revisa la vista previa antes de enviarla."}
          </p>
          {!limited && !readOnly && <Stepper step={step} onGo={go} max={reached} />}
        </header>

        {readOnly && (
          <div role="status" className={`${card} space-y-2 border-azure/60 bg-azure/10`}>
            <p className="font-semibold text-ink">
              {status === "pending" ? "Está en revisión: no se puede editar." : `Esta propiedad está ${PROPERTY_STATUS_LABEL[status].toLowerCase()} y ya no se puede editar.`}
            </p>
            {status === "pending" && (
              <button type="button" onClick={() => void backToDraft()} disabled={busy} className={outlineBtn}>
                Regresar a borrador para editar
              </button>
            )}
          </div>
        )}
        {status === "rejected" && property?.reviewNote && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">No fue aprobada</p>
            <p>{property.reviewNote}</p>
            <p className="mt-1">Corrige lo indicado y vuelve a enviarla.</p>
          </div>
        )}
        {banner && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{banner}</p>}

        {/* Paso 1: datos */}
        {(step === 0 || limited || readOnly) && (
          <div className="space-y-6">
            <section className={card}>
              <h2 className="text-lg font-bold text-ink">Datos generales</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Operación" error={errors["operation"]}>
                  <select value={values["operation"]} disabled={locked("operation")} onChange={(e) => set("operation", e.target.value)} className={input}>
                    {OPERATION_TYPES.map((o) => <option key={o} value={o}>{OPERATION_LABEL[o]}</option>)}
                  </select>
                </Field>
                <Field label="Tipo de propiedad" error={errors["type"]}>
                  <select value={values["type"]} disabled={locked("type")} onChange={(e) => set("type", e.target.value)} className={input}>
                    {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Título" error={errors["title"]}>
                <input value={values["title"]} disabled={locked("title")} onChange={(e) => set("title", e.target.value)} maxLength={120} placeholder="Casa moderna con alberca" className={input} />
              </Field>
              <Field label="Descripción (opcional)" error={errors["description"]}>
                <textarea value={values["description"]} disabled={locked("description")} onChange={(e) => set("description", e.target.value)} rows={4} maxLength={2000} className={input} />
              </Field>
              <Field label={values["operation"] === "rent" ? "Precio de renta en MXN (por mes)" : "Precio en MXN"} error={errors["price"]}>
                <input value={values["price"]} disabled={locked("price")} onChange={(e) => set("price", e.target.value)} type="number" min="0" step="any" inputMode="decimal" className={input} />
              </Field>
            </section>

            <section className={card}>
              <h2 className="text-lg font-bold text-ink">Ubicación</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Estado" error={errors["state"]}><input value={values["state"]} disabled={locked("state")} onChange={(e) => set("state", e.target.value)} className={input} /></Field>
                <Field label="Ciudad" error={errors["city"]}><input value={values["city"]} disabled={locked("city")} onChange={(e) => set("city", e.target.value)} className={input} /></Field>
                <Field label="Zona o colonia (opcional)" error={errors["zone"]}><input value={values["zone"]} disabled={locked("zone")} onChange={(e) => set("zone", e.target.value)} className={input} /></Field>
                <Field label="Dirección (opcional)" error={errors["address"]}><input value={values["address"]} disabled={locked("address")} onChange={(e) => set("address", e.target.value)} className={input} /></Field>
                <Field label="Código postal (opcional)" error={errors["postalCode"]}>
                  <input value={values["postalCode"]} disabled={locked("postalCode")} onChange={(e) => set("postalCode", e.target.value)} inputMode="numeric" maxLength={5} placeholder="97000" className={input} />
                </Field>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-ink">Ubicación en el mapa (opcional)</p>
                  {point && !locked("latitude") && (
                    <button type="button" onClick={() => { setPoint(null); setDirty(true); }} className="cursor-pointer text-xs font-semibold text-ink underline">Quitar marca</button>
                  )}
                </div>
                {locked("latitude") ? (
                  <p className="text-xs text-slate-600">{point ? `Marcado: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : "Sin marca en el mapa."}</p>
                ) : (
                  <>
                    <LocationPicker value={point} onChange={(p) => { setPoint(p); setDirty(true); }} />
                    <p className="text-xs text-slate-600">{point ? `Marcado: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : "Haz clic en el mapa para marcar dónde está tu propiedad."}</p>
                  </>
                )}
              </div>
            </section>

            <section className={card}>
              <h2 className="text-lg font-bold text-ink">Características (opcional)</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {features.map((f) => (
                  <Field key={f} label={FEATURE_LABEL[f]} error={errors[f]}>
                    <input value={values[f]} disabled={locked(f)} onChange={(e) => set(f, e.target.value)} type="number" min="0" step={DECIMAL.includes(f) ? "any" : "1"} className={input} />
                  </Field>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Paso 2: fotos */}
        {property && (step === 1 || limited || readOnly) && <PhotosStep property={property} onChange={(p) => setProperty(p)} readOnly={readOnly} />}

        {/* Paso 3: vista previa */}
        {step === 2 && property && !limited && !readOnly && (
          <section className={card}>
            <h2 className="text-lg font-bold text-ink">Vista previa</h2>
            <p className="text-sm text-slate-600">Así verán tu propiedad en los resultados. Revisa que todo esté bien.</p>
            <article className="overflow-hidden rounded-xl border border-slate-200">
              <div className="relative aspect-[16/9] bg-slate-100">
                {cover && <Image src={cover} alt="Foto principal" fill sizes="(min-width: 768px) 700px, 100vw" className="object-cover" />}
                <span className="absolute left-3 top-3 rounded-full bg-azure/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow">
                  {values["operation"] === "rent" ? "Renta" : "Venta"}
                </span>
              </div>
              <div className="space-y-2 p-5">
                <h3 className="text-xl font-bold text-ink">{values["title"] || "Sin título"}</h3>
                <p className="text-[1.4rem] font-bold text-ink">
                  {formatMxn(Number(values["price"]) || 0)} <span className="text-xs font-semibold text-slate-500">MXN{values["operation"] === "rent" && " /mes"}</span>
                </p>
                <p className="text-sm text-slate-600">
                  {TYPE_LABEL[type]} · {[values["zone"], values["city"], values["state"]].filter(Boolean).join(", ")}
                  {values["postalCode"] && ` · C.P. ${values["postalCode"]}`}
                </p>
                {features.some((f) => values[f]) && (
                  <p className="text-sm text-slate-700">{features.filter((f) => values[f]).map((f) => `${FEATURE_LABEL[f]}: ${values[f]}`).join(" · ")}</p>
                )}
                {values["description"] && <p className="whitespace-pre-line text-sm text-slate-600">{values["description"]}</p>}
                <p className="text-xs text-slate-500">{property.images.length} {property.images.length === 1 ? "foto" : "fotos"} · {point ? "con ubicación en el mapa" : "sin marca en el mapa"}</p>
              </div>
            </article>
            <p className="text-xs text-slate-500">Al enviarla, COSAVE revisará los datos y te avisará cuando esté aprobada.</p>
          </section>
        )}

        {/* Acciones */}
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-3">
            {limited ? (
              <button type="button" disabled={busy} onClick={() => void saveChanges()} className={primaryBtn}>Guardar cambios</button>
            ) : (
              <>
                {step > 0 && <button type="button" disabled={busy} onClick={() => go(step - 1)} className={outlineBtn}>Atrás</button>}
                {step < 2 ? (
                  <button type="button" disabled={busy} onClick={() => void next()} className={primaryBtn}>{busy ? "Guardando…" : "Siguiente"}</button>
                ) : (
                  <button type="button" disabled={busy} onClick={() => void submit()} className={primaryBtn}>{busy ? "Enviando…" : "Enviar a revisión"}</button>
                )}
                <button type="button" disabled={busy} onClick={() => void saveDraft()} className="cursor-pointer text-sm font-semibold text-ink underline disabled:opacity-50">
                  Guardar borrador
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog open={leave} title="Tienes cambios sin guardar" confirmLabel="Salir sin guardar" danger onConfirm={leaveNow} onClose={() => setLeave(false)}>
        <p>Si sales ahora perderás lo que escribiste desde la última vez que guardaste. Puedes usar «Guardar borrador» para continuar después.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={dupes !== null}
        title="Encontramos publicaciones parecidas"
        confirmLabel="Es distinta, enviar"
        busy={busy}
        onConfirm={() => void submit(true)}
        onClose={() => setDupes(null)}
      >
        <p>Ya existe {dupes && dupes.length > 1 ? "una publicación" : "una publicación"} muy parecida a la tuya{dupes?.length ? ` (${dupes.join(", ")})` : ""}.</p>
        <p>Si es otra propiedad puedes enviarla de todos modos: el equipo de COSAVE la revisará. No se borra ninguna publicación automáticamente.</p>
      </ConfirmDialog>
    </main>
  );
}

function MyPropertiesLink({ className }: { className: string }) {
  const { id } = useCurrentUser();
  return <Link href={id ? `/profile/${id}/publicados` : "/home"} className={className}>Ir a mis propiedades</Link>;
}
