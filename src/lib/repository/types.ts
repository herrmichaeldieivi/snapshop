import type { AdminIdentity, ChannelPost, ImportIssue, ImportProductInput, ImportRecord, Product, SocialChannel, Store, StoreSummary, StoredSocialConnection } from "@/src/lib/types";

export type StoreInput = Pick<Store, "name" | "slug" | "tagline" | "about_text" | "email" | "whatsapp_number" | "instagram_handle" | "logo_url" | "theme_color" | "currency">;
export type ProductInput = Pick<Product, "title" | "description" | "price" | "currency" | "image_urls" | "category" | "availability" | "external_link" | "sku">;
export type ImportedProductInput = ProductInput & { external_source: "instagram"; external_id: string };
export type SocialConnectionInput = Omit<StoredSocialConnection, "store_id" | "updated_at">;
export type ChannelPostInput = Pick<ChannelPost, "status"> & Partial<Pick<ChannelPost, "external_id" | "permalink" | "content_hash" | "error" | "posted_at">>;

export interface SnapRepository {
  listStores(identity: AdminIdentity): Promise<StoreSummary[]>;
  getStore(id: string): Promise<Store | null>;
  getStoreBySlug(slug: string, publishedOnly?: boolean): Promise<Store | null>;
  createStore(input: Pick<StoreInput, "name" | "slug">, ownerId: string | null): Promise<Store>;
  saveStore(id: string, input: Partial<StoreInput> & { status?: Store["status"] }): Promise<Store>;
  listProducts(storeId: string): Promise<Product[]>;
  getProduct(storeId: string, productId: string, publishedOnly?: boolean): Promise<Product | null>;
  saveProduct(storeId: string, productId: string | null, input: ProductInput): Promise<Product>;
  setProductAvailability(storeId: string, ids: string[], availability: Product["availability"]): Promise<void>;
  reorderProduct(storeId: string, productId: string, direction: "up" | "down"): Promise<void>;
  deleteProducts(storeId: string, ids: string[]): Promise<void>;
  createImport(storeId: string, identity: AdminIdentity, filename: string, rowCount: number, payload: ImportProductInput[], issues: ImportIssue[]): Promise<ImportRecord>;
  listImports(storeId: string): Promise<ImportRecord[]>;
  getImport(storeId: string, importId: string): Promise<ImportRecord | null>;
  replaceImportPayload(storeId: string, importId: string, payload: ImportProductInput[], issues: ImportIssue[]): Promise<void>;
  commitImport(storeId: string, importId: string): Promise<{ imported: number; issues: ImportIssue[]; alreadyCommitted: boolean }>;
  cancelImport(storeId: string, importId: string): Promise<void>;
  createImportedProduct(storeId: string, input: ImportedProductInput): Promise<Product>;
  listExternalIds(storeId: string, source: "instagram"): Promise<string[]>;
  getSocialConnection(storeId: string): Promise<StoredSocialConnection | null>;
  saveSocialConnection(storeId: string, input: SocialConnectionInput): Promise<StoredSocialConnection>;
  deleteSocialConnection(storeId: string): Promise<void>;
  /** Removes tokens and the channel ledger for every store connected by this Facebook user (deauthorize / data deletion). */
  purgeSocialData(fbUserId: string): Promise<number>;
  listChannelPosts(storeId: string): Promise<ChannelPost[]>;
  saveChannelPost(storeId: string, productId: string, channel: SocialChannel, input: ChannelPostInput): Promise<ChannelPost>;
}
