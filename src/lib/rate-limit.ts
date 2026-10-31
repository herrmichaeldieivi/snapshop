type Entry = { hits: number[] };
const globalRate = globalThis as unknown as { snapShopRate?: Map<string, Entry> };
const entries = (): Map<string, Entry> => globalRate.snapShopRate ?? (globalRate.snapShopRate = new Map<string, Entry>());

export function takeRateLimit(key: string, max: number, windowMs: number) {
  const current = Date.now();
  const entry = entries().get(key) ?? { hits: [] };
  entry.hits = entry.hits.filter((time) => time > current - windowMs);
  if (entry.hits.length >= max) return false;
  entry.hits.push(current);
  entries().set(key, entry);
  return true;
}
