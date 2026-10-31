import { getRepository } from "@/src/lib/repository";
import { siteOrigin } from "@/src/lib/social/config";
import { buildMetaCatalogCsv } from "@/src/lib/social/feed";

export const runtime = "nodejs";

/** Meta Commerce Manager can fetch this on a schedule: Data sources → Scheduled feed. Published stores only. */
export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const repository = getRepository();
  const store = await repository.getStoreBySlug(params.slug, true);
  if (!store) return new Response("Not found", { status: 404 });
  const origin = siteOrigin(new URL(request.url).origin) as string;
  const { csv } = buildMetaCatalogCsv(store, await repository.listProducts(store.id), origin);
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
