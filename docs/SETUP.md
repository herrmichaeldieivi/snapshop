[← Back to README](../README.md)

# Setup guide

## 1. Create a Supabase project

At <https://supabase.com/dashboard> create a project and note the **Project URL**, **anon key** and **service_role key** (Project Settings, then API Keys).

## 2. Apply the migrations

Apply in order. Either use the CLI:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

or paste each file into the SQL editor:

1. `supabase/migrations/202610200001_phase1_schema.sql`: profiles, stores, products, imports, RLS, storage buckets (`product-images`, `store-logos`), `commit_catalog_import()`.
2. `supabase/migrations/202610210001_lead_magnet_signups.sql`: email opt-in table (insert-only for the public).
3. `supabase/migrations/202610230001_social_sync.sql`: Meta connection and sync tables (no client access).
4. `supabase/migrations/202610310001_self_serve_stores.sql`: lets any signed-in user create one shop of their own (a trigger enforces the limit).

Optional: run the RLS tests with `supabase test db`.

## 3. Configure env

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SITE_URL` (`http://localhost:3000` locally).

## 4. Auth

In Supabase, go to Authentication, then URL Configuration. Set the Site URL and add `http://localhost:3000/auth/callback` plus your production `/auth/callback` to Redirect URLs. Email magic links use Supabase's built-in email, which is rate-limited. Add custom SMTP for production.

## 5. Make yourself operator

Run `pnpm dev`, open `/login`, and sign in with the magic link. Then in the SQL editor:

```sql
update public.profiles set is_operator = true
where id = (select id from auth.users where email = 'you@example.com');
```

Operators can create stores at `/admin/stores/new` and assign an owner by setting `stores.owner_id`.

## 6. Instagram and Facebook sync (optional)

1. Create a Meta app with Facebook Login and the Instagram API.
2. Set the OAuth redirect to `https://<domain>/api/meta/callback`, the deauthorize callback to `.../api/meta/deauthorize`, and the data-deletion URL to `.../api/meta/data-deletion`. Add a privacy policy URL.
3. Set `META_APP_ID`, `META_APP_SECRET`, `TOKEN_ENCRYPTION_KEY` and a public https `NEXT_PUBLIC_SITE_URL`. Meta fetches product photos from that URL.
4. Instagram must be a Business or Creator account linked to a Facebook Page.

Until then the Sync tab runs in preview mode with sample posts and posts nothing.

## Troubleshooting

- **Everything shows sample data**: the Supabase URL or anon key is empty, so demo mode is on.
- **Lead form says "not saved"**: the `lead_magnet_signups` migration has not been applied.
- **Image upload or import fails**: `SUPABASE_SERVICE_ROLE_KEY` is missing, or the storage buckets don't exist (migration 1).
- **Login link redirects to the wrong place**: fix the redirect URLs in step 4.
