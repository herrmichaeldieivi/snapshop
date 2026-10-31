import { graph } from "@/src/lib/social/graph";
import { SocialError } from "@/src/lib/social/errors";

/** Uploads each photo unpublished, then creates one feed post that attaches them all. */
export async function publishPagePost(token: string, pageId: string, message: string, imageUrls: string[]) {
  if (!imageUrls.length) throw new SocialError("Facebook posts need at least one photo.", 400);
  const mediaIds: string[] = [];
  for (const url of imageUrls.slice(0, 10)) {
    const photo = await graph<{ id: string }>({ path: `${pageId}/photos`, method: "POST", token, params: { url, published: false } });
    mediaIds.push(photo.id);
  }
  const post = await graph<{ id: string }>({
    path: `${pageId}/feed`,
    method: "POST",
    token,
    params: { message, attached_media: JSON.stringify(mediaIds.map((id) => ({ media_fbid: id }))) },
  });
  return { externalId: post.id, permalink: `https://www.facebook.com/${post.id}` };
}
