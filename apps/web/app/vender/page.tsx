"use client";

import { PropertyForm } from "@/components/publish/property-form";
import { SellerGate } from "@/components/publish/seller-gate";

/** Publicar propiedad: datos → fotos → vista previa → enviar a revisión. */
export default function SellPage() {
  return <SellerGate>{() => <PropertyForm />}</SellerGate>;
}
