"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";

export interface SyncCell {
  status: "none" | "source" | "live" | "failed" | "simulated";
  permalink?: string | null;
  error?: string | null;
  stale?: boolean;
}
export interface SyncRow { id: string; title: string; price: string; needsPrice: boolean; hasImage: boolean; instagram: SyncCell; facebook: SyncCell }
type Channel = "instagram" | "facebook";
const LABEL: Record<Channel, string> = { instagram: "Instagram", facebook: "Facebook" };

interface Props {
  storeId: string;
  published: boolean;
  ready: Record<Channel, boolean>;
  rows: SyncRow[];
}

export function SyncTable({ storeId, published, ready, rows }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [bulk, setBulk] = useState<string | null>(null);

  const blocked = (row: SyncRow, channel: Channel) =>
    !published ? "Publish your store first." : !ready[channel] ? `${LABEL[channel]} isn’t connected.` : row.needsPrice ? "Set a price first." : !row.hasImage ? "Add a photo first." : null;

  async function post(row: SyncRow, channel: Channel, repost: boolean) {
    const key = `${row.id}:${channel}`;
    setBusy(key);
    setNotes((previous) => ({ ...previous, [key]: "" }));
    let note = "";
    try {
      const response = await fetch("/api/sync/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId, product_id: row.id, channels: [channel], repost }),
      });
      const data = (await response.json()) as { results?: { status: string; message?: string }[]; error?: string };
      if (!response.ok) note = data.error ?? "Posting failed.";
      else {
        const result = data.results?.[0];
        if (result?.status === "failed" || result?.status === "skipped") note = result.message ?? "";
      }
    } catch {
      note = "Network error. Try again.";
    }
    setNotes((previous) => ({ ...previous, [key]: note }));
    setBusy(null);
    router.refresh();
    return !note;
  }

  async function postMissing(channel: Channel) {
    const todo = rows.filter((row) => ["none", "failed"].includes(row[channel].status) && !blocked(row, channel));
    for (let index = 0; index < todo.length; index += 1) {
      setBulk(`${LABEL[channel]}: ${index + 1}/${todo.length}`);
      if (!(await post(todo[index] as SyncRow, channel, false))) break;
    }
    setBulk(null);
  }

  function cell(row: SyncRow, channel: Channel) {
    const value = row[channel];
    const key = `${row.id}:${channel}`;
    const reason = blocked(row, channel);
    const working = busy === key;
    const action = (label: string, repost: boolean) => (
      <button type="button" className="button-secondary min-h-9 px-3 text-xs" disabled={Boolean(reason) || busy !== null || bulk !== null} title={reason ?? undefined} onClick={() => void post(row, channel, repost)}>
        {working && <Loader2 size={13} className="animate-spin" />}{label}
      </button>
    );
    return (
      <div className="space-y-1.5">
        {value.status === "source" && <p className="text-xs font-bold text-neutral-600">Original post{value.permalink && <a href={value.permalink} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-brand underline">view<ExternalLink size={11} /></a>}</p>}
        {value.status === "live" && <p className="text-xs font-bold text-green-700">Live{value.permalink && <a href={value.permalink} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 underline">open<ExternalLink size={11} /></a>}</p>}
        {value.status === "live" && value.stale && <p className="text-xs text-amber-800">Edited on the site since posting</p>}
        {value.status === "simulated" && <p className="text-xs font-bold text-neutral-500">Preview only — not posted</p>}
        {value.status === "failed" && <p className="text-xs text-red-700">{value.error ?? "Failed"}</p>}
        {(value.status === "none" || value.status === "failed") && action(value.status === "failed" ? "Retry" : "Post", false)}
        {value.status === "simulated" && action("Run preview again", false)}
        {value.status === "live" && value.stale && action("Post again", true)}
        {notes[key] && <p className="text-xs text-red-700">{notes[key]}</p>}
      </div>
    );
  }

  return (
    <section className="card p-5" aria-labelledby="sync-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 id="sync-title" className="text-xl font-black tracking-[-0.04em]">Where each product lives</h2>
          <p className="mt-1 text-sm text-neutral-600">The website is always the source of truth. Posts can’t be edited from here once they’re live, so edits show as “Edited on the site”.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {(["facebook", "instagram"] as Channel[]).map((channel) => (
            <button key={channel} type="button" className="button-secondary min-h-9 text-xs" disabled={!ready[channel] || !published || busy !== null || bulk !== null} onClick={() => void postMissing(channel)}>
              Post all missing to {LABEL[channel]}
            </button>
          ))}
        </div>
      </div>
      {bulk && <p className="mt-3 flex items-center gap-2 text-sm text-neutral-600"><Loader2 size={15} className="animate-spin" />{bulk}</p>}
      {!published && <p className="mt-3 rounded-xl border border-brand-line bg-brand-soft/70 px-3.5 py-2.5 text-sm text-[#703629]">Posts link back to your storefront, so publish the store first (Settings → Publish).</p>}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-[0.1em] text-neutral-500">
              <th className="py-2 pr-3 font-bold">Product</th><th className="py-2 pr-3 font-bold">Website</th><th className="py-2 pr-3 font-bold">Instagram</th><th className="py-2 font-bold">Facebook</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="py-3 pr-3"><p className="font-bold">{row.title}</p><p className={`text-xs ${row.needsPrice ? "font-bold text-amber-800" : "text-neutral-500"}`}>{row.needsPrice ? "Needs a price" : row.price}</p></td>
                <td className="py-3 pr-3 text-xs font-bold text-green-700">{published ? "Live" : "Draft"}</td>
                <td className="py-3 pr-3">{cell(row, "instagram")}</td>
                <td className="py-3">{cell(row, "facebook")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="py-6 text-sm text-neutral-500">No products yet. Import from Instagram above, or add some by CSV or by hand.</p>}
      </div>
    </section>
  );
}
