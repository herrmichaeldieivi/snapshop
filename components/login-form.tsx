"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setState("loading"); setError(""); try { const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "We couldn't send a link right now."); setState("sent"); } catch (caught) { setState("idle"); setError(caught instanceof Error ? caught.message : "We couldn't send a link right now."); } }
  if (state === "sent") return <div className="card p-7 text-center"><CheckCircle2 className="mx-auto text-success" size={36} /><h2 className="mt-4 text-2xl font-black">Check your email</h2><p className="mt-3 text-sm leading-6 text-neutral-600">If this address can access a Snap Shop workspace, a login link is on its way. The link opens your store dashboard.</p></div>;
  return <form onSubmit={submit} className="card space-y-5 p-6 sm:p-8"><label><span className="label">Email address</span><input className="input" autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@business.com" /></label><button className="button-primary w-full" disabled={state === "loading"} type="submit">{state === "loading" ? "Sending…" : "Send login link"}<ArrowRight size={17} /></button>{error && <p role="alert" className="text-sm font-bold text-[#8f2c20]">{error}</p>}<p className="text-center text-xs leading-5 text-neutral-500">For security, this form never says whether an email address has an account.</p></form>;
}
