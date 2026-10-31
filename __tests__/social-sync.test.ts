import { beforeAll, describe, expect, it } from "vitest";
import { getRepository } from "@/src/lib/repository";
import { beginConnect, completeConnect } from "@/src/lib/social/connect";
import { metaMode } from "@/src/lib/social/config";
import { importInstagramMedia, listInstagramMedia, publishProduct, publicConnection } from "@/src/lib/social/service";
import type { Store } from "@/src/lib/types";

const origin = "http://localhost:3000";
let store: Store;

describe("Instagram/Facebook sync in preview mode", () => {
  beforeAll(async () => {
    delete process.env.META_APP_ID;
    delete process.env.META_APP_SECRET;
    process.env.META_MOCK = "1";
    store = await getRepository().createStore({ name: "Test Shop", slug: `sync-test-${Date.now()}` }, "demo-operator");
  });

  it("runs in preview mode and says so", () => {
    expect(metaMode()).toBe("mock");
  });

  it("refuses to fake a connection when a real backend has no Meta credentials", () => {
    process.env.META_MOCK = "";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    expect(metaMode()).toBe("unconfigured");
    expect(() => beginConnect(store.id, origin)).toThrow(/isn't configured/);
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.META_MOCK = "1";
  });

  it("refuses to import or publish before connecting", async () => {
    await expect(listInstagramMedia(store)).rejects.toMatchObject({ status: 409 });
  });

  it("connects, adopting the account's handle, without exposing a token", async () => {
    const begin = beginConnect(store.id, origin);
    expect(begin.url.startsWith(`${origin}/api/meta/callback?code=mock&state=`)).toBe(true);
    await completeConnect(store, "mock", origin);
    const stored = await getRepository().getSocialConnection(store.id);
    expect(stored).toMatchObject({ status: "active", simulated: true, ig_username: "sample_shop" });
    expect(stored!.access_token_enc).not.toContain("mock-token");
    expect(JSON.stringify(publicConnection(stored))).not.toContain("access_token");
    expect((await getRepository().getStore(store.id))!.instagram_handle).toBe("sample_shop");
  });

  it("lists sample posts with parsed titles and prices", async () => {
    const { items } = await listInstagramMedia(store);
    expect(items).toHaveLength(12);
    expect(items[0]).toMatchObject({ title: "Cloud mug ☁️", price: 28, currency: "USD", imported: false, importable: true });
    expect(items.find((row) => row.media_type === "VIDEO")!.importable).toBe(true);
  });

  it("imports posts as products with photos, flags missing prices, and never duplicates", async () => {
    const results = await importInstagramMedia(store, ["mock-1", "mock-3", "mock-6"]);
    expect(results.map((result) => result.status)).toEqual(["imported", "imported", "imported"]);
    expect(results[2]!.needs_price).toBe(true);
    const products = await getRepository().listProducts(store.id);
    expect(products).toHaveLength(3);
    expect(products.find((product) => product.external_id === "mock-3")!.image_urls).toHaveLength(3);
    expect(products.find((product) => product.external_id === "mock-6")!.price).toBe(0);
    const again = await importInstagramMedia(store, ["mock-1", "mock-3"]);
    expect(again.map((result) => result.status)).toEqual(["skipped", "skipped"]);
    expect(await getRepository().listProducts(store.id)).toHaveLength(3);
    const { items } = await listInstagramMedia(store);
    expect(items.filter((row) => row.imported).map((row) => row.id)).toEqual(["mock-1", "mock-3", "mock-6"]);
  });

  it("won't post from a draft store", async () => {
    const [first] = await getRepository().listProducts(store.id);
    await expect(publishProduct(store, first!.id, ["facebook"], origin)).rejects.toMatchObject({ status: 409 });
  });

  it("posts (simulated) to Facebook, skips Instagram originals, and records the ledger", async () => {
    store = await getRepository().saveStore(store.id, { status: "published" });
    const products = await getRepository().listProducts(store.id);
    const priced = products.find((product) => product.external_id === "mock-1")!;

    const results = await publishProduct(store, priced.id, ["facebook", "instagram"], origin);
    expect(results.find((result) => result.channel === "facebook")!.status).toBe("simulated");
    expect(results.find((result) => result.channel === "instagram")!.status).toBe("skipped");

    const ledger = await getRepository().listChannelPosts(store.id);
    expect(ledger.find((post) => post.product_id === priced.id && post.channel === "facebook")!.status).toBe("simulated");
    expect(ledger.find((post) => post.product_id === priced.id && post.channel === "instagram")!.status).toBe("source");
  });

  it("blocks posting products without a price", async () => {
    const unpriced = (await getRepository().listProducts(store.id)).find((product) => product.price === 0)!;
    await expect(publishProduct(store, unpriced.id, ["facebook"], origin)).rejects.toMatchObject({ status: 400 });
  });

  it("purges tokens and the ledger on a deauthorize callback", async () => {
    const repository = getRepository();
    expect(await repository.purgeSocialData("mock-user")).toBeGreaterThanOrEqual(1);
    expect(await repository.getSocialConnection(store.id)).toBeNull();
    expect(await repository.listChannelPosts(store.id)).toHaveLength(0);
  });
});
