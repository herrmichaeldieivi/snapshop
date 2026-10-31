"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

export function DemoOrderPreview({ message, label }: { message: string; label: string }) {
  const [open, setOpen] = useState(false);
  return <div><button className="button-primary" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}><MessageCircle size={17}/>{open ? "Hide message preview" : label}</button>{open && <div className="mt-3 rounded-2xl border border-line bg-white p-4" role="status" aria-live="polite"><p className="font-mono text-[10px] font-bold uppercase tracking-[.12em] text-pine">Example message</p><p className="mt-2 text-sm leading-6 text-ink">{message}</p><p className="mt-2 text-xs leading-5 text-neutral-500">Preview only—nothing has been sent.</p></div>}</div>;
}
