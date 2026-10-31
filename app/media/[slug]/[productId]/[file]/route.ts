import { fetchSafeImage } from "@/src/lib/image-security";
import { getRepository } from "@/src/lib/repository";
import { toFeedJpeg } from "@/src/lib/social/jpeg";

export const runtime = "nodejs";

const MAX_DATA_URL_BYTES = 15 * 1024 * 1024;

async function sourceBytes(source: string): Promise<Buffer> {
  const data = /^data:image\/(?:png|jpe?g|webp);base64,(.+)$/.exec(source);
  if (data?.[1]) {
    const bytes = Buffer.from(data[1], "base64");
    if (bytes.length > MAX_DATA_URL_BYTES) throw new Error("Image too large.");
    return bytes;
  }
  return Buffer.from((await fetchSafeImage(source)).bytes);
}

/** Public JPEG rendition of a published product photo. Instagram, Facebook and Meta catalogs fetch this. */
export async function GET(_request: Request, { params }: { params: { slug: string; productId: string; file: string } }) {
  const match = /^(\d{1,2})\.jpe?g$/.exec(params.file);
  if (!match) return new Response("Not found", { status: 404 });
  const repository = getRepository();
  const store = await repository.getStoreBySlug(params.slug, true);
  const product = store ? await repository.getProduct(store.id, params.productId, true) : null;
  const source = product?.image_urls[Number(match[1])];
  if (!source) return new Response("Not found", { status: 404 });
  try {
    const jpeg = await toFeedJpeg(await sourceBytes(source));
    return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300, s-maxage=3600" } });
  } catch {
    return new Response("Image unavailable", { status: 502 });
  }
}
