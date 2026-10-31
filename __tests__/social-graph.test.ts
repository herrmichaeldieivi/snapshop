import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SocialError } from "@/src/lib/social/errors";
import { publishPagePost } from "@/src/lib/social/facebook";
import { graph, MetaApiError } from "@/src/lib/social/graph";
import { publishInstagram } from "@/src/lib/social/instagram";
import { buildAuthUrl, exchangeCode } from "@/src/lib/social/oauth";

type Call = { url: URL; method: string; headers: Record<string, string>; form: URLSearchParams };
const realFetch = globalThis.fetch;
const saved = { ...process.env };

function stub(handler: (call: Call) => unknown, status = 200) {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const call: Call = { url: new URL(String(input)), method: init?.method ?? "GET", headers: (init?.headers ?? {}) as Record<string, string>, form: new URLSearchParams(String(init?.body ?? "")) };
    calls.push(call);
    return new Response(JSON.stringify(handler(call)), { status });
  }) as typeof fetch;
  return calls;
}

beforeEach(() => {
  process.env.META_APP_ID = "app-1";
  process.env.META_APP_SECRET = "secret-1";
  process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example.com";
  delete process.env.META_LOGIN_CONFIG_ID;
  delete process.env.META_GRAPH_VERSION;
  delete process.env.META_SCOPES;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  process.env = { ...saved };
});

describe("graph client", () => {
  it("sends the token as a Bearer header with an app secret proof, never in the URL", async () => {
    const calls = stub(() => ({ id: "1" }));
    await graph({ path: "me", token: "TOKEN123", params: { fields: "id" } });
    const call = calls[0]!;
    expect(call.url.origin + call.url.pathname).toBe("https://graph.facebook.com/v26.0/me");
    expect(call.headers.Authorization).toBe("Bearer TOKEN123");
    expect(call.url.searchParams.get("appsecret_proof")).toMatch(/^[0-9a-f]{64}$/);
    expect(call.url.toString()).not.toContain("TOKEN123");
  });

  it("maps Meta errors, including expired tokens", async () => {
    stub(() => ({ error: { message: "Error validating access token", code: 190 } }), 400);
    const error = await graph({ path: "me", token: "t" }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(MetaApiError);
    expect((error as MetaApiError).needsReconnect).toBe(true);
  });
});

describe("login URL and token exchange", () => {
  it("uses scopes by default and config_id for Facebook Login for Business", () => {
    const classic = new URL(buildAuthUrl("state-1"));
    expect(classic.origin + classic.pathname).toBe("https://www.facebook.com/v26.0/dialog/oauth");
    expect(classic.searchParams.get("redirect_uri")).toBe("https://shop.example.com/api/meta/callback");
    expect(classic.searchParams.get("scope")).toContain("instagram_content_publish");
    process.env.META_LOGIN_CONFIG_ID = "cfg-9";
    const business = new URL(buildAuthUrl("state-1"));
    expect(business.searchParams.get("config_id")).toBe("cfg-9");
    expect(business.searchParams.has("scope")).toBe(false);
  });

  it("trades the code for a long-lived token in two steps", async () => {
    const calls = stub((call) => (call.url.searchParams.get("grant_type") ? { access_token: "LONG", expires_in: 5_184_000 } : { access_token: "SHORT" }));
    const result = await exchangeCode("the-code");
    expect(result.token).toBe("LONG");
    expect(result.expiresAt).not.toBeNull();
    expect(calls[0]!.url.searchParams.get("code")).toBe("the-code");
    expect(calls[1]!.url.searchParams.get("fb_exchange_token")).toBe("SHORT");
  });
});

describe("Instagram publishing", () => {
  const fast = { sleep: async () => {}, pollMs: 0 };

  it("creates a container, waits for it, publishes, and returns the permalink", async () => {
    const calls = stub((call) => {
      if (call.url.pathname.endsWith("/ig-1/media")) return { id: "container-1" };
      if (call.url.pathname.endsWith("/container-1")) return { status_code: "FINISHED" };
      if (call.url.pathname.endsWith("/media_publish")) return { id: "media-1" };
      return { permalink: "https://instagram.com/p/abc/" };
    });
    const result = await publishInstagram("tok", "ig-1", ["https://shop.example.com/media/s/p/0.jpg"], "caption", fast);
    expect(result).toEqual({ externalId: "media-1", permalink: "https://instagram.com/p/abc/" });
    expect(calls[0]!.method).toBe("POST");
    expect(calls[0]!.form.get("image_url")).toBe("https://shop.example.com/media/s/p/0.jpg");
    expect(calls[0]!.form.get("caption")).toBe("caption");
    expect(calls.find((call) => call.url.pathname.endsWith("/media_publish"))!.form.get("creation_id")).toBe("container-1");
  });

  it("keeps polling while Instagram is still processing", async () => {
    let polls = 0;
    stub((call) => {
      if (call.url.pathname.endsWith("/ig-1/media")) return { id: "c" };
      if (call.url.pathname.endsWith("/c")) return { status_code: ++polls < 3 ? "IN_PROGRESS" : "FINISHED" };
      return { id: "m" };
    });
    await publishInstagram("tok", "ig-1", ["https://x/0.jpg"], "c", fast);
    expect(polls).toBe(3);
  });

  it("fails clearly when Instagram rejects the photo, and never publishes", async () => {
    const calls = stub((call) => {
      if (call.url.pathname.endsWith("/ig-1/media")) return { id: "c" };
      return { status_code: "ERROR", status: "Bad image" };
    });
    await expect(publishInstagram("tok", "ig-1", ["https://x/0.jpg"], "c", fast)).rejects.toBeInstanceOf(SocialError);
    expect(calls.some((call) => call.url.pathname.endsWith("/media_publish"))).toBe(false);
  });

  it("builds a carousel from child containers", async () => {
    let child = 0;
    const calls = stub((call) => {
      if (call.url.pathname.endsWith("/ig-1/media")) return { id: call.form.get("media_type") === "CAROUSEL" ? "parent" : `child-${++child}` };
      if (call.url.pathname.endsWith("/media_publish")) return { id: "media-9" };
      if (call.url.pathname.includes("/media-9")) return { permalink: "https://instagram.com/p/z/" };
      return { status_code: "FINISHED" };
    });
    const result = await publishInstagram("tok", "ig-1", ["https://x/0.jpg", "https://x/1.jpg"], "cap", fast);
    expect(result.externalId).toBe("media-9");
    const parent = calls.find((call) => call.form.get("media_type") === "CAROUSEL")!;
    expect(parent.form.get("children")).toBe("child-1,child-2");
    expect(calls.filter((call) => call.form.get("is_carousel_item") === "true")).toHaveLength(2);
  });
});

describe("Facebook Page publishing", () => {
  it("uploads photos unpublished, then attaches them to one feed post", async () => {
    let photo = 0;
    const calls = stub((call) => (call.url.pathname.endsWith("/photos") ? { id: `photo-${++photo}` } : { id: "page_post_1" }));
    const result = await publishPagePost("tok", "page-1", "hello", ["https://x/0.jpg", "https://x/1.jpg"]);
    expect(result).toEqual({ externalId: "page_post_1", permalink: "https://www.facebook.com/page_post_1" });
    expect(calls[0]!.form.get("published")).toBe("false");
    const feed = calls[2]!;
    expect(feed.url.pathname.endsWith("/page-1/feed")).toBe(true);
    expect(feed.form.get("message")).toBe("hello");
    expect(JSON.parse(feed.form.get("attached_media")!)).toEqual([{ media_fbid: "photo-1" }, { media_fbid: "photo-2" }]);
  });
});
