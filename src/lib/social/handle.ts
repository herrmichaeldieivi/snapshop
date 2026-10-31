const NOT_PROFILES = new Set(["p", "reel", "reels", "stories", "explore", "tv", "accounts", "direct", "about"]);

/** Accepts "@name", "name", "instagram.com/name" or a full profile URL. Returns a lowercase username or null. */
export function parseHandle(input: string | null | undefined): string | null {
  let value = (input ?? "").trim();
  if (!value) return null;
  const urlMatch = /(?:^|\/\/)(?:www\.|m\.)?instagram\.com\/([^/?#\s]+)/i.exec(value);
  if (urlMatch?.[1]) {
    if (NOT_PROFILES.has(urlMatch[1].toLowerCase())) return null;
    value = urlMatch[1];
  }
  value = value.replace(/^@+/, "").toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(value) && !value.endsWith(".") ? value : null;
}

export function slugFromHandle(handle: string): string {
  return handle.replace(/[._]+/g, "-").replace(/^-+|-+$/g, "");
}

export function nameFromHandle(handle: string): string {
  const words = handle.split(/[._]+/).filter(Boolean);
  const name = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  return name.slice(0, 80) || "My shop";
}
