import Link from "next/link";
import { ChevronLeft, PackageCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductArtwork } from "@/components/product-artwork";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { OrderButton } from "@/components/order-button";
import { getRepository } from "@/src/lib/repository";
import { productJsonLd, productMetadata } from "@/src/lib/seo";
import { formatPrice } from "@/src/lib/utils";

export async function generateMetadata({ params }: { params: { slug: string; productId: string } }) {
  const repository = getRepository();
  const store = await repository.getStoreBySlug(params.slug, true);
  const product = store ? await repository.getProduct(store.id, params.productId, true) : null;
  return store && product ? productMetadata(store, product) : { title: "Product not found", robots: { index: false } };
}

export default async function ProductPage({ params }: { params: { slug: string; productId: string } }) {
  const repository = getRepository();
  const store = await repository.getStoreBySlug(params.slug, true);
  const product = store ? await repository.getProduct(store.id, params.productId, true) : null;
  if (!store || !product) notFound();
  return <main className="min-h-screen bg-paper"><AnalyticsBeacon event={{ name: "product_view", store_slug: store.slug, product_id: product.id }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(store, product)).replace(/</g, "\\u003c") }} /><header className="border-b border-[#dedbd3] bg-white"><div className="shell flex min-h-20 items-center"><Link className="inline-flex min-h-11 items-center gap-1 text-sm font-bold" href={`/s/${store.slug}`}><ChevronLeft size={18} />Back to {store.name}</Link></div></header><article className="shell grid gap-8 py-7 sm:py-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:gap-16"><section><div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-mist"><ProductArtwork product={product} priority /></div>{product.image_urls.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{product.image_urls.map((url, index) => <div key={url} className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-[#dedbd3]"><ProductArtwork product={{ ...product, image_urls: [url], image_alt_texts: [product.image_alt_texts?.[index] || product.title] }} /></div>)}</div>}</section><section className="lg:py-6"><p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">{product.category || "Collection"}</p><h1 className="mt-3 text-4xl font-black leading-none tracking-[-0.06em] sm:text-5xl">{product.title}</h1><p className="mt-5 text-2xl font-bold">{formatPrice(product.price, product.currency)}</p><div className={`status mt-5 ${product.availability === "in_stock" ? "bg-[#ddefe5] text-success" : "bg-[#fff0d5] text-warning"}`}><PackageCheck size={13} className="mr-1" />{product.availability === "in_stock" ? "In stock" : "Out of stock"}</div>{product.description && <p className="mt-8 whitespace-pre-wrap text-base leading-7 text-neutral-700">{product.description}</p>}<div className="mt-9"><OrderButton store={store} product={product} /></div></section></article></main>;
}
