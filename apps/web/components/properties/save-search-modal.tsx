"use client";

import { useEffect, useRef, useState } from "react";
import {
  OPERATION_TYPES,
  PROPERTY_TYPE_LABEL,
  PROPERTY_TYPES,
  savedSearchCriteriaSchema,
  type OperationType,
  type PropertyType,
} from "@cosave/shared";
import { ValidatedField } from "@/components/validated-field";
import { useCurrentUser } from "@/lib/current-user";
import { formatMxn, USD_RATE } from "@/lib/mock-data";
import { saveSearch } from "@/lib/saved-searches";
import { norm, type ParsedQuery } from "@/lib/search";
import type { Filters } from "./filters-sidebar";
import type { Facets } from "./url-state";

/** Criterios del modal como texto (vacío = sin dato). Los precios son solo dígitos, en MXN. */
export interface SearchDraft {
  operation: OperationType | "";
  propertyType: PropertyType | "";
  state: string;
  city: string;
  minPrice: string;
  maxPrice: string;
}

/** Etiqueta del filtro o palabra del buscador → tipo de inmueble ("Bodega Comercial", "casa"…). */
const TYPE_WORDS: [RegExp, PropertyType][] = [
  [/^casa/, "house"],
  [/^(departamento|depa)/, "apartment"],
  [/^terreno/, "land"],
  [/^bodega industrial/, "industrial_warehouse"],
  [/^bodega/, "commercial_warehouse"],
  [/^(local|comercial)/, "commercial"],
  [/^otro/, "other"],
];
const typeOf = (s: string) => TYPE_WORDS.find(([re]) => re.test(norm(s)))?.[1];

/** Primer valor del catálogo que aparece escrito en el buscador ("casa en mérida" → "Mérida"). */
const named = (text: string, options: string[]) => options.find((o) => text.includes(norm(o))) ?? "";

/**
 * Criterios iniciales del modal: lo que ya marcó en los filtros y, si no, lo que escribió en el buscador.
 * Un filtro con varias opciones marcadas no se precarga: lo elige la persona.
 */
export function draftFromSearch(
  operation: OperationType | "all",
  filters: Filters,
  q: string,
  parsed: ParsedQuery,
  facets: Pick<Facets, "states" | "cities">,
): SearchDraft {
  const text = norm(q);
  const one = (list: string[]) => (list.length === 1 ? list[0]! : "");
  const rate = filters.currency === "USD" ? USD_RATE : 1;
  const price = (filter: number | undefined, typed: number | undefined) => {
    const n = filter !== undefined ? filter * rate : typed;
    return n === undefined ? "" : String(Math.round(n));
  };
  return {
    operation: operation === "all" ? "" : operation,
    propertyType: (filters.types.length === 1 ? typeOf(filters.types[0]!) : parsed.words.map(typeOf).find(Boolean)) ?? "",
    state: one(filters.states) || (filters.states.length ? "" : named(text, facets.states)),
    city: one(filters.cities) || (filters.cities.length ? "" : named(text, facets.cities)),
    minPrice: price(filters.price.min, parsed.minPrice),
    maxPrice: price(filters.price.max, parsed.maxPrice),
  };
}

const OPERATION_LABEL: Record<OperationType, string> = { sale: "Venta", rent: "Renta" };
const operationOptions = OPERATION_TYPES.map((o) => ({ value: o, label: OPERATION_LABEL[o] }));
const typeOptions = PROPERTY_TYPES.map((t) => ({ value: t, label: PROPERTY_TYPE_LABEL[t] }));

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 12);
const money = (v: string) => (v ? formatMxn(Number(v)) : "");
const place = (v: string) => (v.trim().length > 80 ? "Máximo 80 caracteres." : null);
const none = () => null;
const needOperation = (v: string) => (v ? null : "Elige venta o renta.");

const chip = "rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600";

/** Criterios en texto corto para el resumen del modal (vacío si no hay ninguno que mostrar). */
function summaryOf(v: SearchDraft): string[] {
  const price =
    v.minPrice && v.maxPrice
      ? `Entre ${money(v.minPrice)} y ${money(v.maxPrice)}`
      : v.minPrice
        ? `Desde ${money(v.minPrice)}`
        : v.maxPrice
          ? `Hasta ${money(v.maxPrice)}`
          : "";
  return [
    v.operation && OPERATION_LABEL[v.operation],
    v.propertyType && PROPERTY_TYPE_LABEL[v.propertyType],
    [v.city.trim(), v.state.trim()].filter(Boolean).join(", "),
    price,
  ].filter((x): x is string => !!x);
}

function ModalBody({ initial, onClose }: { initial: SearchDraft; onClose: () => void }) {
  const who = useCurrentUser();
  const [values, setValues] = useState<SearchDraft>(initial);
  const [submitted, setSubmitted] = useState(false); // tras pulsar «Guardar» se muestran los errores de todos los campos
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = (k: keyof SearchDraft) => (v: string) => setValues((s) => ({ ...s, [k]: v }));
  const minAboveMax = !!values.minPrice && !!values.maxPrice && Number(values.minPrice) > Number(values.maxPrice);
  const priceOrder = () => (minAboveMax ? "El precio mínimo no puede ser mayor que el máximo." : null);
  const summary = summaryOf(values);

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError(null);
    setSubmitted(true);
    // Los errores de cada campo ya se ven bajo el campo; aquí solo se detiene el envío.
    if (needOperation(values.operation) || place(values.state) || place(values.city) || minAboveMax) return;
    const parsed = savedSearchCriteriaSchema.safeParse({
      operation: values.operation || undefined,
      propertyType: values.propertyType || undefined,
      // Sin espacios sobrantes: un criterio de solo espacios no es «sin dato» y la alerta nunca coincidiría.
      state: values.state.trim() || undefined,
      city: values.city.trim() || undefined,
      minPrice: values.minPrice ? Number(values.minPrice) : undefined,
      maxPrice: values.maxPrice ? Number(values.maxPrice) : undefined,
    });
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      setFormError(
        field === "operation"
          ? "Elige si buscas en venta o en renta."
          : field === "minPrice"
            ? "El precio mínimo no puede ser mayor que el máximo."
            : "Revisa los datos de tu búsqueda.",
      );
      return;
    }
    if (!who.id || sending) return;
    setSending(true);
    try {
      await saveSearch({ id: who.id, remote: who.remote }, parsed.data);
      setSent(true);
    } catch {
      setFormError("No pudimos guardar tu búsqueda. Inténtalo de nuevo en unos minutos.");
    } finally {
      setSending(false);
    }
  }

  const header = (
    <div className="border-b border-slate-100 pb-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Guardar mi búsqueda</p>
      <h2 id="save-search-modal-title" className="mt-1 text-lg font-bold leading-snug text-ink">Te avisamos cuando lo encontremos</h2>
      <p className="mt-1 text-xs text-slate-500">
        Guardaremos estos criterios de búsqueda y, cuando COSAVE tenga propiedades que coincidan, te lo notificaremos.
      </p>
    </div>
  );

  if (sent) {
    return (
      <div className="space-y-5 p-6">
        {header}
        <div role="status" className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-azure text-2xl font-bold text-white">✓</span>
          <p className="font-bold text-ink">¡Búsqueda guardada!</p>
          <p className="text-sm text-slate-600">Te notificaremos cuando haya coincidencias. Puedes verla en «Mis búsquedas guardadas» de tu perfil.</p>
        </div>
        <button type="button" onClick={onClose} className="w-full cursor-pointer rounded-lg bg-ink px-4 py-2.5 font-semibold text-white transition-colors hover:bg-ink-hover">
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 p-6">
      {header}
      <div aria-live="polite" className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-slate-500">Se guardará:</span>
        {summary.length ? summary.map((t) => <span key={t} className={chip}>{t}</span>) : <span className="text-xs text-slate-500">aún sin criterios</span>}
      </div>
      <ValidatedField
        id="ss-operation" label="Operación" value={values.operation} options={operationOptions} placeholder="Venta o renta"
        validate={needOperation} onChange={set("operation")} showErrors={submitted}
      />
      <ValidatedField
        id="ss-type" label="Tipo de propiedad" value={values.propertyType} options={typeOptions} placeholder="Cualquier tipo"
        validate={none} onChange={set("propertyType")} showErrors={submitted}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <ValidatedField
          id="ss-state" label="Estado" value={values.state} placeholder="Ej. Yucatán" autoComplete="address-level1"
          validate={place} onChange={set("state")} showErrors={submitted}
        />
        <ValidatedField
          id="ss-city" label="Ciudad" value={values.city} placeholder="Ej. Mérida" autoComplete="address-level2"
          validate={place} onChange={set("city")} showErrors={submitted}
        />
        <ValidatedField
          id="ss-min" label="Precio mínimo" value={values.minPrice} placeholder="$1,500,000" inputMode="numeric"
          sanitize={digits} format={money} validate={priceOrder} onChange={set("minPrice")} showErrors={submitted}
        />
        <ValidatedField
          id="ss-max" label="Precio máximo" value={values.maxPrice} placeholder="$2,000,000" inputMode="numeric"
          sanitize={digits} format={money} validate={none} onChange={set("maxPrice")} showErrors={submitted}
        />
      </div>
      {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={sending}
          className="cursor-pointer rounded-lg bg-azure px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-azure-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "Guardando…" : "Guardar búsqueda"}
        </button>
      </div>
    </form>
  );
}

/** Modal "Guardar mi búsqueda": criterios precargados desde el buscador y los filtros, editables. */
export function SaveSearchModal({ open, initial, onClose }: { open: boolean; initial: SearchDraft; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-labelledby="save-search-modal-title"
      className="m-auto max-h-[92vh] w-[min(94vw,28rem)] overflow-x-hidden rounded-xl p-0 shadow-veil backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      {open && <ModalBody initial={initial} onClose={onClose} />}
    </dialog>
  );
}
