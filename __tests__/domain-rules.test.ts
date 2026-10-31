import { describe, expect, it } from "vitest";
import { buildContactLink } from "@/src/lib/order-link";
import { validateSlug } from "@/src/lib/slug";
import { formatPrice } from "@/src/lib/utils";

const product = { title: "Blue & White Mug", price: 28, currency: "USD" as const, availability: "in_stock" as const };
describe("slug rules", () => {
  it("rejects reserved, too-short and unsafe slugs", () => { expect(validateSlug("admin")).toBeTruthy(); expect(validateSlug("ab")).toBeTruthy(); expect(validateSlug("A Store")).toBeTruthy(); expect(validateSlug("good-store")).toBeNull(); });
});
describe("order link builder", () => {
  it("uses WhatsApp first and encodes the full request", () => { const link = buildContactLink({ name: "Juniper", whatsapp_number: "+1 415 555 0198", email: "hello@example.com", instagram_handle: "juniper" }, product); expect(link?.channel).toBe("whatsapp"); expect(link?.href).toContain("wa.me/14155550198"); expect(decodeURIComponent(link?.href || "")).toContain('"Blue & White Mug"'); });
  it("falls back to email then Instagram and labels restock correctly", () => { const email = buildContactLink({ name: "Juniper", whatsapp_number: null, email: "hello@example.com", instagram_handle: "juniper" }, product); const instagram = buildContactLink({ name: "Juniper", whatsapp_number: null, email: null, instagram_handle: "juniper" }, { ...product, availability: "out_of_stock" }); expect(email?.channel).toBe("email"); expect(instagram?.channel).toBe("instagram"); expect(instagram?.label).toBe("Ask about restock"); });
});
describe("currency formatting", () => { it("formats per currency", () => { expect(formatPrice(12.5, "EUR")).toMatch(/12[,.]50/); }); });
