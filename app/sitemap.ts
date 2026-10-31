import type { MetadataRoute } from "next";
import { getRepository } from "@/src/lib/repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!origin) return [];
  const stores = await getRepository().listStores({ id: "public", email: null, isOperator: true, isDemo: false });
  const published = stores.filter((store) => store.status === "published");
  const productEntries = await Promise.all(published.map(async (store) => (await getRepository().listProducts(store.id)).map((product) => ({ url: `${origin}/s/${store.slug}/p/${product.id}`, lastModified: new Date(product.updated_at) }))));
  return [{ url: `${origin}/`, changeFrequency: "weekly", priority: 1 }, ...published.map((store) => ({ url: `${origin}/s/${store.slug}`, lastModified: new Date(store.updated_at) })), ...productEntries.flat()];
}
