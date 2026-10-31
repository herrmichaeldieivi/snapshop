import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { buildMetaCatalogCsv, mediaUrl } from "@/src/lib/social/feed";
import { toFeedJpeg } from "@/src/lib/social/jpeg";
import type { Product } from "@/src/lib/types";

const product = (overrides: Partial<Product> = {}): Product => ({
  id: "p1", store_id: "s1", sku: null, title: "Cloud mug", description: 'Stoneware, "hand thrown"', price: 28, currency: "USD", image_urls: ["https://x/a.webp", "https://x/b.webp"],
  category: null, availability: "in_stock", sort_order: 0, external_link: null, created_at: "", updated_at: "", ...overrides,
});

describe("Meta catalog feed", () => {
  const { csv, included, skipped } = buildMetaCatalogCsv({ name: "Juniper", slug: "juniper" }, [product(), product({ id: "p2", image_urls: [] }), product({ id: "p3", price: 0 }), product({ id: "p4", availability: "out_of_stock", description: null })], "https://shop.example.com");
  const lines = csv.trim().split("\r\n");

  it("has the columns Meta requires", () => {
    expect(lines[0]).toBe("id,title,description,availability,condition,price,link,image_link,additional_image_link,brand");
  });
  it("lists only products with a photo and a price, and counts the rest", () => {
    expect(included).toBe(2);
    expect(skipped).toBe(2);
    expect(lines).toHaveLength(3);
  });
  it("formats price, availability, links and quoting", () => {
    expect(lines[1]).toContain(",in stock,new,28.00 USD,https://shop.example.com/s/juniper/p/p1,https://shop.example.com/media/juniper/p1/0.jpg?v=");
    expect(lines[1]).toContain('"Stoneware, ""hand thrown"""');
    expect(lines[1]).toContain("/media/juniper/p1/1.jpg");
    expect(lines[2]).toContain(",out of stock,");
    expect(lines[2]).toContain("Cloud mug,Cloud mug"); // description falls back to the title
  });
  it("changes the image URL version when the photo changes", () => {
    expect(mediaUrl("https://h", "s", "p", 0, "a")).not.toBe(mediaUrl("https://h", "s", "p", 0, "b"));
  });
});

describe("toFeedJpeg", () => {
  const dims = async (buffer: Buffer) => { const meta = await sharp(buffer).metadata(); return { format: meta.format, width: meta.width!, height: meta.height! }; };
  const solid = (width: number, height: number, format: "webp" | "png" = "webp", alpha = 1) =>
    sharp({ create: { width, height, channels: 4, background: { r: 200, g: 40, b: 40, alpha } } })[format]().toBuffer();

  it("converts WebP to JPEG and keeps an in-range ratio", async () => {
    const out = await toFeedJpeg(await solid(800, 600));
    expect(out.subarray(0, 2).toString("hex")).toBe("ffd8");
    expect(await dims(out)).toEqual({ format: "jpeg", width: 800, height: 600 });
  });
  it("letterboxes ratios Instagram would reject (too tall / too wide)", async () => {
    for (const [w, h] of [[300, 1200], [2000, 400]] as const) {
      const { width, height, format } = await dims(await toFeedJpeg(await solid(w, h)));
      expect(format).toBe("jpeg");
      expect(width).toBe(height);
    }
  });
  it("flattens transparency onto white instead of black", async () => {
    const out = await toFeedJpeg(await solid(200, 200, "png", 0));
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeGreaterThan(240);
    expect(data[1]).toBeGreaterThan(240);
  });
});
