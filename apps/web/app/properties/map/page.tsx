import { redirect } from "next/navigation";

/** El mapa ahora vive dentro del listado; esta ruta se conserva para no romper enlaces. */
export default function PropertiesMapPage() {
  redirect("/properties?vista=mapa");
}
