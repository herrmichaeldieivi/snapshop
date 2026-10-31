# Snap Shop

Turn a product list (CSV) or an Instagram handle into a mobile-ready storefront with a shareable link. Customers order by WhatsApp, email or Instagram DM. There is no cart or payment processing.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS** and **Supabase** (Postgres, Auth, Storage).

> Status: working prototype. Typecheck, lint, production build and 92 unit/integration tests pass. See [Known limitations](#known-limitations).

## Features

- **Storefronts**: SSR public pages at `/s/<slug>` and product pages at `/s/<slug>/p/<id>`, with search, category chips and an in-stock filter. Includes SEO metadata, JSON-LD, sitemap and robots.
- **Order by message**: a prefilled message goes out by WhatsApp first, then email, then Instagram.
- **Admin** (`/admin`): store settings, product editor (up to 5 images, ordering, bulk actions), publish/unpublish. Operators see all stores and owners see only their own.
- **CSV import**: upload, validate, preview, then commit in one atomic transaction. Re-importing updates products instead of duplicating them. Export round-trips.
- **Secure image pipeline**: server-side fetch with SSRF protection, EXIF stripping, resize to 1200px, WebP conversion.
- **Instagram and Facebook sync** (optional): import posts as draft products, post products to a Facebook Page or Instagram, and a Meta catalog feed at `/feeds/<slug>/meta.csv`. Tokens are AES-256-GCM encrypted.
- **Lead capture** on the landing page with a honeypot, rate limit and insert-only RLS.
- **Demo mode**: runs with no backend, using sample data.

## Quick start (demo mode, no Supabase needed)

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. Demo mode turns on automatically when the Supabase env vars are empty.

| Route | What it is |
| --- | --- |
| `/` | Landing page |
| `/10-minute-shop` | Setup guide |
| `/demo` | Sample storefront |
| `/admin` | Explorable admin with temporary sample data (resets on restart) |

Requires Node 20+ and pnpm 10 (`corepack enable`).

## Connect Supabase

Full walkthrough: **[docs/SETUP.md](docs/SETUP.md)**. In short:

1. Create a Supabase project.
2. Apply the migrations in `supabase/migrations/` in order.
3. Copy `.env.example` to `.env.local` and fill in the URL, anon key and service-role key.
4. Sign in once, then set your row in `profiles` to `is_operator = true`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | for real backend | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for real backend | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | for images and sync | **Server only. Never expose to the client.** |
| `NEXT_PUBLIC_SITE_URL` | production | Public `https://` origin for canonical URLs, sitemap, and Meta image fetches |
| `TOKEN_ENCRYPTION_KEY` | for Meta sync | `openssl rand -base64 32` |
| `META_APP_ID`, `META_APP_SECRET` | for real Meta sync | Without them the Sync tab runs in preview mode |
| `META_GRAPH_VERSION`, `META_LOGIN_CONFIG_ID`, `META_SCOPES` | optional | Meta tuning |
| `META_MOCK` | optional | Force preview mode |
| `RESEND_API_KEY`, `SENTRY_DSN`, `RATE_LIMIT_STORE` | optional | Reserved, not required to run |

## Scripts

```bash
pnpm dev      # dev server
pnpm check    # typecheck
pnpm lint     # eslint
pnpm test     # vitest
pnpm build    # production build
```

Database RLS tests live in `supabase/tests/` (pgTAP, run with `supabase test db`).

## Project layout

```text
app/                  Routes: public storefront, admin, API route handlers
components/           UI and admin forms
src/lib/              Validation, CSV, image pipeline, security, social sync
src/lib/repository/   Supabase and demo-mode data layers behind one interface
supabase/migrations/  Schema, RLS, storage buckets, RPCs
supabase/tests/       pgTAP RLS tests
docs/                 Setup, architecture, roadmap
__tests__/            Vitest suites
```

## Deploy

Works on Vercel or any Node host. A `Dockerfile` is included (`docker build -t snap-shop . && docker run -p 3000:3000 --env-file .env.local snap-shop`). Set the env vars above, set `NEXT_PUBLIC_SITE_URL`, and add `<site>/auth/callback` to Supabase Auth redirect URLs.

## Known limitations

- Landing page images reference assets that are not in this repo (`/manus-storage/...` and external CDN URLs in `components/brand.tsx`, `app/page.tsx`, `app.config.ts`). Replace them with your own images in `public/`.
- Store creation is operator-only. There is no self-serve signup yet.
- Instagram posting is untested against live Meta and needs a Meta app plus App Review for accounts outside the app's roles.
- Privacy and Terms pages are placeholders. Replace them before accepting real customers.

More in [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## License

[MIT](LICENSE)
