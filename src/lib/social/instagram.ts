import { graph } from "@/src/lib/social/graph";
import { SocialError } from "@/src/lib/social/errors";

export interface IgChild { id: string; media_type: string; media_url: string | null }
export interface IgMedia {
  id: string;
  caption: string | null;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string | null;
  thumbnail_url: string | null;
  permalink: string | null;
  timestamp: string | null;
  children: IgChild[];
}

type RawMedia = Omit<IgMedia, "children" | "caption" | "media_url" | "thumbnail_url" | "permalink" | "timestamp"> &
  Partial<Pick<IgMedia, "caption" | "media_url" | "thumbnail_url" | "permalink" | "timestamp">> & { children?: { data?: IgChild[] } };

const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url}";

export function normalizeMedia(raw: RawMedia): IgMedia {
  return {
    id: raw.id,
    caption: raw.caption ?? null,
    media_type: raw.media_type,
    media_url: raw.media_url ?? null,
    thumbnail_url: raw.thumbnail_url ?? null,
    permalink: raw.permalink ?? null,
    timestamp: raw.timestamp ?? null,
    children: raw.children?.data ?? [],
  };
}

export async function listMedia(token: string, igUserId: string, after?: string | null, limit = 24) {
  const result = await graph<{ data?: RawMedia[]; paging?: { cursors?: { after?: string }; next?: string } }>({
    path: `${igUserId}/media`,
    token,
    params: { fields: FIELDS, limit, after: after ?? undefined },
  });
  return { items: (result.data ?? []).map(normalizeMedia), next: result.paging?.next ? result.paging.cursors?.after ?? null : null };
}

export async function getMedia(token: string, mediaId: string) {
  return normalizeMedia(await graph<RawMedia>({ path: mediaId, token, params: { fields: FIELDS } }));
}

/** Photos we can import: image posts, the image slides of a carousel, or a video's cover frame. */
export function imageSourcesFor(media: IgMedia): string[] {
  if (media.media_type === "IMAGE") return media.media_url ? [media.media_url] : [];
  if (media.media_type === "CAROUSEL_ALBUM") return media.children.filter((c) => c.media_type === "IMAGE" && c.media_url).map((c) => c.media_url as string);
  return media.thumbnail_url ? [media.thumbnail_url] : [];
}

interface PublishOptions { sleep?: (ms: number) => Promise<void>; pollMs?: number; maxPolls?: number }

/** Single image or carousel. Image URLs must be public JPEGs. */
export async function publishInstagram(token: string, igUserId: string, imageUrls: string[], caption: string, options: PublishOptions = {}) {
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const pollMs = options.pollMs ?? 1500;
  const maxPolls = options.maxPolls ?? 12;
  if (!imageUrls.length) throw new SocialError("Instagram posts need at least one photo.", 400);

  const create = async (params: Record<string, string | boolean>) =>
    (await graph<{ id: string }>({ path: `${igUserId}/media`, method: "POST", token, params })).id;

  const waitReady = async (containerId: string) => {
    for (let attempt = 0; attempt < maxPolls; attempt += 1) {
      const status = await graph<{ status_code?: string; status?: string }>({ path: containerId, token, params: { fields: "status_code,status" } });
      if (status.status_code === "FINISHED") return;
      if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
        throw new SocialError(`Instagram couldn't process the photo (${status.status ?? status.status_code}). Photos must be JPEG, between 4:5 and 1.91:1.`, 422);
      }
      await sleep(pollMs);
    }
    throw new SocialError("Instagram is still processing the photo. Check Instagram in a minute before trying again.", 504);
  };

  let creationId: string;
  if (imageUrls.length === 1) {
    creationId = await create({ image_url: imageUrls[0] as string, caption });
    await waitReady(creationId);
  } else {
    const children: string[] = [];
    for (const url of imageUrls.slice(0, 10)) {
      const child = await create({ image_url: url, is_carousel_item: true });
      await waitReady(child);
      children.push(child);
    }
    creationId = await create({ media_type: "CAROUSEL", children: children.join(","), caption });
    await waitReady(creationId);
  }

  const published = await graph<{ id: string }>({ path: `${igUserId}/media_publish`, method: "POST", token, params: { creation_id: creationId } });
  let permalink: string | null = null;
  try {
    permalink = (await graph<{ permalink?: string }>({ path: published.id, token, params: { fields: "permalink" } })).permalink ?? null;
  } catch {
    /* the post is live; the permalink is a nicety */
  }
  return { externalId: published.id, permalink };
}
