import Image from "next/image";
import type { Product } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";

const colorPairs = ["from-[#d8d3c7] to-[#f4f1e9]", "from-[#cad2ca] to-[#eef0e8]", "from-[#c9d6df] to-[#edf1f0]", "from-[#e4cfc5] to-[#f7ebe4]"];

export function ProductArtwork({ product, className, priority = false }: { product: Pick<Product, "title" | "image_urls" | "image_alt_texts">; className?: string; priority?: boolean }) {
  const source = product.image_urls[0];
  // Data URLs exist only in disconnected demo mode and cannot be passed to Next Image.
  if (source?.startsWith("data:image/")) return <img /* eslint-disable-line @next/next/no-img-element */ src={source} alt={product.image_alt_texts?.[0] || product.title} className={cn("h-full w-full object-cover", className)} />;
  if (source) return <Image src={source} alt={product.image_alt_texts?.[0] || product.title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" priority={priority} className={cn("object-cover", className)} />;
  const pair = colorPairs[product.title.length % colorPairs.length];
  return (
    <div className={cn("relative grid h-full w-full place-items-center overflow-hidden bg-gradient-to-br", pair, className)} aria-label={`${product.title} image placeholder`} role="img">
      <span className="absolute size-36 rounded-[42%] border-[12px] border-white/60" />
      <span className="absolute size-20 translate-x-6 translate-y-4 rounded-[48%] bg-white/55" />
      <span className="relative max-w-[75%] text-center font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink/50">{product.title}</span>
    </div>
  );
}
