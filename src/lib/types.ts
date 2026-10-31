export type StoreStatus = "draft" | "published";
export type Availability = "in_stock" | "out_of_stock";
export type CurrencyCode = "USD" | "CAD" | "EUR" | "GBP";

export interface Store {
  id: string;
  owner_id: string | null;
  slug: string;
  name: string;
  tagline: string | null;
  about_text: string | null;
  email: string | null;
  whatsapp_number: string | null;
  instagram_handle: string | null;
  logo_url: string | null;
  theme_color: string;
  currency: CurrencyCode;
  status: StoreStatus;
  published_at: string | null;
  slug_change_count: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  sku: string | null;
  title: string;
  description: string | null;
  price: number;
  currency: CurrencyCode;
  image_urls: string[];
  image_alt_texts?: string[];
  category: string | null;
  availability: Availability;
  sort_order: number;
  external_link: string | null;
  external_source?: "instagram" | null;
  external_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportIssue {
  row: number;
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ImportRecord {
  id: string;
  store_id: string;
  created_by: string;
  filename: string;
  row_count: number;
  imported_count: number;
  error_report: ImportIssue[];
  status: "previewed" | "committed" | "cancelled";
  payload?: ImportProductInput[];
  created_at: string;
}

export interface ImportProductInput {
  sourceRow: number;
  title: string;
  price: number;
  image_urls: string[];
  description: string | null;
  category: string | null;
  currency: CurrencyCode;
  availability: Availability;
  external_link: string | null;
  sku: string | null;
}

export interface StoreSummary extends Store {
  product_count: number;
}

export interface AdminIdentity {
  id: string;
  email: string | null;
  isOperator: boolean;
  isDemo: boolean;
}

export interface ContactLink {
  href: string;
  channel: "whatsapp" | "email" | "instagram";
  label: string;
}

export type SocialChannel = "instagram" | "facebook";
export type SocialConnectionStatus = "pending" | "active" | "needs_reconnect";

export interface SocialCandidate {
  page_id: string;
  page_name: string;
  ig_user_id: string | null;
  ig_username: string | null;
}

/** Safe to send to the browser: never includes a token. */
export interface SocialConnection {
  store_id: string;
  status: SocialConnectionStatus;
  fb_user_id: string | null;
  page_id: string | null;
  page_name: string | null;
  ig_user_id: string | null;
  ig_username: string | null;
  candidates: SocialCandidate[];
  scopes: string[];
  token_expires_at: string | null;
  simulated: boolean;
  updated_at: string;
}

export interface StoredSocialConnection extends SocialConnection {
  access_token_enc: string | null;
}

/** source = the product was imported from this channel; live = we posted it; simulated = preview mode, nothing was posted. */
export type ChannelPostStatus = "source" | "live" | "failed" | "simulated";

export interface ChannelPost {
  id: string;
  store_id: string;
  product_id: string;
  channel: SocialChannel;
  status: ChannelPostStatus;
  external_id: string | null;
  permalink: string | null;
  content_hash: string | null;
  error: string | null;
  posted_at: string | null;
  updated_at: string;
}
