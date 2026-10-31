import { z } from "zod";
import type { CurrencyCode } from "@/src/lib/types";
import { cleanOptional, isHttpUrl } from "@/src/lib/utils";
import { isDemoMode } from "@/src/lib/supabase";

export const currencies = ["USD", "CAD", "EUR", "GBP"] as const;
const optionalHttp = z.string().trim().refine((value) => !value || isHttpUrl(value), "Use an http:// or https:// URL.");

export const storeInputSchema = z.object({
  name: z.string().trim().min(1, "Store name is required.").max(80, "Store name must be 80 characters or fewer."),
  tagline: z.string().trim().max(120, "Tagline must be 120 characters or fewer."),
  about_text: z.string().trim().max(2000, "About text must be 2,000 characters or fewer."),
  email: z.string().trim().email("Enter a valid contact email.").or(z.literal("")),
  whatsapp_number: z.string().trim().regex(/^\+[1-9][0-9]{6,14}$/, "Use E.164 format, such as +14155550198.").or(z.literal("")),
  instagram_handle: z.string().trim().max(60).regex(/^[^@\s]*$/, "Enter the handle without @.").or(z.literal("")),
  logo_url: optionalHttp,
  theme_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex colour."),
  currency: z.enum(currencies),
});

export const productInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120, "Title must be 120 characters or fewer."),
  description: z.string().trim().max(2000, "Description must be 2,000 characters or fewer."),
  price: z.coerce.number().finite().min(0, "Price must be zero or greater."),
  currency: z.enum(currencies),
  category: z.string().trim().max(60, "Category must be 60 characters or fewer."),
  availability: z.enum(["in_stock", "out_of_stock"]),
  external_link: optionalHttp,
  sku: z.string().trim().max(64, "SKU must be 64 characters or fewer."),
});

export function formValue(formData: FormData, key: string) { return String(formData.get(key) ?? ""); }

export function parseStoreForm(formData: FormData) {
  const parsed = storeInputSchema.parse(Object.fromEntries(Object.keys(storeInputSchema.shape).map((key) => [key, formValue(formData, key)])));
  if (parsed.logo_url && !isDemoMode() && !parsed.logo_url.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/store-logos/`)) throw new Error("Use the verified logo uploader instead of an external image URL.");
  return { ...parsed, tagline: cleanOptional(parsed.tagline), about_text: cleanOptional(parsed.about_text), email: cleanOptional(parsed.email), whatsapp_number: cleanOptional(parsed.whatsapp_number), instagram_handle: cleanOptional(parsed.instagram_handle)?.replace(/^@/, "") ?? null, logo_url: cleanOptional(parsed.logo_url) };
}

export function parseProductForm(formData: FormData, defaultCurrency: CurrencyCode) {
  const parsed = productInputSchema.parse({ ...Object.fromEntries(Object.keys(productInputSchema.shape).map((key) => [key, key === "currency" ? formValue(formData, key) || defaultCurrency : formValue(formData, key)])) });
  const imageUrls = formData.getAll("image_urls").map(String).filter(Boolean);
  if (imageUrls.length > 5) throw new Error("Use no more than five images.");
  const publicProductPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/`;
  if (imageUrls.some((url) => !isHttpUrl(url) && !(isDemoMode() && url.startsWith("data:image/")))) throw new Error("Image URLs must be http:// or https://.");
  if (!isDemoMode() && imageUrls.some((url) => !url.startsWith(publicProductPrefix))) throw new Error("Use the verified image uploader instead of an external image URL.");
  return { ...parsed, price: Number(parsed.price.toFixed(2)), description: cleanOptional(parsed.description), category: cleanOptional(parsed.category), external_link: cleanOptional(parsed.external_link), sku: cleanOptional(parsed.sku), image_urls: imageUrls };
}
