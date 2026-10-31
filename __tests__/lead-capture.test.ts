import { describe, expect, it } from "vitest";
import { parseLeadCapture } from "@/src/lib/lead-capture";

describe("lead capture input", () => {
  it("normalizes email address whitespace and case", () => {
    expect(parseLeadCapture({ email: "  Shop.Owner@Example.COM " })).toMatchObject({ success: true, data: { email: "shop.owner@example.com", website: "" } });
  });
  it("rejects malformed and overlong email addresses", () => {
    expect(parseLeadCapture({ email: "not-an-email" }).success).toBe(false);
    expect(parseLeadCapture({ email: `${"a".repeat(310)}@example.com` }).success).toBe(false);
  });
  it("accepts a honeypot marker so the route can silently avoid writing it", () => {
    expect(parseLeadCapture({ email: "bot@example.com", website: "ignore" })).toMatchObject({ success: true, data: { website: "ignore" } });
  });
});
