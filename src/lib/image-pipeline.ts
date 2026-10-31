import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { fetchSafeImage } from "@/src/lib/image-security";
import { getServiceSupabase, isDemoMode } from "@/src/lib/supabase";

const MAX_BYTES = 10 * 1024 * 1024;
const allowedFormats = new Set(["jpeg", "png", "webp"]);

async function persist(storeId: string, input: Buffer, bucket: "product-images" | "store-logos" = "product-images") {
  const metadata = await sharp(input).metadata();
  if (!metadata.format || !allowedFormats.has(metadata.format)) throw new Error("Image must be a JPEG, PNG, or WebP file.");
  const webp = await sharp(input).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
  if (isDemoMode()) return `data:image/webp;base64,${webp.toString("base64")}`;
  const supabase = getServiceSupabase();
  if (!supabase) throw new Error("Image storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY on the server.");
  const path = `${storeId}/${randomUUID()}.webp`;
  const { error } = await supabase.storage.from(bucket).upload(path, webp, { contentType: "image/webp", upsert: false });
  if (error) throw new Error("Image upload failed.");
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function processUploadedImage(storeId: string, file: File, bucket: "product-images" | "store-logos" = "product-images") {
  if (file.size > MAX_BYTES) throw new Error("Each image must be 10 MB or smaller.");
  if (!/\.(?:jpe?g|png|webp)$/i.test(file.name)) throw new Error("Image filename must end in .jpg, .jpeg, .png, or .webp.");
  if (file.type && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Upload a JPEG, PNG, or WebP image.");
  return persist(storeId, Buffer.from(await file.arrayBuffer()), bucket);
}

export async function processImportedImage(storeId: string, url: string) {
  const { bytes } = await fetchSafeImage(url);
  return persist(storeId, bytes);
}

export async function processImageBytes(storeId: string, bytes: Buffer) {
  if (bytes.length > MAX_BYTES) throw new Error("Each image must be 10 MB or smaller.");
  return persist(storeId, bytes);
}
