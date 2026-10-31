import sharp from "sharp";
import type { SocialCandidate } from "@/src/lib/types";
import type { IgMedia } from "@/src/lib/social/instagram";

/** Preview-mode sample feed. Nothing here is real, and every photo says so. */
const POSTS: { caption: string; type: IgMedia["media_type"]; slides?: number }[] = [
  { caption: "Cloud mug ☁️ $28\nHand-thrown stoneware, dishwasher safe. Holds 12oz.\n#ceramics #handmade #mug", type: "IMAGE" },
  { caption: "Quiet Hour candle — $34 🕯️\nCedar + bergamot, 8oz soy wax, 50 hr burn.\n\nDM to order", type: "IMAGE" },
  { caption: "Morning set: mug + candle bundle $64\nSwipe for the full set →", type: "CAROUSEL_ALBUM", slides: 3 },
  { caption: "SOLD — Linen napkin set of 4, $42", type: "IMAGE" },
  { caption: "Pebble catchall 22 USD\nFits rings, keys, loose change.", type: "IMAGE" },
  { caption: "Studio sneak peek ✨ new glaze test, no name yet", type: "IMAGE" },
  { caption: "Pouring the new glaze 🎥 (reel)", type: "VIDEO" },
  { caption: "Tall vase €48,50\nStands 11 inches.\n#vase #ceramics", type: "IMAGE" },
  { caption: "Gift card — any amount from $25", type: "IMAGE" },
  { caption: "Windowsill planter $36\nDrainage hole + saucer included.", type: "CAROUSEL_ALBUM", slides: 2 },
  { caption: "Little spoon rest — £18", type: "IMAGE" },
  { caption: "Market day this Saturday! Come say hi 🌿", type: "IMAGE" },
];

export const mockCandidate = (name: string, handle: string): SocialCandidate => ({
  page_id: "mock-page",
  page_name: `${name} (sample Page)`,
  ig_user_id: "mock-ig",
  ig_username: handle,
});

export function mockMedia(): IgMedia[] {
  return POSTS.map((post, index) => {
    const n = index + 1;
    const children = Array.from({ length: post.slides ?? 0 }, (_, slide) => ({ id: `mock-${n}-c${slide}`, media_type: "IMAGE", media_url: `mock:${n}:${slide}` }));
    return {
      id: `mock-${n}`,
      caption: post.caption,
      media_type: post.type,
      media_url: post.type === "IMAGE" ? `mock:${n}:0` : null,
      thumbnail_url: post.type === "VIDEO" ? `mock:${n}:0` : null,
      permalink: null,
      timestamp: new Date(Date.now() - n * 86_400_000 * 3).toISOString(),
      children,
    };
  });
}

export const mockGetMedia = (id: string) => mockMedia().find((media) => media.id === id) ?? null;

function svgFor(source: string) {
  const [, n = "1", slide = "0"] = source.split(":");
  const hue = (Number(n) * 47 + Number(slide) * 19) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720">
<rect width="720" height="720" fill="hsl(${hue} 38% 86%)"/><circle cx="360" cy="320" r="150" fill="hsl(${hue} 34% 70%)"/>
<text x="360" y="560" font-family="sans-serif" font-size="40" text-anchor="middle" fill="hsl(${hue} 30% 28%)">Sample photo ${n}${Number(slide) ? `.${Number(slide) + 1}` : ""}</text>
<text x="360" y="610" font-family="sans-serif" font-size="26" text-anchor="middle" fill="hsl(${hue} 30% 36%)">preview mode</text></svg>`;
}

export const mockThumb = (source: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svgFor(source))}`;
export const mockImageBytes = (source: string) => sharp(Buffer.from(svgFor(source))).png().toBuffer();
