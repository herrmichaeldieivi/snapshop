"use client";

import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { Product, Store } from "@/src/lib/types";
import { formatPrice } from "@/src/lib/utils";
import { ProductArtwork } from "@/components/product-artwork";

export function StorefrontGrid({ store, products, productBasePath }: { store: Store; products: Product[]; productBasePath?: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [inStockOnly, setInStockOnly] = useState(false);
  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((product) => product.category).filter((value): value is string => Boolean(value))))], [products]);
  const visible = products.filter((product) => (category === "All" || product.category === category) && (!inStockOnly || product.availability === "in_stock") && `${product.title} ${product.description ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="shell pb-16" aria-label="Products">
      <div className="flex flex-col gap-4 border-y border-line py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">{categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} aria-pressed={category === item} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold transition ${category === item ? "border-ink bg-ink text-white" : "border-[#cfc8bc] bg-white hover:border-brand"}`}>{item}</button>)}</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0"><Search aria-hidden size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" /><span className="sr-only">Search products</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="input pl-9 sm:w-60" type="search" autoComplete="off" placeholder="Search the shop" /></label>
          <button type="button" className={`button-secondary whitespace-nowrap ${inStockOnly ? "border-ink bg-[#eeece6]" : ""}`} onClick={() => setInStockOnly((value) => !value)} aria-pressed={inStockOnly}><SlidersHorizontal size={16} />In stock only</button>
        </div>
      </div>
      {visible.length ? <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">{visible.map((product) => {
        const href = productBasePath ? `${productBasePath}/${product.id}` : `/s/${store.slug}/p/${product.id}`;
        return <article key={product.id} className="group min-w-0"><Link href={href} className="block rounded-2xl focus-visible:outline-brand"><div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-mist"><ProductArtwork product={product} className="transition duration-200 group-hover:scale-[1.03] motion-reduce:transform-none" priority={product.sort_order < 2} />{product.availability === "out_of_stock" && <span className="status absolute left-2 top-2 bg-white/95 text-warning">Out of stock</span>}</div><h3 className="mt-3 truncate text-base font-bold tracking-[-0.025em]">{product.title}</h3><p className="mt-1 text-sm text-neutral-600">{formatPrice(product.price, product.currency)}</p></Link></article>;
      })}</div> : <div className="card mt-8 grid min-h-64 place-items-center px-6 text-center"><div><p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">No match found</p><h2 className="mt-3 text-xl font-black">Try a different search or filter.</h2><button className="mt-5 min-h-11 px-3 text-sm font-bold text-brand underline" onClick={() => { setQuery(""); setCategory("All"); setInStockOnly(false); }}>Clear filters</button></div></div>}
    </section>
  );
}
