import { describe, expect, it } from "vitest";
import { assertSafeImageUrl, isBlockedAddress } from "@/src/lib/image-security";

describe("image SSRF protection", () => {
  it("blocks loopback and private IPv4 targets", async () => {
    await expect(assertSafeImageUrl("http://127.0.0.1/private.png")).rejects.toThrow("private address");
    await expect(assertSafeImageUrl("http://10.0.0.5/private.png")).rejects.toThrow("private address");
  });
  it("blocks metadata hosts before DNS resolution", async () => {
    await expect(assertSafeImageUrl("http://metadata.google.internal/computeMetadata/v1/")).rejects.toThrow("private address");
    await expect(assertSafeImageUrl("http://localhost/image.png")).rejects.toThrow("private address");
  });
  it("blocks non-global IPv6 and mapped private network addresses", () => {
    ["::", "::1", "fe80::1", "fc00::1", "::ffff:10.0.0.1", "ff02::1"].forEach((address) => expect(isBlockedAddress(address)).toBe(true));
  });
});
