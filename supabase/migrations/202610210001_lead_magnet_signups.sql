-- Minimal landing-page lead capture for delivery of the requested free guide.
-- Public visitors may INSERT only. No public role may read, update, or delete opt-ins.
create table if not exists public.lead_magnet_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 320 and email = btrim(email)),
  source text not null default 'landing_page' check (source = 'landing_page'),
  created_at timestamptz not null default now()
);

create unique index if not exists lead_magnet_signups_email_lower_uidx
  on public.lead_magnet_signups (lower(email));
create index if not exists lead_magnet_signups_created_at_idx
  on public.lead_magnet_signups (created_at desc);

alter table public.lead_magnet_signups enable row level security;
revoke all on table public.lead_magnet_signups from public, anon, authenticated;
grant insert (email, source) on table public.lead_magnet_signups to anon, authenticated;

drop policy if exists "lead magnet: public may add opt-in" on public.lead_magnet_signups;
create policy "lead magnet: public may add opt-in"
  on public.lead_magnet_signups for insert to anon, authenticated
  with check (
    email = btrim(email)
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and source = 'landing_page'
  );
