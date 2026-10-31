import { notFound } from "next/navigation";
import Link from "next/link";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import { StorefrontGrid } from "@/components/storefront-grid";
import { ProductArtwork } from "@/components/product-artwork";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { getRepository } from "@/src/lib/repository";
import { storeJsonLd, storeMetadata } from "@/src/lib/seo";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const repository = getRepository();
  const store = await repository.getStoreBySlug(params.slug, true);
  const firstProduct = store ? (await repository.listProducts(store.id))[0] : null;
  return store ? storeMetadata(store, firstProduct?.image_urls[0]) : { title: "Store not found", robots: { index: false } };
}

export default async function StorefrontPage({ params }: { params: { slug: string } }) {
  const repository = getRepository();
  const store = await repository.getStoreBySlug(params.slug, true);
  if (!store) notFound();
  const products = await repository.listProducts(store.id);
  const primaryHref = store.whatsapp_number ? `https://wa.me/${store.whatsapp_number.replace(/\D/g, "")}` : store.email ? `mailto:${store.email}` : store.instagram_handle ? `https://instagram.com/${store.instagram_handle}` : null;
  return <main className="min-h-screen bg-paper" style={{ "--store-accent": store.theme_color } as React.CSSProperties}>
    <AnalyticsBeacon event={{ name: "storefront_view", store_slug: store.slug }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd(store)).replace(/</g, "\\u003c") }} />
    <header className="border-b border-[#dedbd3] bg-white">
      <div className="shell py-5 sm:py-8"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start"><Link href="/" className="flex min-h-11 items-center gap-3"><div className="relative size-12 overflow-hidden rounded-2xl bg-mist">{store.logo_url ? <ProductArtwork product={{ title: store.name, image_urls: [store.logo_url], image_alt_texts: [store.name] }} className="object-contain p-1" priority /> : <span className="grid h-full place-items-center text-xl font-black" style={{ color: store.theme_color }}>{store.name.charAt(0)}</span>}</div><div><p className="text-xl font-black tracking-[-0.05em]">{store.name}</p>{store.tagline && <p className="mt-1 text-sm text-neutral-600">{store.tagline}</p>}</div></Link>{primaryHref && <a href={primaryHref} className="button-primary" style={{ backgroundColor: store.theme_color }}><MessageCircle size={17} />Contact the shop</a>}</div></div>
    </header>
    <StorefrontGrid store={store} products={products} />
    <section className="shell pb-16"><div className="rounded-3xl bg-ink px-6 py-10 text-white sm:px-10"><p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-white/60">About {store.name}</p><p className="mt-4 max-w-3xl text-xl leading-8 sm:text-2xl">{store.about_text || store.tagline || "A considered collection, ready to browse."}</p><div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold">{store.email && <a className="inline-flex min-h-11 items-center gap-2 underline" href={`mailto:${store.email}`}><Mail size={16} />{store.email}</a>}{store.instagram_handle && <a className="inline-flex min-h-11 items-center gap-2 underline" href={`https://instagram.com/${store.instagram_handle}`}><Instagram size={16} />@{store.instagram_handle}</a>}</div></div></section>
    <footer className="shell flex min-h-20 items-center justify-between border-t border-[#dedbd3] text-sm text-neutral-600"><span>© {new Date().getFullYear()} {store.name}</span><Link href="/" className="font-bold text-ink">Powered by Snap Shop</Link></footer>
  </main>;
}
