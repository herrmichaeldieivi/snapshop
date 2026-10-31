export const RESERVED_SLUGS = new Set([
  "admin",
  "login",
  "api",
  "s",
  "sitemap",
  "robots",
  "www",
  "app",
  "static",
  "_next",
]);

export function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

export function validateSlug(value: string): string | null {
  const slug = normalizeSlug(value);
  if (slug.length < 3 || slug.length > 40) return "Use 3 to 40 characters.";
  if (!/^[a-z0-9-]+$/.test(slug)) return "Use lowercase letters, numbers, and hyphens only.";
  if (RESERVED_SLUGS.has(slug)) return "That slug is reserved and cannot be used.";
  return null;
}
