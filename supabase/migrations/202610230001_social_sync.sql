-- Instagram / Facebook sync: where each product came from, the (encrypted) Meta connection per store,
-- and a ledger of what has been posted where.

alter table public.products
  add column if not exists external_source text check (external_source is null or external_source in ('instagram')),
  add column if not exists external_id text check (external_id is null or char_length(external_id) between 1 and 64);

-- One product per Instagram post per store, so re-importing never duplicates or overwrites edits.
create unique index if not exists products_store_external_uidx
  on public.products (store_id, external_source, external_id)
  where external_id is not null;

create table if not exists public.social_connections (
  store_id uuid primary key references public.stores(id) on delete cascade,
  status text not null check (status in ('pending', 'active', 'needs_reconnect')),
  fb_user_id text,
  page_id text,
  page_name text,
  ig_user_id text,
  ig_username text,
  -- AES-256-GCM ciphertext produced by the app (TOKEN_ENCRYPTION_KEY). Never readable by anon/authenticated.
  access_token_enc text,
  candidates jsonb not null default '[]'::jsonb,
  scopes text[] not null default '{}'::text[],
  token_expires_at timestamptz,
  simulated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_connections_fb_user_idx on public.social_connections (fb_user_id);

create table if not exists public.channel_posts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  channel text not null check (channel in ('instagram', 'facebook')),
  status text not null check (status in ('source', 'live', 'failed', 'simulated')),
  external_id text,
  permalink text check (permalink is null or permalink ~ '^https://'),
  content_hash text,
  error text check (error is null or char_length(error) <= 500),
  posted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (product_id, channel)
);

create index if not exists channel_posts_store_idx on public.channel_posts (store_id);

alter table public.social_connections enable row level security;
alter table public.channel_posts enable row level security;

-- No policies and no grants: only the server (service role), after it has checked store access, can read or write.
revoke all on table public.social_connections from public, anon, authenticated;
revoke all on table public.channel_posts from public, anon, authenticated;

drop trigger if exists social_connections_set_updated_at on public.social_connections;
create trigger social_connections_set_updated_at before update on public.social_connections
  for each row execute function public.set_updated_at();

drop trigger if exists channel_posts_set_updated_at on public.channel_posts;
create trigger channel_posts_set_updated_at before update on public.channel_posts
  for each row execute function public.set_updated_at();
