import { NextRequest } from "next/server";
import { requireStoreAccess } from "@/src/lib/access";
import { getRepository } from "@/src/lib/repository";
import { toCsvCell } from "@/src/lib/utils";

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("store_id") || "";
  const { store } = await requireStoreAccess(storeId);
  const products = await getRepository().listProducts(store.id);
  const rows = [
    ["title", "price", "image_url", "description", "category", "currency", "availability", "external_link", "sku"],
    ...products.map((product) => [product.title, product.price.toFixed(2), product.image_urls.join(","), product.description || "", product.category || "", product.currency, product.availability, product.external_link || "", product.sku || ""]),
  ].map((row) => row.map(toCsvCell).join(","));
  return new Response(rows.join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${store.slug}-products.csv"` } });
}
