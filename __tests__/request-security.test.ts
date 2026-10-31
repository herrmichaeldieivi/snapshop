import { describe, expect, it } from "vitest";
import { assertTrustedOrigin } from "@/src/lib/request-security";

function headers(values: Record<string, string>): { get(name: string): string | null } { return { get: (name) => values[name.toLowerCase()] ?? null }; }
describe("origin security", () => {
  it("rejects missing and unrelated origins", () => {
    expect(() => assertTrustedOrigin(headers({ host: "shop.test" }))).toThrow("same-origin");
    expect(() => assertTrustedOrigin(headers({ host: "shop.test", origin: "https://attacker.test" }))).toThrow("untrusted");
  });
  it("allows the configured same origin", () => {
    expect(() => assertTrustedOrigin(headers({ host: "shop.test", origin: "https://shop.test" }))).not.toThrow();
    expect(() => assertTrustedOrigin(headers({ host: "localhost:3000", origin: "http://localhost:3000" }))).not.toThrow();
  });
});
