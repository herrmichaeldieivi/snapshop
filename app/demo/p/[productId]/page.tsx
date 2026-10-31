import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, MessageCircle, PackageCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductArtwork } from "@/components/product-artwork";
import { Brand } from "@/components/brand";
import { DemoOrderPreview } from "@/components/demo-order-preview";
import { demoRepository } from "@/src/lib/repository/demo-repository";
import { buildOrderMessage } from "@/src/lib/order-link";
import { formatPrice } from "@/src/lib/utils";

export const metadata: Metadata = { title: "Sample product", robots: { index: false, follow: true } };

export default async function DemoProductPage({ params }: { params: { productId: string } }) {
  const store = await demoRepository.getStoreBySlug("juniper-studio", true);
  const product = store ? await demoRepository.getProduct(store.id, params.productId, true) : null;
  if (!store || !product) notFound();
  const message = buildOrderMessage(store, product);
  return <main className="min-h-screen bg-paper"><header className="border-b border-line bg-white"><div className="shell flex min-h-[72px] items-center justify-between gap-3"><Brand/><Link className="button-secondary" href="/demo"><ArrowLeft size={15}/>Sample shop</Link></div></header>
    <div className="border-b border-brand-line bg-brand-soft/70"><div className="shell py-3 text-xs text-[#703629]"><strong>Demo mode.</strong> This message is an example; it will not be sent to a real seller.</div></div>
    <article className="shell grid gap-8 py-7 sm:py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,.9fr)] lg:gap-14"><section><div className="relative aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-mist"><ProductArtwork product={product} priority/></div></section><section className="lg:py-6"><Link href="/demo" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-brand"><ArrowLeft size={15}/>Back to {store.name}</Link><p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[.15em] text-brand">{product.category || "Collection"}</p><h1 className="mt-3 font-display text-4xl leading-none tracking-[-.055em] sm:text-5xl">{product.title}</h1><p className="mt-5 text-2xl font-bold">{formatPrice(product.price, product.currency)}</p><div className={`status mt-5 ${product.availability === "in_stock" ? "bg-[#e7f0e8] text-success" : "bg-[#fff0d5] text-warning"}`}><PackageCheck size={13} className="mr-1"/>{product.availability === "in_stock" ? "In stock" : "Out of stock"}</div>{product.description && <p className="mt-7 whitespace-pre-wrap text-base leading-7 text-neutral-700">{product.description}</p>}<div className="mt-8"><DemoOrderPreview message={message} label={product.availability === "out_of_stock" ? "Preview restock message" : "Preview order message"}/></div><p className="mt-4 flex items-start gap-2 text-xs leading-5 text-neutral-500"><Check size={14} className="mt-0.5 shrink-0 text-pine"/>In a real store, this button opens the seller’s contact app with the product and price filled in.</p><Link href="/" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-brand underline underline-offset-4">Make a shop of your own <MessageCircle size={15}/></Link></section></article>
  </main>;
}
