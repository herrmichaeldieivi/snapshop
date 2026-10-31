"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, Check, LoaderCircle, Mail } from "lucide-react";
import { FormEvent, useState } from "react";

type State = { kind: "idle" } | { kind: "busy" } | { kind: "ready"; preview: boolean } | { kind: "error"; message: string };

export function LeadMagnetForm({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === "busy") return;
    setState({ kind: "busy" });
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: data.get("email"), website: data.get("website") }) });
      const result = await response.json() as { ok?: boolean; mode?: "preview"; error?: string };
      if (response.ok && (result.ok || result.mode === "preview")) {
        setState({ kind: "ready", preview: result.mode === "preview" });
      } else {
        setState({ kind: "error", message: result.error ?? "Signup is temporarily unavailable." });
      }
    } catch {
      setState({ kind: "error", message: "We couldn't reach signup just now. The free guide is still available below." });
    }
  }

  if (state.kind === "ready") return <div className="rounded-2xl border border-[#E6C9BE] bg-[#F7E7E0] p-5 sm:p-6" role="status" aria-live="polite"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#F1D4C9] text-brand"><Check size={18} /></span><div><h3 className="font-black text-ink">Your 10-minute shop kit is ready.</h3><p className="mt-1 text-sm leading-6 text-neutral-600">{state.preview ? "This preview isn’t saving email signups yet, but you can open the complete guide right now." : "Your guide is ready now. We only use this email to provide the guide you requested."}</p><Link href="/10-minute-shop" className="button-primary mt-4">Open the free guide <ArrowRight size={16} /></Link></div></div></div>;

  return <form onSubmit={submit} className={compact ? "space-y-3" : "space-y-3.5"}>
    <label className="sr-only" htmlFor={compact ? "launch-email-footer" : "launch-email"}>Email address</label>
    <div className="flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 flex-1"><Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={17} /><input id={compact ? "launch-email-footer" : "launch-email"} className="input min-h-12 pl-10" type="email" name="email" autoComplete="email" maxLength={320} placeholder="you@yourbusiness.com" required disabled={state.kind === "busy"} /></div><button type="submit" className="button-primary min-h-12 shrink-0 px-5" disabled={state.kind === "busy"}>{state.kind === "busy" ? <><LoaderCircle className="animate-spin" size={17} />Preparing…</> : <>Get the free kit <ArrowDown size={16} /></>}</button></div>
    <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"><label htmlFor={compact ? "company-site-footer" : "company-site"}>Leave this field blank</label><input id={compact ? "company-site-footer" : "company-site"} name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
    <p className="text-xs leading-5 text-neutral-500">A practical guide, ready instantly. No marketing emails. <Link href="/privacy" className="underline underline-offset-2">Privacy</Link></p>
    {state.kind === "error" && <p className="text-sm font-semibold text-[#8f2c20]" role="alert">{state.message} <Link className="font-bold underline" href="/10-minute-shop">Open the guide</Link></p>}
  </form>;
}
