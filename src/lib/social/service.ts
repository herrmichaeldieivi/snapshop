import { randomUUID } from "node:crypto";
import { getRepository } from "@/src/lib/repository";
import { processImageBytes, processImportedImage } from "@/src/lib/image-pipeline";
import type { ChannelPost, Product, SocialChannel, SocialConnection, Store, StoredSocialConnection } from "@/src/lib/types";
import { buildPostCaption, contentHash, parseInstagramCaption } from "@/src/lib/social/caption";
import { isPublicHttpsOrigin, siteOrigin } from "@/src/lib/social/config";
import { decryptSecret } from "@/src/lib/social/crypto";
import { SocialError } from "@/src/lib/social/errors";
import { publishPagePost } from "@/src/lib/social/facebook";
import { mediaUrl } from "@/src/lib/social/feed";
import { MetaApiError } from "@/src/lib/social/graph";
import { getMedia, imageSourcesFor, listMedia, publishInstagram, type IgMedia } from "@/src/lib/social/instagram";
import { mockGetMedia, mockImageBytes, mockMedia, mockThumb } from "@/src/lib/social/mock";

export const REQUIRED_PUBLISH_SCOPES = ["instagram_content_publish", "pages_manage_posts"];

export function publicConnection(connection: StoredSocialConnection | null): SocialConnection | null {
  if (!connection) return null;
  const { access_token_enc, ...safe } = connection;
  void access_token_enc;
  return safe;
}

export async function requireActiveConnection(storeId: string) {
  const connection = await getRepository().getSocialConnection(storeId);
  if (!connection || connection.status === "pending") throw new SocialError("Connect Instagram and Facebook first.", 409);
  if (connection.status === "needs_reconnect" || !connection.access_token_enc) throw new SocialError("The Meta connection expired. Reconnect to continue.", 401);
  return { connection, token: decryptSecret(connection.access_token_enc) };
}

/** Runs a Meta call; if Meta says the token is dead (code 190), remember that so the UI asks for a reconnect. */
export async function guard<T>(storeId: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof MetaApiError && error.needsReconnect) {
      const repository = getRepository();
      const connection = await repository.getSocialConnection(storeId);
      if (connection) {
        const { store_id, updated_at, ...rest } = connection;
        void store_id;
        void updated_at;
        await repository.saveSocialConnection(storeId, { ...rest, status: "needs_reconnect" });
      }
    }
    throw error;
  }
}

export interface MediaRow {
  id: string;
  thumb: string | null;
  caption: string | null;
  media_type: IgMedia["media_type"];
  permalink: string | null;
  timestamp: string | null;
  images: number;
  imported: boolean;
  importable: boolean;
  title: string;
  price: number | null;
  currency: string | null;
  availability: "in_stock" | "out_of_stock";
}

export async function listInstagramMedia(store: Store, after?: string | null) {
  const { connection, token } = await requireActiveConnection(store.id);
  if (!connection.ig_user_id) throw new SocialError("This Facebook Page has no linked Instagram professional account.", 409);
  const page = connection.simulated
    ? { items: mockMedia(), next: null as string | null }
    : await guard(store.id, () => listMedia(token, connection.ig_user_id as string, after));
  const imported = new Set(await getRepository().listExternalIds(store.id, "instagram"));
  const items: MediaRow[] = page.items.map((media) => {
    const sources = imageSourcesFor(media);
    const first = sources[0] ?? null;
    const parsed = parseInstagramCaption(media.caption, { storeCurrency: store.currency, timestamp: media.timestamp });
    return {
      id: media.id,
      thumb: first?.startsWith("mock:") ? mockThumb(first) : first,
      caption: media.caption,
      media_type: media.media_type,
      permalink: media.permalink,
      timestamp: media.timestamp,
      images: Math.min(sources.length, 5),
      imported: imported.has(media.id),
      importable: sources.length > 0,
      title: parsed.title,
      price: parsed.price,
      currency: parsed.currency,
      availability: parsed.availability,
    };
  });
  return { items, next: page.next };
}

export interface ImportResult {
  id: string;
  status: "imported" | "skipped" | "failed";
  message?: string;
  product_id?: string;
  title?: string;
  needs_price?: boolean;
}

const storeImage = async (storeId: string, source: string) =>
  source.startsWith("mock:") ? processImageBytes(storeId, await mockImageBytes(source)) : processImportedImage(storeId, source);

/** Imports the chosen posts as products. Posts already imported are skipped, so edits are never overwritten. */
export async function importInstagramMedia(store: Store, mediaIds: string[]): Promise<ImportResult[]> {
  const { connection, token } = await requireActiveConnection(store.id);
  const repository = getRepository();
  const existing = new Set(await repository.listExternalIds(store.id, "instagram"));
  const results: ImportResult[] = [];

  for (const id of mediaIds) {
    if (existing.has(id)) {
      results.push({ id, status: "skipped", message: "Already imported." });
      continue;
    }
    try {
      const media = connection.simulated ? mockGetMedia(id) : await guard(store.id, () => getMedia(token, id));
      if (!media) {
        results.push({ id, status: "failed", message: "That post wasn't found." });
        continue;
      }
      const sources = imageSourcesFor(media).slice(0, 5);
      if (!sources.length) {
        results.push({ id, status: "skipped", message: "No photo to import." });
        continue;
      }
      const stored = await Promise.allSettled(sources.map((source) => storeImage(store.id, source)));
      const image_urls = stored.flatMap((entry) => (entry.status === "fulfilled" ? [entry.value] : []));
      if (!image_urls.length) {
        const reason = stored.find((entry) => entry.status === "rejected") as PromiseRejectedResult | undefined;
        results.push({ id, status: "failed", message: `Couldn't download the photo: ${reason?.reason instanceof Error ? reason.reason.message : "unknown error"}` });
        continue;
      }
      const parsed = parseInstagramCaption(media.caption, { storeCurrency: store.currency, timestamp: media.timestamp });
      const product = await repository.createImportedProduct(store.id, {
        title: parsed.title,
        description: parsed.description,
        price: parsed.price ?? 0,
        currency: parsed.currency ?? store.currency,
        image_urls,
        category: null,
        availability: parsed.availability,
        external_link: null,
        sku: null,
        external_source: "instagram",
        external_id: media.id,
      });
      await repository.saveChannelPost(store.id, product.id, "instagram", {
        status: "source",
        external_id: media.id,
        permalink: media.permalink,
        content_hash: contentHash(product),
        posted_at: media.timestamp,
      });
      existing.add(media.id);
      results.push({ id, status: "imported", product_id: product.id, title: product.title, needs_price: parsed.price === null });
    } catch (error) {
      if (error instanceof MetaApiError && error.needsReconnect) throw error;
      const duplicate = error instanceof Error && /already imported|duplicate|23505/i.test(error.message);
      results.push({ id, status: duplicate ? "skipped" : "failed", message: duplicate ? "Already imported." : error instanceof Error ? error.message.slice(0, 200) : "Import failed." });
    }
  }
  return results;
}

export interface PublishResult {
  channel: SocialChannel;
  status: "posted" | "simulated" | "skipped" | "failed";
  permalink?: string | null;
  message?: string;
}

export async function publishProduct(store: Store, productId: string, channels: SocialChannel[], origin: string, repost = false): Promise<PublishResult[]> {
  if (store.status !== "published") throw new SocialError("Publish your store first — posts link back to your storefront.", 409);
  const repository = getRepository();
  const product = await repository.getProduct(store.id, productId);
  if (!product) throw new SocialError("Product not found.", 404);
  if (!product.image_urls.length) throw new SocialError("Add a photo to this product first — Instagram and Facebook posts need an image.", 400);
  if (!(product.price > 0)) throw new SocialError("Set a price first so the post isn't misleading.", 400);

  const { connection, token } = await requireActiveConnection(store.id);
  const site = siteOrigin(origin) as string;
  if (!connection.simulated && !isPublicHttpsOrigin(site)) {
    throw new SocialError("Meta has to fetch your photos from a public https:// address. Set NEXT_PUBLIC_SITE_URL to your deployed URL (or tunnel localhost).", 400);
  }

  const ledger = new Map((await repository.listChannelPosts(store.id)).filter((post) => post.product_id === product.id).map((post) => [post.channel, post]));
  const images = product.image_urls.slice(0, 10).map((source, index) => mediaUrl(site, store.slug, product.id, index, source));
  const caption = buildPostCaption(product, store, `${site}/s/${store.slug}/p/${product.id}`);
  const hash = contentHash(product);
  const results: PublishResult[] = [];

  for (const channel of [...new Set(channels)]) {
    const prior = ledger.get(channel);
    if (channel === "instagram" && prior?.status === "source") {
      results.push({ channel, status: "skipped", message: "This product came from Instagram, so it's already there.", permalink: prior.permalink });
      continue;
    }
    if (prior?.status === "live" && !repost) {
      results.push({ channel, status: "skipped", message: "Already posted. Use “Post again” to publish a new copy.", permalink: prior.permalink });
      continue;
    }
    try {
      let outcome: { externalId: string; permalink: string | null };
      if (connection.simulated) outcome = { externalId: `preview_${randomUUID().slice(0, 8)}`, permalink: null };
      else if (channel === "instagram") {
        if (!connection.ig_user_id) throw new SocialError("No Instagram account is linked to this connection.", 409);
        const igUserId = connection.ig_user_id;
        outcome = await guard(store.id, () => publishInstagram(token, igUserId, images, caption));
      } else {
        if (!connection.page_id) throw new SocialError("No Facebook Page is linked to this connection.", 409);
        const pageId = connection.page_id;
        outcome = await guard(store.id, () => publishPagePost(token, pageId, caption, images));
      }
      await repository.saveChannelPost(store.id, product.id, channel, {
        status: connection.simulated ? "simulated" : "live",
        external_id: outcome.externalId,
        permalink: outcome.permalink,
        content_hash: hash,
        error: null,
        posted_at: new Date().toISOString(),
      });
      results.push({ channel, status: connection.simulated ? "simulated" : "posted", permalink: outcome.permalink });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 300) : "Posting failed.";
      // A failed re-post must not erase the record of the post that is still live.
      if (prior?.status !== "live") await repository.saveChannelPost(store.id, product.id, channel, { status: "failed", error: message });
      if (error instanceof MetaApiError && error.needsReconnect) throw error;
      results.push({ channel, status: "failed", message });
    }
  }
  return results;
}

export type { ChannelPost, Product };
