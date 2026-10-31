import { describe, expect, it } from "vitest";
import { buildPostCaption, contentHash, normalizeAmount, parseInstagramCaption } from "@/src/lib/social/caption";

const parse = (caption: string | null, storeCurrency: "USD" | "CAD" | "EUR" | "GBP" = "USD") => parseInstagramCaption(caption, { storeCurrency, timestamp: "2026-10-12T10:00:00Z" });

describe("normalizeAmount", () => {
  it.each([["28", 28], ["28.50", 28.5], ["1,200", 1200], ["12,50", 12.5], ["1.200", 1200], ["1,200.75", 1200.75], ["1.200,75", 1200.75], ["28.", 28]])("%s → %s", (raw, expected) => {
    expect(normalizeAmount(raw)).toBe(expected);
  });
  it("rejects nonsense", () => {
    expect(normalizeAmount("0")).toBeNull();
    expect(normalizeAmount("abc")).toBeNull();
    expect(normalizeAmount("99999999")).toBeNull();
  });
});

describe("parseInstagramCaption", () => {
  it("pulls title, price, description and drops hashtags", () => {
    const result = parse("Cloud mug ☁️ $28\nHand-thrown stoneware, dishwasher safe.\n#ceramics #handmade");
    expect(result.title).toBe("Cloud mug ☁️");
    expect(result.price).toBe(28);
    expect(result.currency).toBe("USD");
    expect(result.description).toBe("Hand-thrown stoneware, dishwasher safe.");
    expect(result.availability).toBe("in_stock");
  });

  it("reads euro and pound symbols and decimal commas", () => {
    expect(parse("Tall vase €48,50")).toMatchObject({ price: 48.5, currency: "EUR", title: "Tall vase" });
    expect(parse("Spoon rest — £18")).toMatchObject({ price: 18, currency: "GBP", title: "Spoon rest" });
  });

  it("reads currency codes on either side of the number", () => {
    expect(parse("Pebble catchall 22 USD")).toMatchObject({ price: 22, currency: "USD", title: "Pebble catchall" });
    expect(parse("Planter CAD 36")).toMatchObject({ price: 36, currency: "CAD" });
  });

  it("treats $ as the store's dollar", () => {
    expect(parse("Mug $10", "CAD").currency).toBe("CAD");
    expect(parse("Mug $10", "EUR").currency).toBe("USD");
  });

  it("marks sold posts out of stock and removes SOLD from the title", () => {
    const result = parse("SOLD — Linen napkin set of 4, $42");
    expect(result.availability).toBe("out_of_stock");
    expect(result.title).toBe("Linen napkin set of 4");
    expect(result.price).toBe(42);
  });

  it("leaves the price empty rather than guessing", () => {
    const result = parse("Studio sneak peek ✨ new glaze test");
    expect(result.price).toBeNull();
    expect(result.currency).toBeNull();
  });

  it("falls back to a dated title for empty or hashtag-only captions", () => {
    expect(parse(null).title).toBe("Instagram post · 2026-10-12");
    expect(parse("#one #two").title).toBe("Instagram post · 2026-10-12");
  });

  it("keeps long single-line captions: short title, full text in the description", () => {
    const long = `${"Handmade ceramic planter with a drainage hole and saucer included ".repeat(3)}$36`;
    const result = parse(long);
    expect(result.title.length).toBeLessThanOrEqual(81);
    expect(result.title.endsWith("…")).toBe(true);
    expect(result.description).toContain("saucer included");
  });

  it("never produces limits the database would reject", () => {
    const result = parse(`T ${"x".repeat(5000)}`);
    expect(result.title.length).toBeLessThanOrEqual(120);
    expect((result.description ?? "").length).toBeLessThanOrEqual(2000);
  });
});

describe("post captions and change detection", () => {
  const product = { title: "Cloud mug", description: "Stoneware.", price: 28, currency: "USD" as const, availability: "in_stock" as const, image_urls: ["https://x/1.webp"] };

  it("includes the title, price and storefront link", () => {
    const caption = buildPostCaption(product, { name: "Juniper" }, "https://shop.example/s/juniper/p/1");
    expect(caption).toContain("Cloud mug");
    expect(caption).toContain("28");
    expect(caption).toContain("https://shop.example/s/juniper/p/1");
    expect(caption.length).toBeLessThanOrEqual(2000);
  });

  it("notes sold-out products", () => {
    expect(buildPostCaption({ ...product, availability: "out_of_stock" }, { name: "J" }, "https://x")).toContain("sold out");
  });

  it("hash changes only when something shown in a post changes", () => {
    const base = contentHash(product);
    expect(contentHash({ ...product })).toBe(base);
    expect(contentHash({ ...product, price: 30 })).not.toBe(base);
    expect(contentHash({ ...product, image_urls: ["https://x/2.webp"] })).not.toBe(base);
  });
});
