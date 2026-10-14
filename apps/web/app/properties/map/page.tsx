import { BackToList } from "@/components/properties/back-to-list";
import { MapView } from "@/components/properties/map-view";

export const metadata = { title: "Mapa de propiedades — COSAVE" };

/** Mapa con las propiedades publicadas que tienen ubicación. */
export default function PropertiesMapPage() {
  return (
    <main className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-navy">Mapa de propiedades</h1>
          <BackToList />
        </div>
        <MapView />
      </div>
    </main>
  );
}
