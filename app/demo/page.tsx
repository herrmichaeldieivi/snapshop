import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, MessageCircle } from "lucide-react";
import { Brand } from "@/components/brand";
import { StorefrontGrid } from "@/components/storefront-grid";
import { demoRepository } from "@/src/lib/repository/demo-repository";
import { isDemoMode } from "@/src/lib/supabase";

export const metadata: Metadata = { title: "Sample storefront", description: "Browse a working sample Snap Shop storefront.", robots: { index: false, follow: true } };

export default async function DemoStorePage() {
  const store = await demoRepository.getStoreBySlug("juniper-studio", true);
  if (!store) return null;
  const products = await demoRepository.listProducts(store.id);
  return <main className="min-h-screen bg-paper" style={{ "--store-accent": store.theme_color } as React.CSSProperties}>
    <header className="border-b border-line bg-white"><div className="shell flex min-h-[72px] items-center justify-between gap-3"><Brand/><Link href="/" className="button-secondary"><ArrowLeft size={15}/>Snap Shop</Link></div></header>
    <div className="border-b border-brand-line bg-brand-soft/70"><div className="shell flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-[#703629] sm:text-sm"><strong>A sample shop.</strong> Browse around; no real order will be sent.</p>{isDemoMode() ? <Link href="/admin" className="inline-flex min-h-10 w-fit items-center gap-1.5 text-xs font-bold text-brand underline underline-offset-4">Try the admin workspace <ArrowRight size={14}/></Link> : <Link href="/login" className="inline-flex min-h-10 w-fit items-center gap-1.5 text-xs font-bold text-brand underline underline-offset-4">Shop owner? Log in <ArrowRight size={14}/></Link>}</div></div>
    <header className="border-b border-line bg-white"><div className="shell py-7 sm:py-10"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f0e8] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-pine"><BadgeCheck size={13}/>Made with Snap Shop</span><h1 className="mt-4 font-display text-4xl tracking-[-.055em] sm:text-6xl">{store.name}</h1><p className="mt-2 text-sm text-neutral-600 sm:text-base">{store.tagline}</p></div><span className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-pine"><MessageCircle size={17}/>Browse, then message to order</span></div></div></header>
    <StorefrontGrid store={store} products={products} productBasePath="/demo/p" />
    <section className="shell pb-12"><div className="rounded-[1.5rem] bg-pine px-6 py-8 text-white sm:px-9"><p className="font-mono text-[10px] font-bold uppercase tracking-[.13em] text-[#f3c7ae]">A sample business</p><h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">Objects for slower mornings.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">{store.about_text}</p></div></section>
    <footer className="shell flex min-h-16 items-center justify-between border-t border-line text-sm text-neutral-600"><span>Sample only · Contact actions are previews</span><Link href="/" className="font-bold text-brand">Make a shop like this</Link></footer>
  </main>;
}
