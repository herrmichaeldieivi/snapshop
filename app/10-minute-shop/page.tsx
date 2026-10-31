import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Clock3, Download, ExternalLink, Image, MessageCircle, Package, Sparkles, Upload } from "lucide-react";
import { Brand } from "@/components/brand";
import { isDemoMode } from "@/src/lib/supabase";

export const metadata: Metadata = {
  title: "The 10-minute shop launch guide",
  description: "A practical, minute-by-minute checklist for turning your product list into a shop link you can share on Instagram.",
  robots: { index: false, follow: true },
};

const minutes = [
  { time: "00–02", title: "Choose your first products", icon: Package, details: "Pick 3–10 products you can confidently sell today. Write each product title, price, and stock status. If your catalogue is already in a spreadsheet, download the Snap Shop CSV template and paste in the rows." },
  { time: "02–04", title: "Gather the photos and details", icon: Image, details: "Choose a clear, bright photo for every item. Add a one- or two-sentence description, a useful category, and an SKU if you already use one. Keep the first photo simple: customers want to see the product." },
  { time: "04–06", title: "Bring your catalogue into Snap Shop", icon: Upload, details: "Upload the CSV to validate it before anything goes live, or add a product by hand. Fix any highlighted rows and preview the catalogue before you commit." },
  { time: "06–08", title: "Add the shop details people need", icon: Sparkles, details: "Write a short tagline, add your email or WhatsApp contact, choose your currency, and set the brand colour. Keep your contact details consistent with the account customers already recognize." },
  { time: "08–10", title: "Publish and put the link to work", icon: MessageCircle, details: "Check product availability, publish the shop, then add the link to your Instagram bio. Share it in a Story or a DM when someone asks what is available." },
];

export default function TenMinuteShopGuide() {
  const workspaceHref = isDemoMode() ? "/admin" : "/login";
  const workspaceLabel = isDemoMode() ? "Try the demo workspace" : "Log in to your workspace";
  return (
    <main className="min-h-screen bg-paper">
      <header className="shell flex min-h-[72px] items-center justify-between border-b border-line"><Brand/><Link className="button-secondary" href="/">Back to Snap Shop <ArrowRight className="rotate-180" size={15}/></Link></header>
      <article className="shell max-w-4xl pb-16 pt-11 sm:pb-24 sm:pt-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-brand"><Clock3 size={13}/>The free 10-minute launch guide</div>
        <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[.96] tracking-[-.055em] sm:text-7xl">From product list to <span className="text-brand">shop link.</span></h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg sm:leading-8">A short, practical plan to get your first shareable product shop ready. Keep this page open while you work; you don’t need a website, checkout setup, or a perfect catalogue to begin.</p>
        <div className="mt-8 flex flex-wrap gap-3"><a href="/snapshop-template.csv" download className="button-primary"><Download size={16}/>Download the product CSV template</a><Link href="/demo" className="button-secondary">Browse the sample shop <ExternalLink size={15}/></Link><Link href={workspaceHref} className="button-secondary">{workspaceLabel} <ArrowRight size={15}/></Link></div>
        <section className="mt-11 overflow-hidden rounded-[1.5rem] border border-line bg-white shadow-card" aria-label="Ten-minute checklist">{minutes.map(({time,title,icon:Icon,details},index) => <div key={time} className={`grid gap-3 p-5 sm:grid-cols-[88px_1fr] sm:gap-5 sm:p-7 ${index < minutes.length-1 ? "border-b border-[#eee9e1]" : ""}`}><div className="flex items-center gap-2 font-mono text-xs font-bold text-brand sm:block"><Icon className="sm:hidden" size={16}/><span>{time} MIN</span></div><div><div className="flex items-center gap-3"><span className="hidden size-9 place-items-center rounded-xl bg-[#f2eee5] text-pine sm:grid"><Icon size={17}/></span><h2 className="font-display text-xl tracking-[-.035em] sm:text-2xl">{title}</h2></div><p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">{details}</p></div></div>)}</section>
        <section className="mt-8 grid gap-4 rounded-[1.4rem] bg-brand-soft p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7"><div><h2 className="flex items-center gap-2 text-lg font-black"><Check className="text-brand" size={19}/>Ready for the first share?</h2><p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600">Use the sample storefront for inspiration, then build your own catalog when you’re ready.</p></div><div className="flex flex-wrap gap-2"><Link href="/demo" className="button-secondary">View sample shop</Link><Link href={workspaceHref} className="button-primary">{workspaceLabel} <ArrowRight size={15}/></Link></div></section>
        <p className="mt-8 text-center text-xs text-neutral-500">A good first shop beats a perfect someday shop. Add your next products as you go.</p>
      </article>
      <footer className="shell flex min-h-20 items-center justify-between border-t border-line text-sm text-neutral-600"><span>Small shops have personality. Give yours a link.</span><Link href="/privacy">Privacy</Link></footer>
    </main>
  );
}
