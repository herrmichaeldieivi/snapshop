import Image from "next/image";
import Link from "next/link";
import { cn } from "@/src/lib/utils";

const BRANDMARK = "/manus-storage/async-images/fBS4PeXdCmc974147x9ElO/image-1.webp";

export function Brand({ href = "/", compact = false, className }: { href?: string; compact?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex min-h-11 items-center gap-2.5", className)} aria-label="Snap Shop brand">
      <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-brand shadow-[0_4px_12px_rgba(184,74,53,.23)]">
        <Image src={BRANDMARK} alt="" width={40} height={40} unoptimized className="h-full w-full object-contain p-1.5" />
      </span>
      {!compact && <span className="font-sans text-[21px] font-black leading-none tracking-[-0.075em] text-ink">snap<span className="text-brand">shop</span></span>}
    </Link>
  );
}
