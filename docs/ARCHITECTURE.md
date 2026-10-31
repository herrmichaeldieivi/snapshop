[← Back to README](../README.md)

# Snap Shop — Phase 1 Plan

## Delivery direction

This build prioritizes working product flows over visual embellishment. It implements the Phase 1 CSV-to-storefront experience as a Next.js 14+ App Router application with TypeScript, Tailwind CSS, Supabase adapters, server-side mutations, and an explicit local/demo data mode when Supabase variables have not yet been configured. The fallback is deliberately constrained to local development/demo data; it never grants a production-style session or bypasses authorization in a configured Supabase environment.

The scope is Phase 1 only. Instagram account connection, checkout, carts, payments, custom domains, inventory synchronisation, multilingual support, and team accounts are intentionally not implemented.

## Architecture

- **Framework:** Next.js App Router with server-rendered public store and product routes. Route handlers serve the sitemap, robots document, CSV export/template, import operations, and image fetch/upload pipeline.
- **Data boundary:** `src/lib/repository` exposes a typed store/product/import repository. `supabase-repository.ts` calls Supabase through browser, server, and service-role clients only where appropriate; `demo-repository.ts` supplies seeded data when no Supabase URL/anon key exist. All server mutations validate origin, authentication, role, ownership, and input before touching data.
- **Auth:** Supabase magic-link helper, login request page, and callback exchange. Admin layouts resolve the session server-side and permit an operator across stores or an owner only for the linked store. Demo mode exposes a clearly labelled local workspace solely to make the disconnected build explorable.
- **Data layer:** Versioned SQL migration defines `profiles`, `stores`, `products`, `imports`, custom enums, checks, indexes, update timestamps, RLS activation/policies, a draft-only slug-change trigger, and import transaction RPC. SQL test scripts prove a non-owner cannot select another store’s draft/store products.
- **Admin:** Server-first forms and progressively enhanced client controls cover settings, publication, products, selected bulk updates/deletion, ordering, image management, CSV validation/preview/commit/history, and product CSV export.
- **CSV pipeline:** Papa Parse normalizes UTF-8 BOM, headers and delimiter; a shared validator creates precise row errors/warnings. Preview persists a `previewed` import with no product mutations. Commit runs in an atomic RPC transaction and treats a committed import as idempotent. Image fetching runs on the server, blocks private-network targets, caps content type/size/time, processes successfully fetched images into WebP via Sharp, and records image failures as warnings without rejecting product rows.
- **Public experience:** `/s/[slug]` and `/s/[slug]/p/[productId]` are server components with searchable/filterable, keyboard-accessible client controls only where needed. The actual catalogue, contacts, product links, structured data, metadata and 404 are present server-side.
- **SEO and performance:** Route-specific metadata includes canonical/OG/Twitter values only when `NEXT_PUBLIC_SITE_URL` is set. Published stores/products feed the sitemap. Image components use responsive sizing and lazy loading. Writes call `revalidatePath` for affected public/admin routes.
- **Observability and privacy:** A tiny analytics abstraction emits only the specified non-personal event names and safe dimensions. Error rendering uses plain language; secrets, email addresses, phone numbers and tokens are not logged.

## Project structure

```text
app/                         App Router pages, layouts, API/route handlers
app/admin/                   Auth-gated owner/operator administrative views
app/s/[slug]/                Public SSR storefront and product detail pages
components/                  Shared UI, admin forms, storefront controls
src/lib/                     Validation, CSV parser, order-link builder, auth, metadata
src/lib/repository/          Typed Supabase and local-demo data implementations
supabase/migrations/         Versioned Postgres schema, RLS policies, RPCs/triggers
supabase/tests/              SQL RLS acceptance test
public/                      Route manifest, template CSV, lightweight brand assets
__tests__/                   Unit and integration-oriented application tests
```

## User experience and design direction

Three intentionally low-probability candidate aesthetics considered: **Swiss retail utility** (0.06), **soft farmers-market editorial** (0.04), and **technical catalog system** (0.03). The build adopts **Swiss retail utility** because it makes dense admin work and short mobile purchase paths effortless before it adds decoration.

- **Design movement:** A warm, restrained adaptation of Swiss editorial retail interfaces—strong type, decisive dividers, and obvious hierarchy.
- **Core principles:** Make status visible; put the next task in reach; keep customer-facing product browsing visually calm; favor real content over ornamental surfaces.
- **Color philosophy:** Ink and warm-paper neutrals let each store’s chosen theme color function as an intentional sales signal rather than a platform brand takeover. The Snap Shop accent is a saturated cobalt used for system actions and focus states.
- **Layout paradigm:** The admin uses a slim task rail and wide work canvas; storefronts use an asymmetric story header leading into a responsive catalogue rather than a generic centered dashboard.
- **Signature elements:** Monospaced status capsules, thumbnail contact sheets, and a product-count “catalogue strip” lend an operational identity across surfaces.
- **Interaction philosophy:** Controls answer with direct state changes, explicit save results, native links for contacting a shop, and no hidden autosave.
- **Animation:** Minimal 150–200ms opacity/transform transitions, disabled under `prefers-reduced-motion`; no motion is required to understand a state change.
- **Typography system:** Instrument Sans for UI and headings with a quiet system sans fallback; compact, uppercase metadata contrasts with generous product names.
- **Brand essence:** “A real, shareable shop for businesses who already sell in conversation.” Clear, capable, hospitable.
- **Brand voice:** Direct and merchant-aware: “Turn a spreadsheet into a storefront.” “Your catalogue is live. Send the link where customers already talk to you.”
- **Wordmark and logo:** A compact `SNAP / SHOP` stacked wordmark with the slash treated as an upload-to-link line; a small cobalt tile is used in product branding.
- **Signature brand color:** Snap Cobalt (`#3155E7`).

## Material constraints and integrations

`.env.example` will enumerate `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `SENTRY_DSN`, and `RATE_LIMIT_STORE` with empty values. The Supabase project, Resend SMTP settings, Sentry DSN, Vercel Analytics/Plausible account and Vercel deployment credentials are deployment configuration—not values that will be embedded in the repository. The production environment must supply them before production data, email delivery, public storage, or error monitoring is enabled.

## Completion boundary

The working application will include the Phase 1 schema/migrations, typed functionality, UI flows, sample storefront data, automated tests, and deployment-ready configuration. Connecting a real Supabase project, configuring Resend/Sentry/analytics/Vercel, applying migrations, and seeding a public account with explicit permission remain environment-dependent release steps until credentials and legal-entity details are supplied.


## Phase 2 — landing page and 10-minute shop lead magnet

This Phase 2 delivery focuses on the user's explicit request: a conversion-oriented Snap Shop landing page with the promise “Get your Instagram-inspired e-commerce store in 10 minutes,” plus a useful, clearly named free launch guide and a real email opt-in pathway. It does not silently expand into Instagram OAuth/API integration or the previously deferred commerce features.

- **Landing page:** Replace the Phase 1 utility hero with a persuasive, responsive product landing page. Lead with the 10-minute outcome, explain the CSV-to-shareable-store workflow, show the product in a storefront/admin preview visual constructed from existing UI components, add concise benefits/how-it-works, and repeat one primary free-kit CTA. Keep login and demo entry secondary. Reuse the established warm-paper, ink, cobalt visual language and accessibility rules.
- **Lead magnet:** Publish a practical `/10-minute-shop` launch guide with a minute-by-minute checklist, photo/copy/product-list prep, a first-catalogue template link, and direct paths into the demo. Provide an accessible email opt-in form on the landing page; upon success, present an immediate link to the guide. Do not claim the guide is emailed unless a real sender is configured.
- **Lead data:** Add an additive Supabase migration for a minimal `lead_magnet_signups` table containing normalized-unique email, source and timestamp. Enable RLS, revoke read/update/delete access from public roles, grant only the insert columns needed to anonymous/authenticated visitors, validate input on the server, require a trusted Origin, use a honeypot and bounded rate limit, and treat duplicate opt-in as successful without revealing existing membership. No service-role key or marketing consent is required for delivery of the requested guide.
- **Disconnected mode:** Do not simulate successful persistence. If the server lacks configured Supabase credentials, clearly tell visitors that signup is preview-only and let them open the guide directly. Supabase signup becomes durable only after the project credentials and additive migration are configured/applied.
- **Project structure:** Extend `app/page.tsx`, add `components/lead-magnet-form.tsx`, add `app/10-minute-shop/page.tsx` and `app/api/leads/route.ts`, add the Supabase SQL migration and focused lead-validation tests, and keep route manifest/readme synchronized.


## Brand refresh — October 2026

The Phase 2 visual refresh keeps the existing Snap Shop name and sales promise, but replaces the generic blue utility look with a distinctive friendly-maker identity. The chosen direction is warm indie-retail editorial: oat paper, ink, maker terracotta (#B84A35), and an evergreen support tone; terracotta is reserved for important actions, not used as a flood of decoration. A storefront-awning symbol and lowercase `snap.shop` wordmark establish a recognizable signature. Editorial maker-product imagery supports the landing page while native storefront previews remain available as actual product UI. Admin remains clear and task-first, with demo status always explicit. Brand voice is warm, practical and a little playful: “Your products. One good link.” and “Set up between conversations.” Main nav and empty states prioritize the next useful action; demo and live-login paths are clearly differentiated, reduced-motion and accessible focus/contrast rules remain in force.
