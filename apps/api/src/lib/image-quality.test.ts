import { readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { MIN_SHARPNESS, sharpness } from "./image-quality.js";

const photo = readFileSync(new URL("../../../web/public/img/sala.jpg", import.meta.url));

describe("sharpness", () => {
  it("una foto enfocada pasa el mínimo", async () => {
    expect(await sharpness(photo)).toBeGreaterThan(MIN_SHARPNESS);
  });

  it("la misma foto desenfocada queda por debajo del mínimo", async () => {
    const blurry = await sharp(photo).blur(3).jpeg().toBuffer();
    expect(await sharpness(blurry)).toBeLessThan(MIN_SHARPNESS);
  });

  it("no depende del tamaño de la foto", async () => {
    const big = await sharp(photo).resize(2400).jpeg({ quality: 95 }).toBuffer();
    expect(await sharpness(big)).toBeGreaterThan(MIN_SHARPNESS);
  });
});
