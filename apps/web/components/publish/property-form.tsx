"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AMENITY_LABEL,
  amenitiesFor,
  editScope,
  FEATURE_FIELDS_BY_TYPE,
  IMAGE_LIMITS,
  MATERIAL_LABEL,
  materialsFor,
  OPERATION_TYPES,
  PROPERTY_STATUS_LABEL,
  propertyDraftSchema,
  needsMaintenanceFee,
  PROPERTY_TYPE_LABEL,
  REQUIRED_FIELD_LABEL,
  type Amenity,
  type FeatureField,
  type Material,
  type PostalCodeInfo,
  type PropertyPatch,
  type PropertyType,
} from "@cosave/shared";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { LatLng } from "@/components/location-picker";
import { ApiError } from "@/lib/api";
import { useCurrentUser } from "@/lib/current-user";
import { formatMxn } from "@/lib/mock-data";
import { mineApi, postalCodeInfo, type MyProperty } from "@/lib/my-properties";
import { showToast } from "@/lib/toast";
import { card, ChipChecklist, Field, GroupTitle, Icon, input, outlineBtn, primaryBtn, STEPS, StepTabs, TYPE_ICON } from "./form-parts";
import { PhotosStep } from "./photos-step";

// Leaflet necesita el navegador: se carga solo en el cliente.
const LocationPicker = dynamic(() => import("@/components/location-picker").then((m) => m.LocationPicker), {
  ssr: false,
  loading: () => <div className="grid h-80 place-items-center bg-slate-100 text-sm text-slate-500">Cargando mapa…</div>,
});

const OPERATION_LABEL = { sale: "Venta", rent: "Renta" } as const;
const FEATURE_LABEL: Record<FeatureField, string> = {
  bedrooms: "Recámaras",
  bathrooms: "Baños",
  parkingSpots: "Cajones de estacionamiento",
  landAreaM2: "Terreno (m²)",
  builtAreaM2: "Construcción (m²)",
};
/** Mosaicos de superficies y espacios: etiqueta corta y unidad. */
const FEATURE_TILE: Record<FeatureField, { label: string; unit: string }> = {
  builtAreaM2: { label: "Construcción", unit: "m²" },
  landAreaM2: { label: "Terreno", unit: "m²" },
  bedrooms: { label: "Recámaras", unit: "" },
  bathrooms: { label: "Baños", unit: "" },
  parkingSpots: { label: "Estacionamientos", unit: "cajones" },
};
const TILE_ORDER: FeatureField[] = ["builtAreaM2", "landAreaM2", "bedrooms", "bathrooms", "parkingSpots"];
const DECIMAL: FeatureField[] = ["landAreaM2", "builtAreaM2"];
/** Orden de los mosaicos de tipo: primero lo habitacional. */
const TYPE_ORDER: PropertyType[] = ["house", "apartment", "land", "commercial", "commercial_warehouse", "industrial_warehouse", "other"];
const LIMITED_FIELDS = new Set(["description", "price", "bedrooms", "bathrooms", "parkingSpots", "landAreaM2", "builtAreaM2", "amenities", "materials", "maintenanceFee"]);
/** Opción «Otra» del listado de colonias (fraccionamientos nuevos que aún no están en el catálogo). */
const OTHER_ZONE = "__otra__";
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;

type Values = Record<string, string>;
interface Lists {
  amenities: Amenity[];
  materials: Material[];
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function fromProperty(p?: MyProperty): { values: Values; point: LatLng | null; lists: Lists } {
  return {
    values: {
      operation: p?.operation ?? "sale",
      type: p?.type ?? "house",
      title: str(p?.title),
      description: str(p?.description),
      price: p && p.price > 0 ? str(p.price) : "",
      maintenanceFee: str(p?.maintenanceFee),
      state: str(p?.state),
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
    lists: { amenities: p?.amenities ?? [], materials: p?.materials ?? [] },
  };
}

const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

/** Valores del formulario → lo que valida el esquema compartido (vacío = ausente). */
function toDraft(v: Values, point: LatLng | null, lists: Lists) {
  const type = v.type as PropertyType;
  const allowed = new Set<string>(FEATURE_FIELDS_BY_TYPE[type]);
  const text = (k: string) => v[k]?.trim() || undefined;
  return {
    operation: v.operation,
    type,
    title: v.title?.trim() ?? "",
    description: text("description"),
    price: num(v.price ?? ""),
    // Solo departamentos y propiedades en privada.
    maintenanceFee: needsMaintenanceFee(type, lists.amenities) ? num(v.maintenanceFee ?? "") : undefined,
    state: v.state?.trim() ?? "",
    city: v.city?.trim() ?? "",
    zone: text("zone"),
    address: text("address"),
    postalCode: text("postalCode"),
    latitude: point?.lat,
    longitude: point?.lng,
    ...Object.fromEntries((Object.keys(FEATURE_LABEL) as FeatureField[]).map((k) => [k, allowed.has(k) ? num(v[k] ?? "") : undefined])),
    // Solo las que aplican al tipo elegido (si cambió de tipo, las demás se descartan).
    amenities: lists.amenities.filter((a) => amenitiesFor(type).includes(a)),
    materials: lists.materials.filter((m) => materialsFor(type).includes(m)),
  };
}

/** Lo que se manda al api: lo vacío se envía como null para borrarlo; título, precio y ubicación solo si hay valor. */
function toPatch(v: Values, point: LatLng | null, lists: Lists): PropertyPatch {
  const d = toDraft(v, point, lists) as Record<string, unknown>;
  const out: Record<string, unknown> = { operation: d["operation"], type: d["type"], amenities: d["amenities"], materials: d["materials"] };
  for (const k of ["title", "price", "state", "city"]) if (d[k] !== undefined && d[k] !== "") out[k] = d[k];
  for (const k of ["description", "maintenanceFee", "zone", "address", "postalCode", "latitude", "longitude", ...Object.keys(FEATURE_LABEL)]) out[k] = d[k] ?? null;
  return out as PropertyPatch;
}

export function PropertyForm({ initial }: { initial?: MyProperty }) {
  const start = useMemo(() => fromProperty(initial), [initial]);
  const [property, setProperty] = useState<MyProperty | null>(initial ?? null);
  const [values, setValues] = useState<Values>(start.values);
  const [point, setPoint] = useState<LatLng | null>(start.point);
  const [lists, setLists] = useState<Lists>(start.lists);
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dupes, setDupes] = useState<string[] | null>(null);
  const [sent, setSent] = useState<MyProperty | null>(null);
  const [leave, setLeave] = useState(false);
  const [cpResult, setCpResult] = useState<{ code: string; info?: PostalCodeInfo; error?: string } | null>(null);
  const [otherZone, setOtherZone] = useState(false);
  const restoringCp = useRef(!!start.values["postalCode"]);
  const top = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const me = useCurrentUser();
  const mine = me.id ? `/profile/${me.id}/publicados` : "/home";

  const status = property?.status ?? "draft";
  const scope = editScope(status);
  const readOnly = scope === "locked";
  const limited = scope === "limited";
  const type = values.type as PropertyType;
  const features = TILE_ORDER.filter((f) => FEATURE_FIELDS_BY_TYPE[type].includes(f));
  const amenityOptions = amenitiesFor(type).map((key) => ({ key, label: AMENITY_LABEL[key] }));
  const materialOptions = materialsFor(type).map((key) => ({ key, label: MATERIAL_LABEL[key] }));
  const isRent = values["operation"] === "rent";
  const hasFee = needsMaintenanceFee(type, lists.amenities);
  const fee = hasFee ? Number(values["maintenanceFee"]) || 0 : 0;
  const price = Number(values["price"]) || 0;
  const built = features.includes("builtAreaM2") ? Number(values["builtAreaM2"]) || 0 : 0;
  const perM2 = price > 0 && built > 0 ? Math.round(price / built) : null;
  // En una propiedad publicada solo se editan precio, descripción, características y fotos.
  const locked = (name: string) => readOnly || (limited && !LIMITED_FIELDS.has(name));

  // Código postal completo → estado, ciudad y colonias del catálogo.
  const postalCode = values["postalCode"] ?? "";
  const cpReady = /^\d{5}$/.test(postalCode);
  const cpCurrent = cpReady && cpResult?.code === postalCode ? cpResult : null;
  const cp = { loading: cpReady && !cpCurrent, info: cpCurrent?.info, error: cpCurrent?.error };
  useEffect(() => {
    if (!cpReady) return;
    let alive = true;
    postalCodeInfo(postalCode)
      .then((info) => {
        if (!alive) return;
        setCpResult({ code: postalCode, info });
        // Al abrir un borrador se respeta la colonia guardada (aunque no esté en la lista: «Otra»).
        // Si la persona cambia el código, la colonia anterior ya no aplica.
        const restoring = restoringCp.current;
        restoringCp.current = false;
        const current = values["zone"] ?? "";
        const listed = info.settlements.includes(current);
        const zone = listed || (restoring && current) ? current : info.settlements.length === 1 ? info.settlements[0]! : "";
        setOtherZone(!!zone && !info.settlements.includes(zone));
        setValues((prev) => ({ ...prev, state: info.state, city: info.city, zone }));
        setErrors((prev) => ({ ...prev, postalCode: "", state: "", city: "", zone: "" }));
      })
      .catch(
        (err) =>
          alive &&
          setCpResult({
            code: postalCode,
            error: err instanceof ApiError && err.status === 404 ? err.message : "No se pudo consultar el código postal. Inténtalo de nuevo.",
          }),
      );
    return () => {
      alive = false;
    };
    // Solo depende del código: la colonia escrita se revisa con el valor del momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postalCode, cpReady]);

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

  function setList<K extends keyof Lists>(name: K, value: Lists[K]) {
    setLists((prev) => ({ ...prev, [name]: value }));
    setDirty(true);
  }

  function go(i: number) {
    setStep(i);
    setReached((r) => Math.max(r, i));
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Valida lo obligatorio y dice qué falta (P05). */
  function validate(): boolean {
    const parsed = propertyDraftSchema.safeParse(toDraft(values, point, lists));
    // El código debe existir en el catálogo (de ahí salen estado y ciudad).
    const cpProblem = cp.loading ? "Espera a que terminemos de consultar el código postal." : cp.error;
    if (parsed.success && cpProblem) {
      setErrors({ postalCode: cpProblem });
      setBanner(cpProblem);
      return false;
    }
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
      const patch = toPatch(values, point, lists);
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
    const blank = fromProperty();
    setSent(null);
    setProperty(null);
    setValues(blank.values);
    setLists(blank.lists);
    setPoint(null);
    setOtherZone(false);
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
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sky-100 text-azure">
            <Icon className="h-7 w-7"><path d="M5 12l5 5L20 7" /></Icon>
          </span>
          <h1 className="font-display text-2xl font-bold text-ink">{live ? "¡Tu propiedad ya está publicada!" : "¡Listo, la recibimos!"}</h1>
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

  const photos = property?.images ?? [];
  const title = initial ? (limited ? "Editar propiedad" : readOnly ? "Tu propiedad" : "Continuar publicación") : "Publicar propiedad";
  const where = [values["zone"], values["city"], values["state"]].map((s) => s?.trim()).filter(Boolean).join(", ");
  const showSteps = !limited && !readOnly;

  return (
    <main className="flex-1 bg-slate-50">
      {/* Encabezado: título, estado de guardado y pasos */}
      <div ref={top} className="scroll-mt-16 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1440px] space-y-5 px-4 py-6 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <button type="button" onClick={goBack} className="cursor-pointer font-semibold text-ink transition-colors hover:text-azure">
                ← Volver
              </button>
              {property && (
                <>
                  <span aria-hidden className="text-slate-300">|</span>
                  <span className="label-sm rounded-md bg-slate-100 px-2.5 py-1 text-slate-600">Clave {property.code}</span>
                  <span className="label-sm rounded-md bg-sky-50 px-2.5 py-1 text-azure">{PROPERTY_STATUS_LABEL[status]}</span>
                </>
              )}
            </div>
            {!readOnly && (
              <div className="flex items-center gap-3">
                <span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex" role="status">
                  <span aria-hidden className={`h-2 w-2 rounded-full ${dirty ? "bg-amber-400" : property ? "bg-emerald-500" : "bg-slate-300"}`} />
                  {dirty ? "Cambios sin guardar" : property ? "Todo guardado" : "Aún no se guarda"}
                </span>
                <button type="button" disabled={busy} onClick={() => void saveDraft()} className="btn btn-outline px-4 py-2 text-sm">
                  {limited ? "Guardar y salir" : "Guardar borrador y salir"}
                </button>
              </div>
            )}
          </div>

          <div className="max-w-3xl">
            <h1 className="font-display text-[1.75rem] font-bold leading-tight tracking-tight text-ink sm:text-[2rem] sm:leading-10">{title}</h1>
            <p className="mt-1 text-[0.95rem] text-slate-600">
              {limited
                ? "Está publicada: puedes cambiar precio, descripción, superficies, características y fotos. Para cambiar tipo, operación o ubicación, regrésala a borrador."
                : readOnly
                  ? "Consulta los datos que enviaste."
                  : "Captura los datos, agrega fotos y revisa la vista previa. COSAVE revisa cada publicación antes de mostrarla."}
            </p>
          </div>

          {showSteps && <StepTabs step={step} onGo={go} max={reached} photos={photos.length} />}
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 md:px-8">
        {readOnly && (
          <div role="status" className="space-y-3 rounded-2xl border border-azure/40 bg-sky-50 p-5">
            <p className="font-semibold text-ink">
              {status === "pending" ? "Está en revisión: no se puede editar." : `Esta propiedad está ${PROPERTY_STATUS_LABEL[status].toLowerCase()} y ya no se puede editar.`}
            </p>
            {status === "pending" && (
              <button type="button" onClick={() => void backToDraft()} disabled={busy} className={`${outlineBtn} bg-white`}>
                Regresar a borrador para editar
              </button>
            )}
          </div>
        )}
        {status === "rejected" && property?.reviewNote && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <p className="font-semibold">No fue aprobada</p>
            <p>{property.reviewNote}</p>
            <p className="mt-1">Corrige lo indicado y vuelve a enviarla.</p>
          </div>
        )}
        {banner && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{banner}</p>}

        {/* Paso 1: datos y ubicación */}
        {(step === 0 || limited || readOnly) && (
          <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
            <section className={`${card} lg:col-span-7`} aria-labelledby="datos">
              <h2 id="datos" className="headline-sm text-ink">Datos de la propiedad</h2>

              <fieldset className="space-y-2" disabled={locked("operation")}>
                <legend className="mb-2 text-sm font-semibold text-ink">Operación</legend>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup">
                  {OPERATION_TYPES.map((o) => (
                    <button
                      key={o}
                      type="button"
                      role="radio"
                      aria-checked={values["operation"] === o}
                      onClick={() => set("operation", o)}
                      className={`cursor-pointer rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                        values["operation"] === o ? "bg-ink text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-ink"
                      }`}
                    >
                      {OPERATION_LABEL[o]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-2" disabled={locked("type")}>
                <legend className="mb-2 text-sm font-semibold text-ink">Tipo de propiedad</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
                  {TYPE_ORDER.map((t) => {
                    const on = type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => set("type", t)}
                        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                          on ? "border-azure bg-sky-50 text-ink ring-2 ring-azure/15" : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-ink"
                        }`}
                      >
                        <Icon className={`h-6 w-6 ${on ? "text-azure" : "text-slate-500"}`}>{TYPE_ICON[t]}</Icon>
                        {PROPERTY_TYPE_LABEL[t]}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <Field label="Título del anuncio" error={errors["title"]} aside={`${values["title"]?.length ?? 0}/${TITLE_MAX}`}>
                <input
                  value={values["title"]}
                  disabled={locked("title")}
                  onChange={(e) => set("title", e.target.value)}
                  maxLength={TITLE_MAX}
                  placeholder="Casa con alberca y jardín en Mérida"
                  className={input}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={isRent ? "Renta mensual" : "Precio de venta"}
                  error={errors["price"]}
                  hint={perM2 !== null ? `${formatMxn(perM2)} MXN por m² construido${isRent ? " al mes" : ""}` : "Escribe solo números, sin comas."}
                >
                  <span className="relative block">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-display text-lg text-slate-500">$</span>
                    <input
                      value={values["price"]}
                      disabled={locked("price")}
                      onChange={(e) => set("price", e.target.value)}
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      placeholder="0"
                      className={`${input} pl-7 pr-20 font-display text-lg font-bold`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">MXN{isRent && " /mes"}</span>
                  </span>
                </Field>
                {hasFee && (
                  <Field label="Mantenimiento mensual (opcional)" error={errors["maintenanceFee"]} hint={type === "apartment" ? "Cuota del edificio o condominio." : "Cuota de la privada o fraccionamiento."}>
                    <span className="relative block">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-display text-lg text-slate-500">$</span>
                      <input
                        value={values["maintenanceFee"]}
                        disabled={locked("maintenanceFee")}
                        onChange={(e) => set("maintenanceFee", e.target.value)}
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        placeholder="0"
                        className={`${input} pl-7 pr-20 font-display text-lg font-bold`}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">MXN /mes</span>
                    </span>
                  </Field>
                )}
              </div>

              <Field label="Descripción (opcional)" error={errors["description"]} aside={`${values["description"]?.length ?? 0}/${DESCRIPTION_MAX}`}>
                <textarea
                  value={values["description"]}
                  disabled={locked("description")}
                  onChange={(e) => set("description", e.target.value)}
                  rows={5}
                  maxLength={DESCRIPTION_MAX}
                  placeholder="Cuenta lo que hace especial a tu propiedad: distribución, estado, servicios cercanos…"
                  className={input}
                />
              </Field>

              <div className="space-y-3">
                <GroupTitle hint="Opcional. Solo se muestran los datos que aplican al tipo de propiedad.">Superficies y espacios</GroupTitle>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {features.map((f) => (
                    <label key={f} className="flex flex-col gap-1 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-azure/40">
                      <span className="text-xs font-semibold text-slate-500">{FEATURE_TILE[f].label}</span>
                      <span className="flex items-baseline gap-1">
                        <input
                          value={values[f]}
                          disabled={locked(f)}
                          onChange={(e) => set(f, e.target.value)}
                          type="number"
                          min="0"
                          step={DECIMAL.includes(f) ? "any" : "1"}
                          placeholder="0"
                          aria-label={FEATURE_LABEL[f]}
                          className="w-full min-w-0 bg-transparent font-display text-lg font-bold text-ink placeholder:text-slate-300 focus:outline-none disabled:text-slate-500"
                        />
                        {FEATURE_TILE[f].unit && <span className="text-xs font-semibold text-slate-500">{FEATURE_TILE[f].unit}</span>}
                      </span>
                      {errors[f] && <span role="alert" className="text-xs text-red-600">{errors[f]}</span>}
                    </label>
                  ))}
                </div>
              </div>

              {amenityOptions.length > 0 && (
                <div className="space-y-3">
                  <GroupTitle hint="Opcional. Marca lo que tiene tu propiedad; se muestra en su ficha.">Características</GroupTitle>
                  <ChipChecklist label="Características" options={amenityOptions} value={lists.amenities} disabled={locked("amenities")} onChange={(v) => setList("amenities", v)} />
                  {hasFee && type !== "apartment" && (
                    <p className="text-xs text-azure">Como está en privada, junto al precio puedes indicar la cuota de mantenimiento.</p>
                  )}
                </div>
              )}

              {materialOptions.length > 0 && (
                <div className="space-y-3">
                  <GroupTitle hint="Opcional. Ayuda a quien busca a conocer la calidad de la construcción.">Materiales de construcción</GroupTitle>
                  <ChipChecklist label="Materiales de construcción" options={materialOptions} value={lists.materials} disabled={locked("materials")} onChange={(v) => setList("materials", v)} />
                </div>
              )}
            </section>

            {/* Ubicación: datos + mapa */}
            <section className={`${card} lg:col-span-5`} aria-labelledby="ubicacion">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="ubicacion" className="headline-sm flex items-center gap-2 text-ink">
                  <Icon className="h-5 w-5 text-azure"><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></Icon>
                  Ubicación
                </h2>
                <span className={`label-sm rounded-md px-2.5 py-1 ${point ? "bg-sky-50 text-azure" : "bg-slate-100 text-slate-500"}`}>
                  {point ? "Marcada en el mapa" : "Sin marcar en el mapa"}
                </span>
              </div>

              <Field
                label="Código postal"
                error={errors["postalCode"] || cp.error}
                hint={cp.loading ? "Buscando el código postal…" : cp.info ? `${cp.info.settlements.length} ${cp.info.settlements.length === 1 ? "colonia" : "colonias"} con este código` : "Con él llenamos el estado, la ciudad y las colonias."}
              >
                <input
                  value={values["postalCode"]}
                  disabled={locked("postalCode")}
                  onChange={(e) => set("postalCode", e.target.value.replace(/\D/g, "").slice(0, 5))}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={5}
                  placeholder="97000"
                  className={`${input} font-display text-lg font-bold tracking-widest sm:max-w-[12rem]`}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Estado" error={errors["state"]}>
                  <input value={values["state"]} readOnly tabIndex={-1} placeholder="Se llena con el código postal" className={`${input} bg-slate-50 text-slate-700`} />
                </Field>
                <Field label="Ciudad o municipio" error={errors["city"]}>
                  <input value={values["city"]} readOnly tabIndex={-1} placeholder="Se llena con el código postal" className={`${input} bg-slate-50 text-slate-700`} />
                </Field>
              </div>
              <Field label="Zona o colonia (opcional)" error={errors["zone"]}>
                {cp.info && !otherZone ? (
                  <select
                    value={values["zone"]}
                    disabled={locked("zone")}
                    onChange={(e) => {
                      if (e.target.value === OTHER_ZONE) {
                        setOtherZone(true);
                        set("zone", "");
                      } else set("zone", e.target.value);
                    }}
                    className={input}
                  >
                    <option value="">Elige la colonia</option>
                    {cp.info.settlements.map((s) => <option key={s} value={s}>{s}</option>)}
                    <option value={OTHER_ZONE}>Otra (escribirla)</option>
                  </select>
                ) : (
                  <span className="flex gap-2">
                    <input
                      value={values["zone"]}
                      disabled={locked("zone") || !cp.info}
                      onChange={(e) => set("zone", e.target.value)}
                      placeholder={cp.info ? "Escribe la colonia o fraccionamiento" : "Primero escribe el código postal"}
                      className={input}
                    />
                    {cp.info && !locked("zone") && (
                      <button type="button" onClick={() => { setOtherZone(false); set("zone", ""); }} className="shrink-0 cursor-pointer text-xs font-semibold text-azure hover:underline">
                        Ver lista
                      </button>
                    )}
                  </span>
                )}
              </Field>
              <Field label="Dirección (opcional)" error={errors["address"]} hint="No se muestra en el anuncio: solo la ven tú y el equipo de COSAVE.">
                <input value={values["address"]} disabled={locked("address")} onChange={(e) => set("address", e.target.value)} placeholder="Calle 60 x 55 y 57, #123" className={input} />
              </Field>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink">Ubicación en el mapa (opcional)</p>
                <div className="relative overflow-hidden rounded-xl border border-slate-200">
                  {locked("latitude") ? (
                    <p className="grid h-40 place-items-center bg-slate-50 px-4 text-center text-sm text-slate-600">
                      {point ? `Marcada en ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : "Sin marca en el mapa."}
                    </p>
                  ) : (
                    <>
                      <LocationPicker value={point} onChange={(p) => { setPoint(p); setDirty(true); }} area={cp.info?.center ? { center: cp.info.center, bounds: cp.info.bounds } : null} className="h-80" />
                      <div className="pointer-events-none absolute left-3 top-3 z-[400] flex items-center gap-2 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm ring-1 ring-slate-200">
                        <span aria-hidden className={`h-2 w-2 rounded-full ${point ? "bg-azure" : "bg-slate-300"}`} />
                        {point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : "Haz clic en el mapa para marcar"}
                      </div>
                      {point && (
                        <button
                          type="button"
                          onClick={() => { setPoint(null); setDirty(true); }}
                          className="absolute bottom-3 left-3 z-[400] cursor-pointer rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-azure shadow-sm ring-1 ring-slate-200 hover:underline"
                        >
                          Quitar marca
                        </button>
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {cp.info?.center ? `El mapa muestra el municipio de ${cp.info.municipality}: acércate a tu calle y haz clic para marcarla. ` : ""}
                  Con la marca, tu propiedad aparece en el mapa del listado de búsqueda.
                </p>
              </div>
              <p className="text-[0.7rem] text-slate-400">
                Catálogo de códigos postales:{" "}
                <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">GeoNames</a> (CC BY 4.0).
              </p>
            </section>
          </div>
        )}

        {/* Paso 2: fotos */}
        {property && (step === 1 || limited || readOnly) && <PhotosStep property={property} onChange={(p) => setProperty(p)} readOnly={readOnly} />}

        {/* Paso 3: vista previa */}
        {step === 2 && property && showSteps && (
          <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
            <section className="space-y-3 lg:col-span-7" aria-labelledby="vista-previa">
              <h2 id="vista-previa" className="label-sm text-slate-500">Así verán tu propiedad</h2>
              <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div className="relative aspect-[16/9] bg-slate-100">
                  {photos[0] && <Image src={photos[0].url} alt="Foto de portada" fill sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" />}
                  <span className={`label-sm absolute left-3 top-3 rounded-md px-2.5 py-1 backdrop-blur-sm ${isRent ? "bg-white/90 text-ink" : "bg-ink/85 text-white"}`}>
                    {isRent ? "Renta" : "Venta"}
                  </span>
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-ink/75 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    <Icon className="h-3.5 w-3.5"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Icon>
                    {photos.length} {photos.length === 1 ? "foto" : "fotos"}
                  </span>
                  <span className="absolute bottom-3 left-3 rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-600 backdrop-blur-sm">Clave {property.code}</span>
                </div>
                <div className="space-y-4 p-5 sm:p-6">
                  <div className="space-y-1">
                    <p className="label-sm text-azure">
                      {PROPERTY_TYPE_LABEL[type]}
                      {where && ` • ${where}`}
                    </p>
                    <h3 className="font-display text-xl font-bold text-ink">{values["title"] || "Sin título"}</h3>
                  </div>
                  {features.some((f) => Number(values[f]) > 0) && (
                    <dl className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-center sm:grid-cols-5">
                      {features
                        .filter((f) => Number(values[f]) > 0)
                        .map((f) => (
                          <div key={f}>
                            <dd className="font-display text-base font-bold text-ink">
                              {Number(values[f]).toLocaleString("es-MX")}
                              {FEATURE_TILE[f].unit === "m²" && " m²"}
                            </dd>
                            <dt className="text-xs text-slate-500">{FEATURE_TILE[f].label}</dt>
                          </div>
                        ))}
                    </dl>
                  )}
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="metric-price text-ink">{formatMxn(price)}</span>
                    <span className="text-xs font-semibold text-slate-500">MXN{isRent && " /mes"}</span>
                    {perM2 !== null && <span className="text-xs text-slate-500">({formatMxn(perM2)} /m²{isRent && " al mes"})</span>}
                  </p>
                  {fee > 0 && <p className="-mt-3 text-xs text-slate-500">+ {formatMxn(fee)} MXN de mantenimiento al mes</p>}
                  {values["description"] && <p className="line-clamp-4 whitespace-pre-line text-sm text-slate-600">{values["description"]}</p>}
                  {lists.amenities.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {lists.amenities.map((a) => <li key={a} className="label-sm rounded-md bg-slate-100 px-2.5 py-1.5 text-slate-600">{AMENITY_LABEL[a]}</li>)}
                    </ul>
                  )}
                </div>
              </article>
            </section>

            <ReviewChecklist
              className="lg:col-span-5"
              items={[
                { ok: !!values["title"]?.trim() && price > 0, label: "Título y precio", detail: `${values["title"]?.trim() || "Sin título"} · ${formatMxn(price)} MXN` },
                {
                  ok: !!values["postalCode"] && !!values["city"]?.trim(),
                  label: "Código postal y ciudad",
                  detail: values["postalCode"] ? `C.P. ${values["postalCode"]} · ${where}` : "Sin capturar",
                },
                { ok: photos.length > 0, label: "Fotografías", detail: `${photos.length} de ${IMAGE_LIMITS.maxCount}; la primera es la portada` },
                { ok: !!point, optional: true, label: "Marca en el mapa", detail: point ? "Aparecerá en el mapa del listado" : "Sin marca: no aparecerá en el mapa del listado" },
                { ok: !!values["description"]?.trim(), optional: true, label: "Descripción", detail: values["description"]?.trim() ? `${values["description"].trim().length} caracteres` : "Sin descripción" },
                {
                  ok: lists.amenities.length + lists.materials.length > 0,
                  optional: true,
                  label: "Características y materiales",
                  detail: lists.amenities.length + lists.materials.length > 0 ? `${lists.amenities.length} características · ${lists.materials.length} materiales` : "Sin marcar",
                },
              ]}
            />
          </div>
        )}

        {/* Acciones */}
        {!readOnly && (
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            {limited ? (
              <span className="text-sm text-slate-500">Los cambios se ven en el anuncio en cuanto los guardes.</span>
            ) : (
              <div className="flex items-center gap-3">
                {step > 0 && (
                  <button type="button" disabled={busy} onClick={() => go(step - 1)} className={outlineBtn}>
                    ← {STEPS[step - 1]!.title}
                  </button>
                )}
                <span className="text-sm text-slate-500">Paso {step + 1} de {STEPS.length}</span>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {limited ? (
                <button type="button" disabled={busy} onClick={() => void saveChanges()} className={primaryBtn}>{busy ? "Guardando…" : "Guardar cambios"}</button>
              ) : step < 2 ? (
                <button type="button" disabled={busy} onClick={() => void next()} className={primaryBtn}>
                  {busy ? "Guardando…" : `Continuar a ${STEPS[step + 1]!.title.toLowerCase()}`} →
                </button>
              ) : (
                <button type="button" disabled={busy} onClick={() => void submit()} className={primaryBtn}>
                  {busy ? "Enviando…" : "Enviar a revisión"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog open={leave} title="Tienes cambios sin guardar" confirmLabel="Salir sin guardar" danger onConfirm={leaveNow} onClose={() => setLeave(false)}>
        <p>Si sales ahora perderás lo que escribiste desde la última vez que guardaste. Puedes usar «Guardar borrador y salir» para continuar después.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={dupes !== null}
        title="Encontramos publicaciones parecidas"
        confirmLabel="Es distinta, enviar"
        busy={busy}
        onConfirm={() => void submit(true)}
        onClose={() => setDupes(null)}
      >
        <p>Ya existe una publicación muy parecida a la tuya{dupes?.length ? ` (${dupes.join(", ")})` : ""}.</p>
        <p>Si es otra propiedad puedes enviarla de todos modos: el equipo de COSAVE la revisará. No se borra ninguna publicación automáticamente.</p>
      </ConfirmDialog>
    </main>
  );
}

/** Lista de revisión del paso 3: lo obligatorio con palomita y lo opcional que falta, en gris. */
function ReviewChecklist({ items, className }: { items: { ok: boolean; optional?: boolean; label: string; detail: string }[]; className?: string }) {
  return (
    <section className={`${card} ${className ?? ""}`} aria-labelledby="revision">
      <div>
        <h2 id="revision" className="headline-sm flex items-center gap-2 text-ink">
          <Icon className="h-5 w-5 text-azure"><path d="M9 11l3 3 8-8M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" /></Icon>
          Antes de enviar
        </h2>
        <p className="mt-1 text-sm text-slate-600">Lo marcado como opcional no impide enviarla, pero ayuda a que encuentren y elijan tu propiedad.</p>
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.label} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
            {it.ok ? (
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-azure"><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></Icon>
            ) : (
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"><circle cx="12" cy="12" r="9" strokeDasharray="3 3" /></Icon>
            )}
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                {it.label}
                {it.optional && <span className="rounded bg-white px-1.5 py-0.5 text-[0.7rem] font-semibold text-slate-500 ring-1 ring-slate-200">Opcional</span>}
              </p>
              <p className="truncate text-xs text-slate-500">{it.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">Al enviarla, COSAVE revisará los datos y te avisará cuando esté aprobada.</p>
    </section>
  );
}

function MyPropertiesLink({ className }: { className: string }) {
  const { id } = useCurrentUser();
  return <Link href={id ? `/profile/${id}/publicados` : "/home"} className={className}>Ir a mis propiedades</Link>;
}
