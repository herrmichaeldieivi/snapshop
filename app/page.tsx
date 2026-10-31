import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, MessageCircle, PackageCheck, Sparkles, Store, Upload } from "lucide-react";
import { Brand } from "@/components/brand";
import { LeadMagnetForm } from "@/components/lead-magnet-form";

const publicOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
const socialImage = "https://files.manuscdn.com/user_upload_by_module/session_file/310519664035158170/IXThZmoQZxSneXGP.png";
const editorialImage = "/manus-storage/async-images/fBS4PeXdCmc974147x9ElO/image-2.webp";

export const metadata: Metadata = {
  title: "Your Instagram-inspired shop, live in 10 minutes",
  description: "Turn the products your followers already love into a polished, shareable storefront. Get the free 10-minute shop launch kit.",
  alternates: publicOrigin ? { canonical: `${publicOrigin}/` } : undefined,
  openGraph: { title: "Your Instagram-inspired shop, live in 10 minutes", description: "A polished product catalogue and one easy link to share wherever customers find you.", type: "website", url: publicOrigin ? `${publicOrigin}/` : undefined, siteName: "Snap Shop", images: [{ url: socialImage, width: 1200, height: 630, alt: "Snap Shop — your Instagram-inspired shop, live in 10 minutes" }] },
  twitter: { card: "summary_large_image", title: "Your Instagram-inspired shop, live in 10 minutes", description: "A polished product catalogue and one easy link to share wherever customers find you.", images: [socialImage] },
};

const steps = [
  { number: "01", icon: Upload, title: "Bring your products", detail: "Upload the CSV you already have, or start with a handful of products by hand." },
  { number: "02", icon: Store, title: "Make it feel like you", detail: "Add a name, one good photo per product, your colors, and the way you take orders." },
  { number: "03", icon: MessageCircle, title: "Share your shop link", detail: "Drop it in your Instagram bio, send it in a DM, or add it to your next Story." },
];

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="absolute -inset-3 rotate-[-3deg] rounded-[2rem] bg-[#f0e6d7] sm:-inset-5" />
      <div className="relative aspect-[.93] overflow-hidden rounded-[1.8rem] border border-white/60 bg-[#d5c0a7] shadow-float sm:aspect-[1.06] sm:rounded-[2rem]">
        <Image src={editorialImage} alt="A warm, sunlit collection of handmade ceramic, linen, and home goods" fill priority unoptimized sizes="(max-width: 768px) 92vw, 520px" className="object-cover" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#1f2923]/85 via-[#1f2923]/5 to-[#1f2923]/0" />
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-2 text-[11px] font-bold text-ink shadow-card sm:left-5 sm:top-5"><span className="size-2 rounded-full bg-[#63876a]" /> A shop that feels like yours</div>
        <div className="absolute inset-x-4 bottom-4 sm:inset-x-6 sm:bottom-6">
          <div className="ml-auto max-w-[370px] rounded-[1.35rem] border border-white/80 bg-paper/95 p-4 shadow-float backdrop-blur-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-pine text-white"><Store size={17} /></span><span className="min-w-0"><strong className="block truncate text-sm font-black">Juniper Studio</strong><small className="block truncate text-[11px] text-neutral-500">Objects for slower mornings.</small></span></span>
              <span className="rounded-full bg-brand-soft px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[.12em] text-[#A74731]">YOUR SHOP</span>
            </div>
            <div className="my-4 h-px bg-line" />
            <p className="font-display text-2xl leading-tight tracking-[-.035em] text-ink sm:text-[1.75rem]">Good things,<br />all in one little place.</p>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-pine px-3.5 py-3 text-xs font-bold text-white"><span className="flex items-center gap-2"><MessageCircle size={15} /> Message to order</span><ArrowUpRight size={15} /></div>
          </div>
        </div>
      </div>
      <div className="absolute -right-2 top-[44%] hidden -translate-y-1/2 items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-3 text-xs font-bold text-ink shadow-card sm:flex"><span className="grid size-7 place-items-center rounded-lg bg-brand-soft text-brand"><Check size={15} /></span> Easy to share</div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-paper">
      <header className="shell flex min-h-[76px] items-center justify-between border-b border-line">
        <Brand />
        <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-3">
          <Link className="button-secondary hidden sm:inline-flex" href="/login">Log in</Link>
          <Link className="button-primary" href="/demo">Try the demo <ArrowUpRight size={15} /></Link>
        </nav>
      </header>

      <section className="shell grid items-center gap-10 pb-14 pt-9 sm:gap-14 sm:pb-20 sm:pt-14 lg:min-h-[680px] lg:grid-cols-[1.03fr_.97fr] lg:gap-8 lg:py-16">
        <div className="relative z-10">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-line bg-white/80 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[.13em] text-brand sm:text-[11px]"><Sparkles size={13} /> For the maker behind the DMs</p>
          <h1 className="max-w-[660px] font-display text-[clamp(3.35rem,7vw,5.9rem)] leading-[.94] tracking-[-.065em] text-ink">Your Instagram-inspired shop, <span className="text-brand">ready in 10 minutes.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-neutral-600 sm:mt-6 sm:text-lg sm:leading-8">Give your products a little storefront of their own. One tidy link lets customers browse first—and message you when they’re ready.</p>

          <div id="launch-kit" className="mt-7 max-w-xl scroll-mt-5 rounded-[1.4rem] border border-brand-line bg-white p-4 shadow-[0_14px_44px_rgba(84,54,38,.09)] sm:mt-8 sm:p-5">
            <div className="mb-3.5 flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><PackageCheck size={19} /></span><div><h2 className="text-sm font-black sm:text-base">Get the free 10-minute shop kit</h2><p className="mt-0.5 text-xs leading-5 text-neutral-500">A useful checklist. Open the guide right away.</p></div></div>
            <LeadMagnetForm />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500"><Link href="/10-minute-shop" className="inline-flex min-h-10 items-center gap-1 font-bold text-brand underline underline-offset-4">Peek at the guide <ArrowRight size={13} /></Link><span>Works alongside Instagram—no account sync.</span></div>
        </div>
        <div className="relative px-1 py-4 sm:px-5 lg:px-1"><HeroVisual /><Link href="/demo" className="mx-auto mt-6 flex min-h-11 w-fit items-center gap-2 rounded-full px-4 text-xs font-bold text-ink transition hover:bg-white hover:text-brand">Browse the sample shop <ArrowUpRight size={14} /></Link></div>
      </section>

      <section className="border-y border-line bg-white"><div className="shell grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:py-6"><p className="text-sm font-bold text-ink sm:text-base">A simple little home for products you’re proud of.</p><div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-500"><span className="inline-flex items-center gap-1.5"><Check size={14} className="text-pine" /> Made for mobile</span><span className="inline-flex items-center gap-1.5"><Check size={14} className="text-pine" /> One shareable link</span><span className="inline-flex items-center gap-1.5"><Check size={14} className="text-pine" /> Orders come to you</span></div></div></section>

      <section className="shell py-16 sm:py-24"><div className="grid gap-9 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div className="max-w-md"><p className="font-mono text-[10px] font-bold uppercase tracking-[.15em] text-brand">Less setup. More showing off.</p><h2 className="mt-4 font-display text-4xl leading-[.98] tracking-[-.055em] sm:text-5xl">From “DM me” to “have a look around.”</h2><p className="mt-5 text-sm leading-7 text-neutral-600">A better browsing moment doesn’t change the way you sell. It just gives every product room to be seen.</p></div>
          <div className="grid gap-3 sm:grid-cols-3">{steps.map(({number,icon:Icon,title,detail}) => <article key={number} className="rounded-[1.35rem] border border-line bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-brand">{number}</span><span className="grid size-9 place-items-center rounded-xl bg-[#f2eee5] text-pine"><Icon size={17} /></span></div><h3 className="mt-7 text-lg font-black tracking-[-.035em]">{title}</h3><p className="mt-2.5 text-sm leading-6 text-neutral-600">{detail}</p></article>)}</div>
        </div></section>

      <section className="bg-pine text-white"><div className="shell grid gap-8 py-12 sm:py-16 lg:grid-cols-[1fr_1.1fr] lg:items-center"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[#f3c7ae]">Your shop, on your terms</p><h2 className="mt-4 max-w-lg font-display text-4xl leading-[.98] tracking-[-.05em] sm:text-5xl">You keep the conversation. We tidy up the browse.</h2><p className="mt-4 max-w-md text-sm leading-7 text-white/75">Snap Shop gives you a catalogue link to share. Instagram stays yours—no account connection or automatic product sync.</p><Link href="/demo" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-paper px-4 py-2 text-sm font-bold text-ink transition hover:bg-white">See a sample shop <ArrowRight size={15} /></Link></div>
          <div className="grid gap-3 sm:grid-cols-2">{["A calm, mobile-friendly product catalogue", "Availability at a glance", "WhatsApp-first contact, with email and Instagram fallback", "One link for your bio, Stories, and DMs"].map((benefit) => <div key={benefit} className="flex min-h-[76px] items-start gap-3 rounded-xl border border-white/15 bg-white/[.06] p-4"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white/15 text-[#f5c6ad]"><Check size={14} /></span><p className="text-sm leading-6 text-white/90">{benefit}</p></div>)}</div>
        </div></section>

      <section className="shell py-16 sm:py-20"><div className="rounded-[1.8rem] border border-brand-line bg-[#f7e7e0] px-5 py-9 sm:px-10 sm:py-12"><div className="grid gap-7 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.15em] text-brand">A small head start</p><h2 className="mt-3 max-w-xl font-display text-4xl leading-none tracking-[-.05em] sm:text-5xl">Set up between conversations.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-neutral-600">Get the checklist, bring a few products, and leave with a shop link you can actually share.</p></div><Link href="#launch-kit" className="button-primary w-fit">Get the free shop kit <ArrowDown size={16} /></Link></div></div></section>

      <footer className="shell flex min-h-20 flex-col gap-3 border-t border-line py-5 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between"><span className="font-medium">Small shops have personality. Give yours a link.</span><div className="flex flex-wrap gap-x-4 gap-y-2"><Link href="/10-minute-shop">Free shop guide</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/login">Log in</Link><Link href="/demo" className="inline-flex items-center gap-1">Try the demo <ArrowUpRight size={13} /></Link></div></footer>
    </main>
  );
}
