"use client";

import { use, useEffect, useState } from "react";
import { NoticeCard } from "@/components/notice-card";
import { PropertyForm } from "@/components/publish/property-form";
import { SellerGate } from "@/components/publish/seller-gate";
import { ApiError } from "@/lib/api";
import { mineApi, type MyProperty } from "@/lib/my-properties";

function Loader({ id }: { id: string }) {
  const [state, setState] = useState<{ property?: MyProperty; error?: string } | null>(null);
  useEffect(() => {
    let alive = true;
    mineApi
      .get(id)
      .then((property) => alive && setState({ property }))
      .catch((err) => alive && setState({ error: err instanceof ApiError && err.status === 404 ? "not_found" : "No se pudo cargar la propiedad" }));
    return () => {
      alive = false;
    };
  }, [id]);

  if (!state) return <p className="p-8 text-sm text-slate-600">Cargando…</p>;
  if (state.error === "not_found") return <NoticeCard title="Propiedad no encontrada" text="No existe o no es tuya." href="/vender" cta="Publicar una propiedad" />;
  if (state.error || !state.property) return <p role="alert" className="p-8 text-sm text-red-600">{state.error}</p>;
  return <PropertyForm initial={state.property} />;
}

/** Continuar un borrador o editar una propiedad propia (lo editable depende de su estado). */
export default function EditListingPage({ params }: PageProps<"/vender/[id]">) {
  const { id } = use(params);
  return <SellerGate>{() => <Loader id={id} />}</SellerGate>;
}
