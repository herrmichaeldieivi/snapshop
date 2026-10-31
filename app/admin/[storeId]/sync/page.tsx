import Link from "next/link";
import { headers } from "next/headers";
import { AlertTriangle, CheckCircle2, Circle, Plug } from "lucide-react";
import { CopyField } from "@/components/copy-field";
import { InstagramImporter } from "@/components/instagram-importer";
import { SyncTable, type SyncCell, type SyncRow } from "@/components/sync-table";
import { requireStoreAccess } from "@/src/lib/access";
import { getRepository } from "@/src/lib/repository";
import { contentHash } from "@/src/lib/social/caption";
import { isPublicHttpsOrigin, metaMode, siteOrigin } from "@/src/lib/social/config";
import { publicConnection, REQUIRED_PUBLISH_SCOPES } from "@/src/lib/social/service";
import type { ChannelPost, Product, SocialChannel, StoredSocialConnection } from "@/src/lib/types";
import { formatPrice } from "@/src/lib/utils";
import { disconnectAction, selectAccountAction } from "./actions";

export const metadata = { title: "Sync" };

const NOTICES: Record<string, string> = {
  unconfigured: "Meta isn’t configured on this server yet. Add META_APP_ID and META_APP_SECRET (see README → Instagram & Facebook sync).",
  denied: "Meta sign-in was cancelled, or some permissions were declined. Try again and accept everything that’s requested.",
  nopages: "No Facebook Page with a linked Instagram professional account was found for that login. Link the Instagram account to a Page you manage, then retry.",
  generic: "Something went wrong while connecting. Try again.",
};

function requestOrigin() {
  const list = headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (/^(localhost|127\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function SyncPage({ params, searchParams }: { params: { storeId: string }; searchParams: { error?: string; connected?: string; welcome?: string; disconnected?: string } }) {
  const { store } = await requireStoreAccess(params.storeId);
  const repository = getRepository();
  const products = await repository.listProducts(store.id);
  const origin = requestOrigin();
  const mode = metaMode();

  let stored: StoredSocialConnection | null = null;
  let posts: ChannelPost[] = [];
  let loadError: string | null = null;
  try {
    [stored, posts] = await Promise.all([repository.getSocialConnection(store.id), repository.listChannelPosts(store.id)]);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Couldn’t load sync data.";
  }
  const connection = publicConnection(stored);
  const active = connection?.status === "active";
  const published = store.status === "published";
  const site = siteOrigin(origin) ?? origin;
  const redirectUri = `${site}/api/meta/callback`;

  const ledger = new Map(posts.map((post) => [`${post.product_id}:${post.channel}`, post]));
  const cellFor = (product: Product, channel: SocialChannel): SyncCell => {
    const post = ledger.get(`${product.id}:${channel}`);
    if (!post) return { status: "none" };
    return { status: post.status, permalink: post.permalink, error: post.error, stale: post.status === "live" && Boolean(post.content_hash) && post.content_hash !== contentHash(product) };
  };
  const rows: SyncRow[] = products.map((product) => ({
    id: product.id,
    title: product.title,
    price: formatPrice(product.price, product.currency),
    needsPrice: !(product.price > 0),
    hasImage: product.image_urls.length > 0,
    instagram: cellFor(product, "instagram"),
    facebook: cellFor(product, "facebook"),
  }));

  const needsPrice = rows.filter((row) => row.needsPrice).length;
  const feedable = products.filter((product) => product.image_urls.length > 0 && product.price > 0).length;
  const feedUrl = `${site}/feeds/${store.slug}/meta.csv`;
  const missingScopes = connection && !connection.simulated ? REQUIRED_PUBLISH_SCOPES.filter((scope) => !connection.scopes.includes(scope)) : [];
  const notice = searchParams.error ? NOTICES[searchParams.error] : null;

  const steps: { label: string; done: boolean; href?: string; hint?: string }[] = [
    { label: "Connect Instagram & Facebook", done: active },
    { label: "Import your posts as products", done: products.length > 0 },
    { label: "Check prices", done: products.length > 0 && needsPrice === 0, hint: needsPrice ? `${needsPrice} need a price` : undefined, href: `/admin/${store.id}/products` },
    { label: "Publish your store", done: published, href: `/admin/${store.id}/settings` },
    { label: "Cross-post to Facebook", done: rows.some((row) => row.facebook.status === "live" || row.facebook.status === "simulated") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">{store.name}</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Sync</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">Pull your Instagram posts in as products, then keep your Facebook Page and catalog in step with the website.</p>
      </div>

      {searchParams.error === "exchange" && (
        <p role="alert" className="rounded-xl border border-brand-line bg-brand-soft/70 px-4 py-3 text-sm leading-6 text-[#703629]">
          Meta rejected the sign-in. Usual causes: the redirect URI in your Meta app isn’t exactly <code className="font-mono text-xs">{redirectUri}</code>, the app secret is wrong, or you don’t have a role on the Meta app while it’s in development mode.
        </p>
      )}
      {notice && <p role="alert" className="rounded-xl border border-brand-line bg-brand-soft/70 px-4 py-3 text-sm text-[#703629]">{notice}</p>}
      {searchParams.connected && <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">Connected.</p>}
      {searchParams.disconnected && <p className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-neutral-700">Disconnected. Products you imported stay in your store.</p>}
      {loadError && <p role="alert" className="rounded-xl border border-brand-line bg-brand-soft/70 px-4 py-3 text-sm text-[#703629]">Sync data isn’t available: {loadError}. Check that migration 202610230001_social_sync.sql has been applied and SUPABASE_SERVICE_ROLE_KEY is set.</p>}
      {mode === "mock" && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>Preview mode.</strong> You’re working with sample Instagram posts, and nothing is ever posted to Instagram or Facebook. Add META_APP_ID and META_APP_SECRET to connect real accounts.</p>}
      {mode === "live" && !isPublicHttpsOrigin(site) && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Importing works, but posting won’t: Meta must fetch your photos from a public https:// address. Set NEXT_PUBLIC_SITE_URL to your deployed URL (or tunnel localhost).</p>}

      <section className="card p-5" aria-label="Launch checklist">
        <h2 className="text-xl font-black tracking-[-0.04em]">{searchParams.welcome ? "Your draft store is ready — let’s fill it" : "Launch checklist"}</h2>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-2.5 text-sm">
              {step.done ? <CheckCircle2 size={18} className="shrink-0 text-green-700" aria-label="Done" /> : <Circle size={18} className="shrink-0 text-neutral-300" aria-label="To do" />}
              {step.href && !step.done ? <Link href={step.href} className="font-bold underline">{step.label}</Link> : <span className={step.done ? "text-neutral-500" : "font-bold"}>{step.label}</span>}
              {step.hint && <span className="text-xs text-amber-800">· {step.hint}</span>}
            </li>
          ))}
        </ol>
      </section>

      <section className="card p-5" aria-labelledby="connection-title">
        <h2 id="connection-title" className="flex items-center gap-2 text-xl font-black tracking-[-0.04em]"><Plug size={19} />Instagram & Facebook</h2>

        {(!connection || connection.status === "needs_reconnect") && (
          <div className="mt-3 space-y-3">
            {connection?.status === "needs_reconnect" && <p className="flex items-center gap-2 text-sm font-bold text-amber-800"><AlertTriangle size={16} />The connection expired or was revoked. Reconnect to keep syncing.</p>}
            <p className="text-sm leading-6 text-neutral-600">
              Connect with the Facebook login that manages {store.instagram_handle ? <strong>@{store.instagram_handle}</strong> : "the shop’s Instagram account"}. It needs to be an Instagram <strong>Business or Creator</strong> account linked to a Facebook Page — personal accounts can’t be connected.
            </p>
            {/* A plain anchor, not <Link>: this is a server redirect off to Meta, which client-side navigation can't follow. */}
            <a href={`/api/meta/connect?store_id=${store.id}`} className="button-primary">{connection ? "Reconnect" : mode === "mock" ? "Connect (preview)" : "Connect Instagram & Facebook"}</a>
          </div>
        )}

        {connection?.status === "pending" && (
          <form action={selectAccountAction} className="mt-3 space-y-3">
            <input type="hidden" name="store_id" value={store.id} />
            <p className="text-sm text-neutral-600">{store.instagram_handle ? <>None of your accounts matched <strong>@{store.instagram_handle}</strong> exactly.</> : null} Choose which Page and Instagram account this store should use:</p>
            <div className="space-y-2">
              {connection.candidates.map((candidate, index) => (
                <label key={candidate.page_id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3.5 py-3 text-sm">
                  <input type="radio" name="page_id" value={candidate.page_id} defaultChecked={index === 0} className="accent-[#b84a35]" />
                  <span><strong>{candidate.page_name}</strong><span className="block text-xs text-neutral-500">{candidate.ig_username ? `Instagram @${candidate.ig_username}` : "No Instagram account linked — Facebook only"}</span></span>
                </label>
              ))}
            </div>
            <button className="button-primary" type="submit">Use this account</button>
          </form>
        )}

        {active && connection && (
          <div className="mt-3 space-y-3">
            <p className="text-sm">
              <strong>{connection.ig_username ? `@${connection.ig_username}` : "No Instagram linked"}</strong> · {connection.page_name}
              {connection.simulated && <span className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Preview</span>}
            </p>
            {missingScopes.length > 0 && <p className="text-sm text-amber-800">Missing permissions: {missingScopes.join(", ")}. Reconnect and accept them to enable posting.</p>}
            <form action={disconnectAction}><input type="hidden" name="store_id" value={store.id} /><button className="button-secondary min-h-9 text-xs" type="submit">Disconnect</button></form>
          </div>
        )}
      </section>

      {active && connection?.ig_user_id && <InstagramImporter storeId={store.id} username={connection.ig_username} simulated={connection.simulated} />}

      <SyncTable storeId={store.id} published={published} ready={{ instagram: active && Boolean(connection?.ig_user_id), facebook: active && Boolean(connection?.page_id) }} rows={rows} />

      <section className="card p-5" aria-labelledby="feed-title">
        <h2 id="feed-title" className="text-xl font-black tracking-[-0.04em]">Facebook & Instagram Shop catalog</h2>
        {published ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm leading-6 text-neutral-600">A product feed Meta can fetch on a schedule — no app review needed. In Commerce Manager choose <strong>Catalog → Data sources → Add items → Scheduled feed</strong> and paste this link. Shoppers who tap a tagged product land on your storefront to order. {feedable} of {products.length} products are eligible{products.length - feedable > 0 ? ` (the rest need a photo and a price)` : ""}.</p>
            <CopyField value={feedUrl} label="Catalog feed URL" />
          </div>
        ) : (
          <p className="mt-2 text-sm text-neutral-600">Publish your store to turn on the catalog feed.</p>
        )}
      </section>
    </div>
  );
}
