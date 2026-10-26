import { describe, expect, it } from "vitest";
import { changedFields } from "./audit.js";

describe("changedFields", () => {
  const current = { price: 2_500_000, description: "Casa con jardín", bedrooms: 3, title: "Casa" };

  it("solo incluye los campos que cambiaron, con su valor anterior y nuevo", () => {
    const c = changedFields(current, { price: 2_400_000, bedrooms: 3 });
    expect(c.keys).toEqual(["price"]);
    expect(c.before).toEqual({ price: 2_500_000 });
    expect(c.after).toEqual({ price: 2_400_000 });
  });

  it("ignora los campos no enviados (undefined)", () => {
    expect(changedFields(current, { price: undefined, description: undefined }).keys).toEqual([]);
  });

  it("borrar un dato (null) cuenta como cambio", () => {
    const c = changedFields(current, { description: null });
    expect(c.keys).toEqual(["description"]);
    expect(c.after).toEqual({ description: null });
  });

  it("un dato que no existía y se llena cuenta como cambio", () => {
    const c = changedFields({ ...current, parkingSpots: undefined }, { parkingSpots: 2 });
    expect(c.before).toEqual({ parkingSpots: null });
    expect(c.after).toEqual({ parkingSpots: 2 });
  });

  it("sin cambios reales no hay nada que registrar", () => {
    expect(changedFields(current, { ...current }).keys).toEqual([]);
  });
});
