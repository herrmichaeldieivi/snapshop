export type AnalyticsEvent =
  | { name: "storefront_view"; store_slug: string }
  | { name: "product_view"; store_slug: string; product_id: string }
  | { name: "order_click"; store_slug: string; product_id: string; channel: "whatsapp" | "email" | "instagram" }
  | { name: "import_committed"; store_slug: string; imported_count: number; error_count: number };

export async function track(event: AnalyticsEvent) {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(event), keepalive: true });
  } catch {
    // Analytics must never interrupt shopping.
  }
}
