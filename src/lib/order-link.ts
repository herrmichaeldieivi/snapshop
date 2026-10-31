import type { ContactLink, Product, Store } from "@/src/lib/types";
import { formatPrice } from "@/src/lib/utils";

export function buildOrderMessage(store: Pick<Store, "name">, product: Pick<Product, "title" | "price" | "currency">) {
  return `Hi ${store.name}, I'm interested in "${product.title}" (${formatPrice(product.price, product.currency)} ${product.currency}). Is it available?`;
}

export function buildContactLink(
  store: Pick<Store, "name" | "whatsapp_number" | "email" | "instagram_handle">,
  product: Pick<Product, "title" | "price" | "currency" | "availability">,
): ContactLink | null {
  const message = encodeURIComponent(buildOrderMessage(store, product));
  const label = product.availability === "out_of_stock" ? "Ask about restock" : "Order this item";

  if (store.whatsapp_number) {
    const number = store.whatsapp_number.replace(/\D/g, "");
    return { href: `https://wa.me/${number}?text=${message}`, channel: "whatsapp", label };
  }
  if (store.email) {
    return { href: `mailto:${encodeURIComponent(store.email)}?subject=${message}`, channel: "email", label };
  }
  if (store.instagram_handle) {
    return { href: `https://instagram.com/${encodeURIComponent(store.instagram_handle.replace(/^@/, ""))}`, channel: "instagram", label };
  }
  return null;
}
