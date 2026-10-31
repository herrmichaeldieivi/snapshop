"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

export function LogoUploader({ storeId, initialUrl }: { storeId: string; initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File | undefined) { if (!file) return; setBusy(true); setError(""); try { const data = new FormData(); data.set("store_id", storeId); data.set("file", file); const response = await fetch("/api/images/logo", { method: "POST", body: data }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Logo upload failed."); setUrl(body.url); } catch (caught) { setError(caught instanceof Error ? caught.message : "Logo upload failed."); } finally { setBusy(false); } }
  return <div><input type="hidden" name="logo_url" value={url} /><div className="flex flex-wrap items-center gap-3">{url ? <div className="relative size-16 overflow-hidden rounded-xl border border-[#dedbd3] bg-mist"><img /* eslint-disable-line @next/next/no-img-element */ src={url} alt="Store logo preview" className="h-full w-full object-contain" /><button className="absolute right-1 top-1 grid size-7 place-items-center rounded-md bg-white text-[#a42929] shadow" type="button" aria-label="Remove logo" onClick={() => setUrl("")}><Trash2 size={13} /></button></div> : <div className="grid size-16 place-items-center rounded-xl bg-mist text-neutral-500"><ImagePlus size={20} /></div>}<label className="button-secondary cursor-pointer">{busy ? <Loader2 className="animate-spin" size={16} /> : <ImagePlus size={16} />}{busy ? "Uploading…" : url ? "Replace logo" : "Upload logo"}<input className="sr-only" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => void upload(event.target.files?.[0])} /></label><span className="text-xs text-neutral-500">JPEG, PNG, or WebP · up to 10 MB</span></div>{error && <p role="alert" className="mt-2 text-sm font-bold text-[#8f2c20]">{error}</p>}</div>;
}
