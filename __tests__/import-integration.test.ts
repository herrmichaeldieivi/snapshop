import { describe, expect, it } from "vitest";
import { parseCatalogCsv } from "@/src/lib/csv";
import { demoRepository } from "@/src/lib/repository/demo-repository";

const identity = { id: "demo-operator", email: "demo@snapshop.local", isOperator: true, isDemo: true };
describe("catalog import integration", () => {
  it("keeps 47 valid products from 50 rows with three invalid rows and updates on re-import", async () => {
    const store = await demoRepository.createStore({ name: "Import test shop", slug: `import-test-${Date.now()}` }, identity.id);
    const entries = Array.from({ length: 50 }, (_, index) => {
      const number = index + 1;
      const price = [5, 18, 36].includes(number) ? "not-a-price" : String(number);
      return `Product ${number},${price},https://example.com/${number}.jpg,SKU-${number}`;
    });
    const parsed = parseCatalogCsv(["title,price,image_url,sku", ...entries].join("\n"), "USD");
    expect(parsed.rows).toHaveLength(47);
    expect(new Set(parsed.errors.map((issue) => issue.row)).size).toBe(3);
    const record = await demoRepository.createImport(store.id, identity, "catalog.csv", parsed.rowsFound, parsed.rows, parsed.errors);
    const committed = await demoRepository.commitImport(store.id, record.id);
    expect(committed.imported).toBe(47);
    expect((await demoRepository.listProducts(store.id))).toHaveLength(47);
    const again = await demoRepository.createImport(store.id, identity, "catalog.csv", parsed.rowsFound, parsed.rows, parsed.errors);
    await demoRepository.commitImport(store.id, again.id);
    expect((await demoRepository.listProducts(store.id))).toHaveLength(47);
    await demoRepository.saveStore(store.id, { status: "published" });
    expect(await demoRepository.getStoreBySlug(store.slug, true)).not.toBeNull();
  });
});
