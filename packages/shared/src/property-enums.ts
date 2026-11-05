import { z } from "zod";

/**
 * Tipo de inmueble y operación. Viven en su propio módulo (y `index.ts` los reexporta) para que los
 * módulos de búsqueda puedan usarlos sin crear un ciclo de importaciones con `index.ts`.
 */
export const PROPERTY_TYPES = ["house", "land", "apartment", "commercial", "commercial_warehouse", "industrial_warehouse", "other"] as const;
export const OPERATION_TYPES = ["sale", "rent"] as const;

export const propertyTypeSchema = z.enum(PROPERTY_TYPES);
export const operationTypeSchema = z.enum(OPERATION_TYPES);

export type PropertyType = z.infer<typeof propertyTypeSchema>;
export type OperationType = z.infer<typeof operationTypeSchema>;

/** Nombre de cada tipo de inmueble para el usuario. */
export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  house: "Casa",
  apartment: "Departamento",
  land: "Terreno",
  commercial: "Local comercial",
  commercial_warehouse: "Bodega comercial",
  industrial_warehouse: "Bodega industrial",
  other: "Otro",
};
