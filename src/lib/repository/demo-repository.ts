import { randomUUID } from "node:crypto";
import type { ChannelPost, ImportIssue, ImportProductInput, ImportRecord, Product, Store, StoredSocialConnection } from "@/src/lib/types";
import type { ProductInput, SnapRepository, StoreInput } from "@/src/lib/repository/types";

const now = () => new Date().toISOString();
const storeId = "demo-store";
const baseStore: Store = {
  id: storeId, owner_id: "demo-operator", slug: "juniper-studio", name: "Juniper Studio", tagline: "Objects for slower mornings.", about_text: "Juniper Studio is a small home-goods collection made for the shelves, tables, and rituals you reach for every day.", email: "hello@juniper-studio.example", whatsapp_number: "+14155550198", instagram_handle: "juniperstudio", logo_url: null, theme_color: "#355B48", currency: "USD", status: "published", published_at: now(), slug_change_count: 0, created_at: now(), updated_at: now(),
};
const initialProducts: Product[] = [
  { id: "p-cloud-mug", store_id: storeId, sku: "JS-001", title: "Cloud Mug", description: "A soft, generous mug for coffee, tea, or a pause between meetings.", price: 28, currency: "USD", image_urls: [], category: "Tableware", availability: "in_stock", sort_order: 0, external_link: null, created_at: now(), updated_at: now() },
  { id: "p-pillar-candle", store_id: storeId, sku: "JS-002", title: "Quiet Hour Candle", description: "Cedar, dry moss, and a bright trace of bergamot in hand-poured soy wax.", price: 34, currency: "USD", image_urls: [], category: "Home scent", availability: "in_stock", sort_order: 1, external_link: null, created_at: now(), updated_at: now() },
  { id: "p-linen-napkin", store_id: storeId, sku: "JS-003", title: "Washed Linen Napkin", description: "A weighty flax napkin, pre-washed for a relaxed table from the first use.", price: 18, currency: "USD", image_urls: [], category: "Tableware", availability: "out_of_stock", sort_order: 2, external_link: null, created_at: now(), updated_at: now() },
  { id: "p-catchall", store_id: storeId, sku: "JS-004", title: "Pebble Catchall", description: "A low-profile tray for keys, jewelry, or whatever needs a home by the door.", price: 22, currency: "USD", image_urls: [], category: "Objects", availability: "in_stock", sort_order: 3, external_link: null, created_at: now(), updated_at: now() },
];

type DemoState = { stores: Store[]; products: Product[]; imports: ImportRecord[]; social?: { connections: Map<string, StoredSocialConnection>; posts: ChannelPost[] } };
const globalState = globalThis as unknown as { snapShopDemo?: DemoState };
function state(): DemoState {
  if (!globalState.snapShopDemo) globalState.snapShopDemo = { stores: [baseStore], products: initialProducts, imports: [] };
  return globalState.snapShopDemo;
}
function social() { const current = state(); return (current.social ??= { connections: new Map(), posts: [] }); }
function sortProducts(products: Product[]) { return [...products].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)); }

export const demoRepository: SnapRepository = {
  async listStores() { const current = state(); return current.stores.map((store) => ({ ...store, product_count: current.products.filter((item) => item.store_id === store.id).length })); },
  async getStore(id) { return state().stores.find((item) => item.id === id) ?? null; },
  async getStoreBySlug(slug, publishedOnly) { const store = state().stores.find((item) => item.slug === slug) ?? null; return publishedOnly && store?.status !== "published" ? null : store; },
  async createStore(input, ownerId) { const entry: Store = { ...baseStore, tagline: null, about_text: null, email: null, whatsapp_number: null, instagram_handle: null, id: randomUUID(), owner_id: ownerId, name: input.name, slug: input.slug, status: "draft", published_at: null, created_at: now(), updated_at: now() }; state().stores.push(entry); return entry; },
  async saveStore(id, input) { const current = state(); const index = current.stores.findIndex((item) => item.id === id); if (index < 0) throw new Error("Store not found."); const old = current.stores[index]; const changingSlug = Boolean(input.slug && input.slug !== old.slug); if (changingSlug && (old.status !== "draft" || old.slug_change_count >= 1)) throw new Error("A store slug can only be changed once while draft."); const status = input.status ?? old.status; const next = { ...old, ...input, status, slug_change_count: changingSlug ? old.slug_change_count + 1 : old.slug_change_count, published_at: status === "published" && !old.published_at ? now() : status === "draft" ? null : old.published_at, updated_at: now() }; current.stores[index] = next; return next; },
  async listProducts(id) { return sortProducts(state().products.filter((item) => item.store_id === id)); },
  async getProduct(id, productId, publishedOnly) { const store = await this.getStore(id); if (publishedOnly && store?.status !== "published") return null; return state().products.find((item) => item.store_id === id && item.id === productId) ?? null; },
  async saveProduct(id, productId, input: ProductInput) { const current = state(); if (productId) { const index = current.products.findIndex((item) => item.store_id === id && item.id === productId); if (index < 0) throw new Error("Product not found."); const next = { ...current.products[index], ...input, updated_at: now() }; current.products[index] = next; return next; } const product: Product = { ...input, id: randomUUID(), store_id: id, sort_order: Math.max(-1, ...current.products.filter((item) => item.store_id === id).map((item) => item.sort_order)) + 1, created_at: now(), updated_at: now() }; current.products.push(product); return product; },
  async setProductAvailability(id, ids, availability) { state().products = state().products.map((item) => item.store_id === id && ids.includes(item.id) ? { ...item, availability, updated_at: now() } : item); },
  async reorderProduct(id, productId, direction) { const current = state(); const products = sortProducts(current.products.filter((item) => item.store_id === id)); const index = products.findIndex((item) => item.id === productId); const target = direction === "up" ? index - 1 : index + 1; if (index < 0 || target < 0 || target >= products.length) return; const [first, second] = [products[index], products[target]]; current.products = current.products.map((item) => item.id === first.id ? { ...item, sort_order: second.sort_order } : item.id === second.id ? { ...item, sort_order: first.sort_order } : item); },
  async deleteProducts(id, ids) { state().products = state().products.filter((item) => item.store_id !== id || !ids.includes(item.id)); },
  async createImport(id, identity, filename, rowCount, payload, issues) { const record: ImportRecord = { id: randomUUID(), store_id: id, created_by: identity.id, filename, row_count: rowCount, imported_count: 0, error_report: issues, status: "previewed", payload, created_at: now() }; state().imports.unshift(record); return record; },
  async listImports(id) { return state().imports.filter((item) => item.store_id === id).sort((first, second) => second.created_at.localeCompare(first.created_at)); },
  async getImport(id, importId) { return state().imports.find((item) => item.store_id === id && item.id === importId) ?? null; },
  async replaceImportPayload(id, importId, payload, issues) { const record = await this.getImport(id, importId); if (!record) throw new Error("Import not found."); record.payload = payload; record.error_report = issues; },
  async commitImport(id, importId) { const current = state(); const record = current.imports.find((item) => item.store_id === id && item.id === importId); if (!record) throw new Error("Import not found."); if (record.status === "committed") return { imported: record.imported_count, issues: record.error_report, alreadyCommitted: true }; const payload = record.payload ?? []; for (const item of payload) { const existing = item.sku ? current.products.find((product) => product.store_id === id && product.sku?.toLowerCase() === item.sku?.toLowerCase()) : current.products.find((product) => product.store_id === id && product.title.trim().toLowerCase() === item.title.trim().toLowerCase()); await this.saveProduct(id, existing?.id ?? null, item); } record.imported_count = payload.length; record.status = "committed"; return { imported: payload.length, issues: record.error_report, alreadyCommitted: false }; },
  async createImportedProduct(id, input) {
    const current = state();
    if (current.products.some((item) => item.store_id === id && item.external_source === input.external_source && item.external_id === input.external_id)) throw new Error("Already imported.");
    const product: Product = { ...input, id: randomUUID(), store_id: id, sort_order: Math.max(-1, ...current.products.filter((item) => item.store_id === id).map((item) => item.sort_order)) + 1, created_at: now(), updated_at: now() };
    current.products.push(product);
    return product;
  },
  async listExternalIds(id, source) { return state().products.filter((item) => item.store_id === id && item.external_source === source && item.external_id).map((item) => item.external_id as string); },
  async getSocialConnection(id) { return social().connections.get(id) ?? null; },
  async saveSocialConnection(id, input) { const record: StoredSocialConnection = { ...input, store_id: id, updated_at: now() }; social().connections.set(id, record); return record; },
  async deleteSocialConnection(id) { social().connections.delete(id); },
  async purgeSocialData(fbUserId) { const s = social(); const ids = [...s.connections.values()].filter((item) => item.fb_user_id === fbUserId).map((item) => item.store_id); for (const id of ids) { s.connections.delete(id); s.posts = s.posts.filter((post) => post.store_id !== id); } return ids.length; },
  async listChannelPosts(id) { return social().posts.filter((post) => post.store_id === id); },
  async saveChannelPost(id, productId, channel, input) {
    const s = social(); const existing = s.posts.find((post) => post.product_id === productId && post.channel === channel);
    const next: ChannelPost = { id: existing?.id ?? randomUUID(), store_id: id, product_id: productId, channel, external_id: null, permalink: null, content_hash: null, error: null, posted_at: null, ...(existing ?? {}), ...input, updated_at: now() };
    s.posts = existing ? s.posts.map((post) => (post === existing ? next : post)) : [...s.posts, next];
    return next;
  },
  async cancelImport(id, importId) { const record = await this.getImport(id, importId); if (!record) throw new Error("Import not found."); if (record.status === "previewed") record.status = "cancelled"; },
};
