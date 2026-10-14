import { Suspense } from "react";
import { PropertiesExplorer } from "@/components/properties/properties-explorer";

export default function Page() {
  return (
    <Suspense>
      <PropertiesExplorer operation="all" />
    </Suspense>
  );
}
