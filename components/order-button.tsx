import { MessageCircle } from "lucide-react";
import type { Product, Store } from "@/src/lib/types";
import { buildContactLink } from "@/src/lib/order-link";

export function OrderButton({ store, product }: { store: Store; product: Product }) {
  const contact = buildContactLink(store, product);
  if (!contact) return <p className="rounded-xl bg-[#eeece6] px-4 py-3 text-sm text-neutral-600">This shop has not added a contact method yet.</p>;
  const href = `/api/order?store=${encodeURIComponent(store.slug)}&product=${encodeURIComponent(product.id)}`;
  return <a className="button-primary w-full sm:w-auto" href={href}><MessageCircle size={18} />{contact.label}</a>;
}
