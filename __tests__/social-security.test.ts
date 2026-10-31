import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { pickCandidate } from "@/src/lib/social/connect";
import { isPublicHttpsOrigin } from "@/src/lib/social/config";
import { decryptSecret, encryptSecret, signValue, verifySigned } from "@/src/lib/social/crypto";
import { nameFromHandle, parseHandle, slugFromHandle } from "@/src/lib/social/handle";
import { createOauthState, parseSignedRequest, readOauthState } from "@/src/lib/social/oauth";

describe("token encryption", () => {
  it("round-trips and never repeats a ciphertext", () => {
    const a = encryptSecret("EAAB-secret-token");
    expect(a).not.toContain("secret");
    expect(decryptSecret(a)).toBe("EAAB-secret-token");
    expect(encryptSecret("EAAB-secret-token")).not.toBe(a);
  });
  it("rejects tampering", () => {
    const parts = encryptSecret("abc").split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptSecret(parts.join("."))).toThrow();
    expect(() => decryptSecret("garbage")).toThrow();
  });
  it("signs values and detects changes", () => {
    const signed = signValue("t", "hello");
    expect(verifySigned("t", signed)).toBe("hello");
    expect(verifySigned("other", signed)).toBeNull();
    expect(verifySigned("t", signed.replace("hello", "jello"))).toBeNull();
  });
});

describe("OAuth state", () => {
  it("accepts a fresh state with the matching browser nonce", () => {
    const { state, nonce } = createOauthState("store-1");
    expect(readOauthState(state, nonce)).toEqual({ storeId: "store-1" });
  });
  it("rejects a missing or different nonce (login CSRF)", () => {
    const { state } = createOauthState("store-1");
    expect(readOauthState(state, undefined)).toBeNull();
    expect(readOauthState(state, "someone-elses-nonce")).toBeNull();
  });
  it("rejects expired and forged states", () => {
    const { state, nonce } = createOauthState("store-1");
    expect(readOauthState(state, nonce, Date.now() + 11 * 60_000)).toBeNull();
    const [payload, signature] = [state.slice(0, state.lastIndexOf(".")), state.slice(state.lastIndexOf(".") + 1)];
    const forged = Buffer.from(JSON.stringify({ s: "other-store", n: nonce, t: Date.now() })).toString("base64url");
    expect(readOauthState(`${forged}.${signature}`, nonce)).toBeNull();
    expect(payload.length).toBeGreaterThan(0);
  });
});

describe("Meta signed_request", () => {
  const secret = "app-secret";
  const make = (data: object, key = secret) => {
    const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
    return `${createHmac("sha256", key).update(payload).digest("base64url")}.${payload}`;
  };
  it("verifies a genuine request", () => {
    expect(parseSignedRequest(make({ algorithm: "HMAC-SHA256", user_id: "123" }), secret)?.user_id).toBe("123");
  });
  it("rejects a wrong signature, wrong algorithm or empty secret", () => {
    expect(parseSignedRequest(make({ user_id: "1" }, "other"), secret)).toBeNull();
    expect(parseSignedRequest(make({ algorithm: "HMAC-SHA1", user_id: "1" }), secret)).toBeNull();
    expect(parseSignedRequest(make({ user_id: "1" }), "")).toBeNull();
    expect(parseSignedRequest("nodots", secret)).toBeNull();
  });
});

describe("handles", () => {
  it.each([["@Juniper.Studio", "juniper.studio"], ["juniper_studio", "juniper_studio"], ["https://www.instagram.com/juniperstudio/?hl=en", "juniperstudio"], ["instagram.com/ab", "ab"]])("parses %s", (input, expected) => {
    expect(parseHandle(input)).toBe(expected);
  });
  it.each(["", "   ", "has space", "bad!char", "x".repeat(31), "https://instagram.com/p/ABC123/", "https://instagram.com/reel/xyz", "trailing."])("rejects %j", (input) => {
    expect(parseHandle(input)).toBeNull();
  });
  it("derives a slug and name", () => {
    expect(slugFromHandle("juniper.studio_co")).toBe("juniper-studio-co");
    expect(nameFromHandle("juniper.studio_co")).toBe("Juniper Studio Co");
  });
});

describe("account auto-selection", () => {
  const a = { page_id: "1", page_name: "A", ig_user_id: "10", ig_username: "shop_a" };
  const b = { page_id: "2", page_name: "B", ig_user_id: "20", ig_username: "Shop_B" };
  it("matches the store handle case-insensitively", () => {
    expect(pickCandidate([a, b], "shop_b")).toBe(b);
  });
  it("won't guess when nothing or several match", () => {
    expect(pickCandidate([a, b], "other")).toBeNull();
    expect(pickCandidate([a, { ...b, ig_username: "shop_a" }], "shop_a")).toBeNull();
    expect(pickCandidate([a, b], null)).toBeNull();
  });
  it("takes the only account when the store has no handle yet", () => {
    expect(pickCandidate([a], null)).toBe(a);
  });
});

describe("public origin check", () => {
  it("accepts public https only", () => {
    expect(isPublicHttpsOrigin("https://shop.example.com")).toBe(true);
    for (const bad of ["http://shop.example.com", "https://localhost:3000", "https://192.168.1.4", "https://10.0.0.2", "https://172.20.1.1", "not a url", ""]) expect(isPublicHttpsOrigin(bad)).toBe(false);
    expect(isPublicHttpsOrigin(null)).toBe(false);
  });
});
