import { NextRequest, NextResponse } from "next/server";
import { buildContactLink } from "@/src/lib/order-link";
import { getRepository } from "@/src/lib/repository";

export async function GET(request: NextRequest) {
  const storeSlug = request.nextUrl.searchParams.get("store");
  const productId = request.nextUrl.searchParams.get("product");
  if (!storeSlug || !productId) return new NextResponse("Not found", { status: 404 });
  const repository = getRepository();
  const store = await repository.getStoreBySlug(storeSlug, true);
  const product = store ? await repository.getProduct(store.id, productId, true) : null;
  if (!store || !product) return new NextResponse("Not found", { status: 404 });
  const contact = buildContactLink(store, product);
  if (!contact) return new NextResponse("Not found", { status: 404 });
  console.info(JSON.stringify({ event: "order_click", store_slug: store.slug, product_id: product.id, channel: contact.channel }));
  return NextResponse.redirect(contact.href, { status: 302 });
}
