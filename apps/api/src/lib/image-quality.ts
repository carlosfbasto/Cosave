import sharp from "sharp";
import { laplacianVariance, SHARPNESS } from "@cosave/shared";

/** Nitidez de una foto con el mismo cálculo que hace el navegador antes de subirla (ver `SHARPNESS`). */
export async function sharpness(bytes: Buffer): Promise<number> {
  const { data, info } = await sharp(bytes)
    .rotate()
    .resize(SHARPNESS.size, SHARPNESS.size, { fit: "inside", withoutEnlargement: true })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return laplacianVariance(data, info.width, info.height);
}

export const MIN_SHARPNESS = SHARPNESS.min;
