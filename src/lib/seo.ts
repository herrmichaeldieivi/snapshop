import type { Metadata } from "next";
import type { Product, Store } from "@/src/lib/types";
import { formatPrice } from "@/src/lib/utils";

function publicUrl(path: string) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return origin ? `${origin}${path}` : undefined;
}

export function storeMetadata(store: Store, productImage?: string): Metadata {
  const path = `/s/${store.slug}`;
  const description = store.tagline || store.about_text || `Browse ${store.name}'s products.`;
  const image = productImage || store.logo_url || undefined;
  const url = publicUrl(path);
  return { title: store.name, description, alternates: url ? { canonical: url } : undefined, openGraph: { type: "website", title: store.name, description, url, siteName: "Snap Shop", images: image ? [{ url: image }] : undefined }, twitter: { card: "summary_large_image", title: store.name, description, images: image ? [image] : undefined } };
}

export function productMetadata(store: Store, product: Product): Metadata {
  const path = `/s/${store.slug}/p/${product.id}`;
  const description = product.description || `${product.title} from ${store.name}.`;
  const image = product.image_urls[0] || store.logo_url || undefined;
  const url = publicUrl(path);
  return { title: `${product.title} — ${store.name}`, description, alternates: url ? { canonical: url } : undefined, openGraph: { type: "website", title: product.title, description, url, siteName: store.name, images: image ? [{ url: image }] : undefined }, twitter: { card: "summary_large_image", title: product.title, description, images: image ? [image] : undefined } };
}

export function storeJsonLd(store: Store) {
  return { "@context": "https://schema.org", "@type": "LocalBusiness", name: store.name, description: store.about_text || store.tagline || undefined, email: store.email || undefined, telephone: store.whatsapp_number || undefined, sameAs: store.instagram_handle ? [`https://instagram.com/${store.instagram_handle}`] : undefined, url: publicUrl(`/s/${store.slug}`), image: store.logo_url || undefined };
}

export function productJsonLd(store: Store, product: Product) {
  return { "@context": "https://schema.org", "@type": "Product", name: product.title, description: product.description || undefined, image: product.image_urls.length ? product.image_urls : undefined, sku: product.sku || undefined, offers: { "@type": "Offer", priceCurrency: product.currency, price: product.price.toFixed(2), availability: product.availability === "in_stock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: publicUrl(`/s/${store.slug}/p/${product.id}`), description: `${formatPrice(product.price, product.currency)} ${product.currency}` } };
}
