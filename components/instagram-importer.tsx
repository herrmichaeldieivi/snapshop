"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import type { MediaRow } from "@/src/lib/social/service";

interface ImportOutcome { id: string; status: "imported" | "skipped" | "failed"; message?: string; needs_price?: boolean }

const BATCH = 3;

function describeRow(row: MediaRow) {
  if (row.media_type === "CAROUSEL_ALBUM") return `Carousel · ${row.images} photo${row.images === 1 ? "" : "s"}`;
  if (row.media_type === "VIDEO") return row.importable ? "Video · cover image" : "Video";
  return "Photo";
}

export function InstagramImporter({ storeId, username, simulated }: { storeId: string; username: string | null; simulated: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, ImportOutcome>>({});

  const load = useCallback(
    async (after: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/sync/instagram/media?store_id=${encodeURIComponent(storeId)}${after ? `&after=${encodeURIComponent(after)}` : ""}`);
        const data = (await response.json()) as { items?: MediaRow[]; next?: string | null; error?: string };
        if (!response.ok || !data.items) throw new Error(data.error ?? "Couldn’t load Instagram posts.");
        const items = data.items;
        setRows((previous) => (after ? [...previous, ...items] : items));
        setNext(data.next ?? null);
        setSelected((previous) => new Set([...(after ? previous : []), ...items.filter((row) => row.importable && !row.imported).map((row) => row.id)]));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Couldn’t load Instagram posts.");
      } finally {
        setLoading(false);
      }
    },
    [storeId],
  );

  useEffect(() => {
    void load(null);
  }, [load]);

  const importable = rows.filter((row) => row.importable && !row.imported);
  const chosen = importable.filter((row) => selected.has(row.id));

  async function runImport() {
    const ids = chosen.map((row) => row.id);
    setError(null);
    setProgress({ done: 0, total: ids.length });
    for (let index = 0; index < ids.length; index += BATCH) {
      try {
        const response = await fetch("/api/sync/instagram/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ store_id: storeId, media_ids: ids.slice(index, index + BATCH) }),
        });
        const data = (await response.json()) as { results?: ImportOutcome[]; error?: string };
        if (!response.ok || !data.results) throw new Error(data.error ?? "Import failed.");
        const results = data.results;
        setOutcomes((previous) => ({ ...previous, ...Object.fromEntries(results.map((result) => [result.id, result])) }));
        const done = new Set(results.filter((result) => result.status === "imported" || result.message === "Already imported.").map((result) => result.id));
        setRows((previous) => previous.map((row) => (done.has(row.id) ? { ...row, imported: true } : row)));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Import failed.");
        break;
      }
      setProgress({ done: Math.min(index + BATCH, ids.length), total: ids.length });
    }
    setProgress(null);
    setSelected(new Set());
    router.refresh();
  }

  return (
    <section className="card p-5" aria-labelledby="importer-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 id="importer-title" className="text-xl font-black tracking-[-0.04em]">Import from Instagram</h2>
          <p className="mt-1 text-sm text-neutral-600">
            {simulated ? "Sample posts (preview mode)" : username ? `Posts from @${username}` : "Your recent posts"}. Each becomes a product with its photos, title and price pulled from the caption. Already-imported posts are never overwritten.
          </p>
        </div>
        <button type="button" className="button-primary shrink-0" disabled={!chosen.length || progress !== null} onClick={runImport}>
          {progress ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {progress ? `Importing ${progress.done}/${progress.total}…` : `Import ${chosen.length} post${chosen.length === 1 ? "" : "s"}`}
        </button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-brand-line bg-brand-soft/70 px-3.5 py-2.5 text-sm text-[#703629]">{error}</p>}

      {importable.length > 0 && (
        <div className="mt-4 flex gap-3 text-xs font-bold">
          <button type="button" className="text-brand underline" onClick={() => setSelected(new Set(importable.map((row) => row.id)))}>Select all new</button>
          <button type="button" className="text-neutral-500 underline" onClick={() => setSelected(new Set())}>Select none</button>
        </div>
      )}

      <ul className="mt-3 divide-y divide-line">
        {rows.map((row) => {
          const outcome = outcomes[row.id];
          const disabled = !row.importable || row.imported || progress !== null;
          return (
            <li key={row.id}>
              <label className={`flex items-center gap-3 py-3 ${disabled ? "opacity-70" : "cursor-pointer"}`}>
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-[#b84a35]"
                  checked={selected.has(row.id) && !row.imported}
                  disabled={disabled}
                  onChange={(event) => setSelected((previous) => { const copy = new Set(previous); if (event.target.checked) copy.add(row.id); else copy.delete(row.id); return copy; })}
                />
                {row.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.thumb} alt="" width={56} height={56} referrerPolicy="no-referrer" className="h-14 w-14 shrink-0 rounded-lg border border-line object-cover" />
                ) : (
                  <span className="h-14 w-14 shrink-0 rounded-lg border border-line bg-neutral-100" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{row.title}</span>
                  <span className="mt-0.5 block text-xs text-neutral-500">{describeRow(row)}{row.timestamp ? ` · ${row.timestamp.slice(0, 10)}` : ""}</span>
                </span>
                <span className="shrink-0 text-right text-xs">
                  {row.price ? <span className="font-bold">{row.price.toFixed(2)} {row.currency}</span> : <span className="rounded-md bg-amber-100 px-2 py-1 font-bold text-amber-800">No price found</span>}
                  {row.availability === "out_of_stock" && <span className="mt-1 block text-neutral-500">Sold out</span>}
                  <span className="mt-1 block font-bold">
                    {row.imported ? <span className="text-green-700">Imported</span> : outcome?.status === "failed" ? <span className="text-red-700" title={outcome.message}>Failed</span> : !row.importable ? <span className="text-neutral-500">No photo</span> : null}
                  </span>
                </span>
              </label>
              {outcome?.status === "failed" && <p className="pb-3 pl-[4.5rem] text-xs text-red-700">{outcome.message}</p>}
            </li>
          );
        })}
      </ul>

      {loading && <p className="mt-4 flex items-center gap-2 text-sm text-neutral-500"><Loader2 size={15} className="animate-spin" />Loading posts…</p>}
      {!loading && !rows.length && !error && <p className="mt-4 text-sm text-neutral-500">No posts found on this account yet.</p>}
      {next && !loading && <button type="button" className="button-secondary mt-4" onClick={() => void load(next)}>Load more posts</button>}
    </section>
  );
}
