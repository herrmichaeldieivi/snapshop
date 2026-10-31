import { createHash } from "node:crypto";
import type { Product, Store } from "@/src/lib/types";
import { toCsvCell } from "@/src/lib/utils";

/** Public JPEG rendition of a product photo. `v` changes when the underlying photo changes, so Meta refetches it. */
export function mediaUrl(origin: string, slug: string, productId: string, index: number, source: string) {
  const version = createHash("sha1").update(source).digest("hex").slice(0, 8);
  return `${origin}/media/${slug}/${productId}/${index}.jpg?v=${version}`;
}

const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value);

const HEADER = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "additional_image_link", "brand"];

/** Meta catalog feed (CSV). Products without a photo or a price can't be listed, so they're skipped and counted. */
export function buildMetaCatalogCsv(store: Pick<Store, "name" | "slug">, products: Product[], origin: string) {
  const rows: string[] = [HEADER.join(",")];
  let included = 0;
  for (const product of products) {
    if (!product.image_urls.length || !(product.price > 0)) continue;
    const images = product.image_urls.slice(0, 10).map((source, index) => mediaUrl(origin, store.slug, product.id, index, source));
    rows.push(
      [
        product.id,
        clip(product.title, 150),
        clip(product.description?.trim() || product.title, 5000),
        product.availability === "in_stock" ? "in stock" : "out of stock",
        "new",
        `${product.price.toFixed(2)} ${product.currency}`,
        `${origin}/s/${store.slug}/p/${product.id}`,
        images[0],
        images.slice(1).join(","),
        clip(store.name, 100),
      ]
        .map(toCsvCell)
        .join(","),
    );
    included += 1;
  }
  return { csv: `${rows.join("\r\n")}\r\n`, included, skipped: products.length - included };
}
