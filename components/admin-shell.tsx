import Link from "next/link";
import { ArrowUpRight, FileUp, LayoutDashboard, Package, RefreshCw, Settings, Store, Zap, type LucideIcon } from "lucide-react";
import { Brand } from "@/components/brand";
import type { AdminIdentity, Store as StoreType } from "@/src/lib/types";

const nav = (store?: StoreType): [string, string, LucideIcon][] => store ? [
  ["Settings", `/admin/${store.id}/settings`, Settings],
  ["Products", `/admin/${store.id}/products`, Package],
  ["Import CSV", `/admin/${store.id}/import`, FileUp],
  ["Sync", `/admin/${store.id}/sync`, RefreshCw],
] : [];

export function AdminShell({ identity, store, children }: { identity: AdminIdentity; store?: StoreType; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur"><div className="shell flex min-h-[68px] items-center justify-between"><Brand href="/admin" /><div className="flex items-center gap-2.5 sm:gap-3"><span className="hidden max-w-52 truncate text-sm text-neutral-600 sm:block">{identity.email || "Your workspace"}</span><span className={`status ${identity.isDemo ? "bg-brand-soft text-brand" : "bg-[#e7f0e8] text-success"}`}>{identity.isDemo ? "Demo workspace" : identity.isOperator ? "Operator" : "Owner"}</span></div></div></header>
      {identity.isDemo && <div className="border-b border-brand-line bg-brand-soft/70"><div className="shell flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-[#703629] sm:text-sm"><strong>You’re in the try-it-out workspace.</strong> Changes here are temporary and reset when the server restarts.</p><Link href="/demo" className="inline-flex min-h-10 w-fit items-center gap-1.5 text-xs font-bold text-brand underline underline-offset-4">See the public sample <ArrowUpRight size={14} /></Link></div></div>}
      <div className="shell grid gap-6 py-5 sm:py-7 lg:grid-cols-[13rem_minmax(0,1fr)]"><aside className="lg:sticky lg:top-[92px] lg:h-fit"><nav aria-label="Workspace navigation" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col"> <Link href="/admin" className="button-secondary shrink-0 justify-start"><LayoutDashboard size={16} />My stores</Link>{store && nav(store).map(([label, href, Icon]) => <Link key={String(href)} href={String(href)} className="button-secondary shrink-0 justify-start"><Icon size={16} />{label}</Link>)}{identity.isOperator && <Link href="/admin/start" className="button-primary shrink-0 justify-start"><Zap size={16} />Start from Instagram</Link>}{identity.isOperator && <Link href="/admin/stores/new" className="button-secondary shrink-0 justify-start"><Store size={16} />New store</Link>}</nav></aside><section className="min-w-0 pb-8">{children}</section></div>
    </div>
  );
}
