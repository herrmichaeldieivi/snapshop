import { describe, expect, it } from "vitest";
import { parseCatalogCsv } from "@/src/lib/csv";

describe("parseCatalogCsv", () => {
  it("accepts a BOM, semicolons, quoted commas and availability aliases", () => {
    const csv = "\uFEFFtitle;price;image_url;description;availability;sku\n\"Cup, blue\";12.345;https://example.com/cup.jpg;\"A cup, with a comma\";yes;CUP-1\n";
    const result = parseCatalogCsv(csv, "USD");
    expect(result.fatalError).toBeUndefined();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ title: "Cup, blue", price: 12.35, availability: "in_stock" });
    expect(result.warnings.some((item) => item.field === "price")).toBe(true);
  });

  it("returns a file-level error when a required header is missing", () => {
    const result = parseCatalogCsv("title,price\nMug,14\n", "USD");
    expect(result.fatalError).toContain("image_url");
  });

  it("keeps valid rows while reporting invalid rows and duplicate second SKUs", () => {
    const csv = "title,price,image_url,sku\nGood,1,https://example.com/a.jpg,ONE\nBad price,no,https://example.com/b.jpg,TWO\nDuplicate,3,https://example.com/c.jpg,one\n";
    const result = parseCatalogCsv(csv, "USD");
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(2);
    expect(result.errors.map((item) => item.field)).toContain("sku");
  });

  it("reports unknown headers as warnings and skips blank lines", () => {
    const result = parseCatalogCsv("title,price,image_url,ignored\nMug,20,https://example.com/a.jpg,value\n\n", "USD");
    expect(result.rowsFound).toBe(1);
    expect(result.warnings[0].message).toContain("Unknown column");
  });
});
