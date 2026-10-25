import { describe, expect, it } from "vitest";
import { matchesSearch, type MatchCriteria, type MatchTarget } from "./search-matching.js";

const casa: MatchTarget = {
  operation: "sale",
  type: "house",
  price: 2_500_000,
  state: "Yucatán",
  city: "Mérida",
  zone: "Norte",
  bedrooms: 3,
  bathrooms: 2,
};

/** Búsqueda sin criterios opcionales: solo exige la operación. */
const any: MatchCriteria = {
  operation: "sale",
  propertyType: null,
  state: null,
  city: null,
  zone: null,
  minPrice: null,
  maxPrice: null,
  minBedrooms: null,
  minBathrooms: null,
};

const search = (patch: Partial<MatchCriteria>): MatchCriteria => ({ ...any, ...patch });

describe("matchesSearch", () => {
  it("coincide si la búsqueda solo pide la operación", () => {
    expect(matchesSearch(any, casa)).toBe(true);
  });

  it("la operación es obligatoria y exacta", () => {
    expect(matchesSearch(search({ operation: "rent" }), casa)).toBe(false);
  });

  it("el tipo debe ser igual si la búsqueda lo pide", () => {
    expect(matchesSearch(search({ propertyType: "house" }), casa)).toBe(true);
    expect(matchesSearch(search({ propertyType: "apartment" }), casa)).toBe(false);
  });

  it("compara ubicación sin distinguir mayúsculas, acentos ni espacios", () => {
    expect(matchesSearch(search({ state: "yucatan", city: "  MERIDA ", zone: "norte" }), casa)).toBe(true);
    expect(matchesSearch(search({ city: "Valladolid" }), casa)).toBe(false);
    expect(matchesSearch(search({ state: "Quintana Roo", city: "Mérida" }), casa)).toBe(false);
  });

  it("si la búsqueda pide zona y la propiedad no tiene, no coincide", () => {
    expect(matchesSearch(search({ zone: "Norte" }), { ...casa, zone: null })).toBe(false);
  });

  it("el precio es exacto, sin margen, e incluye los límites", () => {
    expect(matchesSearch(search({ minPrice: 2_000_000, maxPrice: 3_000_000 }), casa)).toBe(true);
    expect(matchesSearch(search({ maxPrice: 2_500_000 }), casa)).toBe(true);
    expect(matchesSearch(search({ minPrice: 2_500_000 }), casa)).toBe(true);
    expect(matchesSearch(search({ maxPrice: 2_499_999 }), casa)).toBe(false);
    expect(matchesSearch(search({ minPrice: 2_500_001 }), casa)).toBe(false);
  });

  it("recámaras y baños son mínimos", () => {
    expect(matchesSearch(search({ minBedrooms: 3, minBathrooms: 2 }), casa)).toBe(true);
    expect(matchesSearch(search({ minBedrooms: 4 }), casa)).toBe(false);
    expect(matchesSearch(search({ minBathrooms: 3 }), casa)).toBe(false);
  });

  it("si la propiedad no informa recámaras, no cumple un mínimo pedido", () => {
    expect(matchesSearch(search({ minBedrooms: 1 }), { ...casa, bedrooms: null })).toBe(false);
    expect(matchesSearch(search({ minBedrooms: 0 }), { ...casa, bedrooms: null })).toBe(true);
  });

  it("todos los criterios juntos", () => {
    const full = search({
      propertyType: "house",
      state: "Yucatán",
      city: "Mérida",
      zone: "Norte",
      minPrice: 2_000_000,
      maxPrice: 2_500_000,
      minBedrooms: 3,
      minBathrooms: 2,
    });
    expect(matchesSearch(full, casa)).toBe(true);
    expect(matchesSearch(full, { ...casa, price: 2_600_000 })).toBe(false);
  });
});
