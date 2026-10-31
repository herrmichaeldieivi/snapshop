import sharp from "sharp";

/**
 * Instagram only publishes JPEG, in a 4:5 – 1.91:1 frame; Meta catalogs want JPEG/PNG. Our stored photos are WebP,
 * so Meta gets this rendition: flattened onto white, letterboxed to a square when the ratio is out of range.
 */
export async function toFeedJpeg(input: Buffer): Promise<Buffer> {
  const flat = await sharp(input).rotate().flatten({ background: "#ffffff" }).toBuffer({ resolveWithObject: true });
  const { width, height } = flat.info;
  const ratio = width / height;
  let pipeline = sharp(flat.data);
  if (ratio < 0.8 || ratio > 1.91) {
    const side = Math.min(1440, Math.max(width, height));
    pipeline = pipeline.resize(side, side, { fit: "contain", background: "#ffffff" });
  } else {
    pipeline = pipeline.resize({ width: 1440, withoutEnlargement: true });
  }
  return pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}
