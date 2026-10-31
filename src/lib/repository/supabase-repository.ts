import type { ChannelPost, ImportIssue, ImportRecord, Product, Store, StoreSummary, StoredSocialConnection } from "@/src/lib/types";
import { getServerSupabase, getServiceSupabase } from "@/src/lib/supabase";
import type { ProductInput, SnapRepository, StoreInput } from "@/src/lib/repository/types";

function client() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}
/** Tokens and the channel ledger are only ever touched with the service role, after the caller's access was checked. */
function privileged() {
  const supabase = getServiceSupabase();
  if (!supabase) throw new Error("Instagram/Facebook sync needs SUPABASE_SERVICE_ROLE_KEY on the server.");
  return supabase;
}
function unwrap<T>(result: { data: unknown; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}
function plainStore(row: unknown) { return row as Store; }
function plainProduct(row: unknown) { return row as Product; }
function plainImport(row: unknown) {
  const value = row as ImportRecord & { preview_rows?: ImportRecord["payload"] };
  return { ...value, payload: value.preview_rows ?? value.payload } as ImportRecord;
}

export const supabaseRepository: SnapRepository = {
  async listStores(identity) {
    const query = client().from("stores").select("*").order("updated_at", { ascending: false });
    const stores = unwrap<Store[]>(await (identity.isOperator ? query : query.eq("owner_id", identity.id))) ?? [];
    const summaries = await Promise.all(stores.map(async (store) => {
      const { count, error } = await client().from("products").select("id", { count: "exact", head: true }).eq("store_id", store.id);
      if (error) throw new Error(error.message);
      return { ...plainStore(store), product_count: count ?? 0 };
    }));
    return summaries as StoreSummary[];
  },
  async getStore(id) {
    const data = unwrap<Store | null>(await client().from("stores").select("*").eq("id", id).maybeSingle());
    return data ? plainStore(data) : null;
  },
  async getStoreBySlug(slug, publishedOnly) {
    let query = client().from("stores").select("*").eq("slug", slug);
    if (publishedOnly) query = query.eq("status", "published");
    const data = unwrap<Store | null>(await query.maybeSingle());
    return data ? plainStore(data) : null;
  },
  async createStore(input, ownerId) {
    const data = unwrap<Store>(await client().from("stores").insert({ ...input, owner_id: ownerId }).select("*").single());
    return plainStore(data);
  },
  async saveStore(id, input) {
    const data = unwrap<Store>(await client().from("stores").update(input).eq("id", id).select("*").single());
    return plainStore(data);
  },
  async listProducts(storeId) {
    const data = unwrap<Product[]>(await client().from("products").select("*").eq("store_id", storeId).order("sort_order").order("created_at"));
    return (data ?? []).map(plainProduct);
  },
  async getProduct(storeId, productId, publishedOnly) {
    if (publishedOnly) {
      const store = await this.getStore(storeId);
      if (!store || store.status !== "published") return null;
    }
    const data = unwrap<Product | null>(await client().from("products").select("*").eq("store_id", storeId).eq("id", productId).maybeSingle());
    return data ? plainProduct(data) : null;
  },
  async saveProduct(storeId, productId, input: ProductInput) {
    if (productId) {
      const data = unwrap<Product>(await client().from("products").update(input).eq("store_id", storeId).eq("id", productId).select("*").single());
      return plainProduct(data);
    }
    const products = await this.listProducts(storeId);
    const sort_order = Math.max(-1, ...products.map((product) => product.sort_order)) + 1;
    const data = unwrap<Product>(await client().from("products").insert({ ...input, store_id: storeId, sort_order }).select("*").single());
    return plainProduct(data);
  },
  async setProductAvailability(storeId, ids, availability) {
    unwrap(await client().from("products").update({ availability }).eq("store_id", storeId).in("id", ids));
  },
  async reorderProduct(storeId, productId, direction) {
    const data = unwrap<Product[]>(await client().from("products").select("*").eq("store_id", storeId).order("sort_order"));
    const index = (data ?? []).findIndex((product) => product.id === productId);
    const adjacent = data?.[direction === "up" ? index - 1 : index + 1];
    const selected = data?.[index];
    if (!selected || !adjacent) return;
    const supabase = client();
    const first = await supabase.from("products").update({ sort_order: adjacent.sort_order }).eq("id", selected.id);
    if (first.error) throw new Error(first.error.message);
    const second = await supabase.from("products").update({ sort_order: selected.sort_order }).eq("id", adjacent.id);
    if (second.error) throw new Error(second.error.message);
  },
  async deleteProducts(storeId, ids) {
    unwrap(await client().from("products").delete().eq("store_id", storeId).in("id", ids));
  },
  async createImport(storeId, identity, filename, rowCount, payload, issues) {
    const data = unwrap<ImportRecord>(await client().from("imports").insert({ store_id: storeId, created_by: identity.id, filename, row_count: rowCount, imported_count: 0, error_report: issues, preview_rows: payload, status: "previewed" }).select("*").single());
    return plainImport(data);
  },
  async listImports(storeId) {
    const data = unwrap<ImportRecord[]>(await client().from("imports").select("*").eq("store_id", storeId).order("created_at", { ascending: false }));
    return (data ?? []).map(plainImport);
  },
  async getImport(storeId, importId) {
    const data = unwrap<ImportRecord | null>(await client().from("imports").select("*").eq("store_id", storeId).eq("id", importId).maybeSingle());
    return data ? plainImport(data) : null;
  },
  async replaceImportPayload(storeId, importId, payload, issues) {
    unwrap(await client().from("imports").update({ preview_rows: payload, error_report: issues }).eq("store_id", storeId).eq("id", importId).eq("status", "previewed"));
  },
  async commitImport(_storeId, importId) {
    const data = unwrap<{ imported_count: number; already_committed: boolean }[]>(await client().rpc("commit_catalog_import", { p_import_id: importId }));
    const result = data?.[0];
    if (!result) throw new Error("The import could not be committed.");
    return { imported: result.imported_count, issues: [], alreadyCommitted: result.already_committed };
  },
  async createImportedProduct(storeId, input) {
    const { data: last } = await client().from("products").select("sort_order").eq("store_id", storeId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const sortOrder = ((last as { sort_order: number } | null)?.sort_order ?? -1) + 1;
    return plainProduct(unwrap<Product>(await client().from("products").insert({ ...input, store_id: storeId, sort_order: sortOrder }).select("*").single()));
  },
  async listExternalIds(storeId, source) {
    const rows = unwrap<{ external_id: string }[]>(await client().from("products").select("external_id").eq("store_id", storeId).eq("external_source", source).not("external_id", "is", null)) ?? [];
    return rows.map((row) => row.external_id);
  },
  async getSocialConnection(storeId) {
    const data = unwrap<StoredSocialConnection | null>(await privileged().from("social_connections").select("*").eq("store_id", storeId).maybeSingle());
    return data ?? null;
  },
  async saveSocialConnection(storeId, input) {
    return unwrap<StoredSocialConnection>(await privileged().from("social_connections").upsert({ ...input, store_id: storeId }, { onConflict: "store_id" }).select("*").single());
  },
  async deleteSocialConnection(storeId) {
    unwrap(await privileged().from("social_connections").delete().eq("store_id", storeId));
  },
  async purgeSocialData(fbUserId) {
    const rows = unwrap<{ store_id: string }[]>(await privileged().from("social_connections").select("store_id").eq("fb_user_id", fbUserId)) ?? [];
    for (const row of rows) {
      unwrap(await privileged().from("channel_posts").delete().eq("store_id", row.store_id));
      unwrap(await privileged().from("social_connections").delete().eq("store_id", row.store_id));
    }
    return rows.length;
  },
  async listChannelPosts(storeId) {
    return unwrap<ChannelPost[]>(await privileged().from("channel_posts").select("*").eq("store_id", storeId)) ?? [];
  },
  async saveChannelPost(storeId, productId, channel, input) {
    return unwrap<ChannelPost>(await privileged().from("channel_posts").upsert({ external_id: null, permalink: null, content_hash: null, error: null, posted_at: null, ...input, store_id: storeId, product_id: productId, channel }, { onConflict: "product_id,channel" }).select("*").single());
  },
  async cancelImport(storeId, importId) {
    unwrap(await client().from("imports").update({ status: "cancelled" }).eq("store_id", storeId).eq("id", importId).eq("status", "previewed"));
  },
};
