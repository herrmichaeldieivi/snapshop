import { createHash } from "node:crypto";
import type { CurrencyCode, Product, Store } from "@/src/lib/types";
import { formatPrice } from "@/src/lib/utils";

export interface ParsedCaption {
  title: string;
  description: string | null;
  price: number | null;
  currency: CurrencyCode | null;
  availability: "in_stock" | "out_of_stock";
}

/** "1,200" → 1200, "12,50" → 12.5, "1.200" → 1200, "28.50" → 28.5. */
export function normalizeAmount(raw: string): number | null {
  let value = raw.replace(/\s/g, "").replace(/[.,]+$/, "");
  const comma = value.lastIndexOf(",");
  const dot = value.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) value = comma > dot ? value.replace(/\./g, "").replace(",", ".") : value.replace(/,/g, "");
  else if (comma >= 0) value = value.replace(/,(\d{1,2})$/, ".$1").replace(/,/g, "");
  else if (/^\d{1,3}(\.\d{3})+$/.test(value)) value = value.replace(/\./g, "");
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount < 1_000_000 ? Math.round(amount * 100) / 100 : null;
}

const AMOUNT = "\\d[\\d.,]*";
const CODES = "USD|CAD|EUR|GBP";

function findPrice(text: string, storeCurrency: CurrencyCode) {
  const patterns = [
    { re: new RegExp(`([$£€])\\s?(${AMOUNT})`, "g"), symbol: 1, amount: 2, code: 0 },
    { re: new RegExp(`(${AMOUNT})\\s?(${CODES})\\b`, "gi"), symbol: 0, amount: 1, code: 2 },
    { re: new RegExp(`\\b(${CODES})\\s?(${AMOUNT})`, "gi"), symbol: 0, amount: 2, code: 1 },
  ];
  let best: { index: number; text: string; amount: number; currency: CurrencyCode } | null = null;
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern.re)) {
      const amount = normalizeAmount(match[pattern.amount] ?? "");
      if (amount === null || match.index === undefined) continue;
      let currency: CurrencyCode;
      if (pattern.code) currency = (match[pattern.code] ?? "USD").toUpperCase() as CurrencyCode;
      else {
        const symbol = match[pattern.symbol];
        currency = symbol === "£" ? "GBP" : symbol === "€" ? "EUR" : storeCurrency === "CAD" ? "CAD" : "USD";
      }
      if (!best || match.index < best.index) best = { index: match.index, text: match[0], amount, currency };
      break;
    }
  }
  return best;
}

function stripNoise(line: string) {
  return line
    .replace(/#[\p{L}\p{N}_]+/gu, " ")
    .replace(/(^|\s)@[\w.]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(\s*[-–—|•·:]\s*){2,}/g, " — ")
    .replace(/^[\s\-–—|•·:,.!]+/, "")
    .replace(/[\s\-–—|•·:,]+$/, "")
    .trim();
}

/** Turns an Instagram caption into a draft product. Anything we can't find stays empty for a human to fill in. */
export function parseInstagramCaption(caption: string | null | undefined, options: { storeCurrency: CurrencyCode; timestamp?: string | null }): ParsedCaption {
  const text = (caption ?? "").replace(/\r/g, "").trim();
  const price = findPrice(text, options.storeCurrency);
  const lines = text.split("\n").map((line) => line.trim());
  const withoutPrice = (line: string) => (price ? line.replace(price.text, " ") : line);
  const firstContent = lines.find((line) => line.length > 0) ?? "";
  const availability = /\bsold(\s+out)?\b/i.test(firstContent) ? "out_of_stock" : "in_stock";
  const clean = (line: string) => {
    const base = stripNoise(withoutPrice(line));
    return availability === "out_of_stock" ? stripNoise(base.replace(/^\s*sold(\s+out)?\b[\s\-–—:|!.]*/i, "")) : base;
  };

  const titleIndex = lines.findIndex((line) => clean(line).length > 0);
  let title = titleIndex >= 0 ? clean(lines[titleIndex] ?? "") : "";
  let truncated = false;
  if (title.length > 80) {
    const cut = title.slice(0, 80);
    title = `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)).trim()}…`;
    truncated = true;
  }
  if (!title) title = `Instagram post${options.timestamp ? ` · ${options.timestamp.slice(0, 10)}` : ""}`;

  const body = lines
    .filter((line, index) => truncated || index !== titleIndex)
    .filter((line) => !/^(\s*[#@][\p{L}\p{N}_.]+\s*)+$/u.test(line))
    .map((line) => line.replace(/(\s+#[\p{L}\p{N}_]+)+\s*$/u, "").trim());
  const description = body.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 2000);

  return { title, description: description || null, price: price?.amount ?? null, currency: price?.currency ?? null, availability };
}

type Postable = Pick<Product, "title" | "description" | "price" | "currency" | "availability">;

export function buildPostCaption(product: Postable, store: Pick<Store, "name">, url: string): string {
  const lines = [`${product.title} — ${formatPrice(product.price, product.currency)}`];
  if (product.availability === "out_of_stock") lines.push("Currently sold out.");
  const description = product.description?.trim();
  if (description) lines.push("", description.length > 600 ? `${description.slice(0, 597).trimEnd()}…` : description);
  lines.push("", `Shop ${store.name}: ${url}`);
  return lines.join("\n").slice(0, 2000);
}

/** Changes whenever something a post would show changes. Used to flag posts that no longer match the site. */
export function contentHash(product: Postable & Pick<Product, "image_urls">): string {
  const payload = JSON.stringify([product.title, product.description, product.price, product.currency, product.availability, product.image_urls[0] ?? null]);
  return createHash("sha1").update(payload).digest("hex").slice(0, 16);
}
