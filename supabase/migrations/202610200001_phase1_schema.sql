-- Snap Shop Phase 1 schema. Apply with the Supabase CLI against the target project.
create extension if not exists pgcrypto;

create type public.store_status as enum ('draft', 'published');
create type public.product_availability as enum ('in_stock', 'out_of_stock');
create type public.import_status as enum ('previewed', 'committed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_operator boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$' and slug not in ('admin','login','api','s','sitemap','robots','www','app','static','_next')),
  name text not null check (char_length(name) between 1 and 80),
  tagline text check (char_length(tagline) <= 120),
  about_text text check (char_length(about_text) <= 2000),
  email text,
  whatsapp_number text check (whatsapp_number is null or whatsapp_number ~ '^\+[1-9][0-9]{6,14}$'),
  instagram_handle text check (instagram_handle is null or instagram_handle !~ '@'),
  logo_url text,
  theme_color text not null default '#111111' check (theme_color ~ '^#[0-9A-Fa-f]{6}$'),
  currency char(3) not null default 'USD' check (currency in ('USD','CAD','EUR','GBP')),
  status public.store_status not null default 'draft',
  published_at timestamptz,
  slug_change_count integer not null default 0 check (slug_change_count <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  sku text check (sku is null or char_length(sku) <= 64),
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 2000),
  price numeric(10,2) not null check (price >= 0),
  currency char(3) not null default 'USD' check (currency in ('USD','CAD','EUR','GBP')),
  image_urls text[] not null default '{}'::text[] check (cardinality(image_urls) <= 5),
  image_alt_texts text[] not null default '{}'::text[] check (cardinality(image_alt_texts) <= 5),
  category text check (category is null or char_length(category) <= 60),
  availability public.product_availability not null default 'in_stock',
  sort_order integer not null default 0,
  external_link text check (external_link is null or external_link ~ '^https?://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  filename text not null,
  row_count integer not null check (row_count between 0 and 200),
  imported_count integer not null default 0,
  error_report jsonb not null default '[]'::jsonb,
  preview_rows jsonb not null default '[]'::jsonb,
  status public.import_status not null default 'previewed',
  created_at timestamptz not null default now()
);

create index products_store_id_idx on public.products(store_id);
create index products_store_category_idx on public.products(store_id, category);
create unique index products_store_sku_unique_idx on public.products(store_id, lower(sku)) where sku is not null;
create index products_store_title_idx on public.products(store_id, lower(title));
create index imports_store_id_idx on public.imports(store_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger stores_updated_at before update on public.stores for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();

create or replace function public.guard_store_slug_change() returns trigger language plpgsql as $$
begin
  if new.slug <> old.slug then
    if old.status <> 'draft' or old.slug_change_count >= 1 then raise exception 'A store slug can only be changed once while draft'; end if;
    new.slug_change_count = old.slug_change_count + 1;
  end if;
  if new.status = 'published' and old.status <> 'published' and new.published_at is null then new.published_at = now(); end if;
  if new.status = 'draft' then new.published_at = null; end if;
  if new.owner_id is distinct from old.owner_id and auth.uid() is not null and not public.is_operator() then raise exception 'Store owner cannot be reassigned'; end if;
  return new;
end; $$;
create trigger stores_guard before update on public.stores for each row execute function public.guard_store_slug_change();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id) values (new.id) on conflict (id) do nothing; return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.is_operator() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_operator from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.is_operator() to anon, authenticated;
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.imports enable row level security;

create policy "profiles: read own or operator" on public.profiles for select using (id = auth.uid() or public.is_operator());
create policy "stores: published or owner or operator read" on public.stores for select using (status = 'published' or owner_id = auth.uid() or public.is_operator());
create policy "stores: owner create" on public.stores for insert with check (owner_id = auth.uid() or public.is_operator());
create policy "stores: owner or operator update" on public.stores for update using (owner_id = auth.uid() or public.is_operator()) with check (owner_id = auth.uid() or public.is_operator());
create policy "stores: owner or operator delete" on public.stores for delete using (owner_id = auth.uid() or public.is_operator());
create policy "products: published parent or owner/operator read" on public.products for select using (exists (select 1 from public.stores s where s.id = store_id and (s.status = 'published' or s.owner_id = auth.uid() or public.is_operator())));
create policy "products: owner/operator insert" on public.products for insert with check (exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator())));
create policy "products: owner/operator update" on public.products for update using (exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator()))) with check (exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator())));
create policy "products: owner/operator delete" on public.products for delete using (exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator())));
create policy "imports: owner/operator read" on public.imports for select using (exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator())));
create policy "imports: owner/operator insert" on public.imports for insert with check (created_by = auth.uid() and exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator())));
create policy "imports: owner/operator update" on public.imports for update using (exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator()))) with check (exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator())));

insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('store-logos', 'store-logos', true) on conflict (id) do nothing;
create policy "public product image read" on storage.objects for select using (bucket_id in ('product-images','store-logos'));
create policy "owner product image write" on storage.objects for insert to authenticated with check (bucket_id in ('product-images','store-logos') and (public.is_operator() or (storage.foldername(name))[1] in (select id::text from public.stores where owner_id = auth.uid())));
create policy "owner product image update" on storage.objects for update to authenticated using (bucket_id in ('product-images','store-logos') and (public.is_operator() or (storage.foldername(name))[1] in (select id::text from public.stores where owner_id = auth.uid())));
create policy "owner product image delete" on storage.objects for delete to authenticated using (bucket_id in ('product-images','store-logos') and (public.is_operator() or (storage.foldername(name))[1] in (select id::text from public.stores where owner_id = auth.uid())));

create or replace function public.commit_catalog_import(p_import_id uuid)
returns table(imported_count integer, already_committed boolean)
language plpgsql security definer set search_path = public as $$
declare imported public.imports%rowtype; product_row jsonb; existing_id uuid; total integer := 0;
begin
  select * into imported from public.imports where id = p_import_id for update;
  if not found then raise exception 'Import not found'; end if;
  if not exists (select 1 from public.stores s where s.id = imported.store_id and (s.owner_id = auth.uid() or public.is_operator())) then raise exception 'Not authorized'; end if;
  if imported.status = 'committed' then return query select imported.imported_count, true; return; end if;
  if imported.status <> 'previewed' then raise exception 'Only previewed imports can be committed'; end if;
  for product_row in select value from jsonb_array_elements(imported.preview_rows) loop
    existing_id := null;
    if nullif(product_row->>'sku','') is not null then
      select id into existing_id from public.products where store_id = imported.store_id and lower(sku) = lower(product_row->>'sku') limit 1;
    else
      select id into existing_id from public.products where store_id = imported.store_id and lower(btrim(title)) = lower(btrim(product_row->>'title')) limit 1;
    end if;
    if existing_id is null then
      insert into public.products (store_id, sku, title, description, price, currency, image_urls, category, availability, external_link, sort_order)
      values (imported.store_id, nullif(product_row->>'sku',''), product_row->>'title', nullif(product_row->>'description',''), (product_row->>'price')::numeric, (product_row->>'currency')::char(3), array(select jsonb_array_elements_text(product_row->'image_urls')), nullif(product_row->>'category',''), (product_row->>'availability')::public.product_availability, nullif(product_row->>'external_link',''), coalesce((select max(sort_order) + 1 from public.products where store_id = imported.store_id), 0));
    else
      update public.products set sku = nullif(product_row->>'sku',''), title = product_row->>'title', description = nullif(product_row->>'description',''), price = (product_row->>'price')::numeric, currency = (product_row->>'currency')::char(3), image_urls = array(select jsonb_array_elements_text(product_row->'image_urls')), category = nullif(product_row->>'category',''), availability = (product_row->>'availability')::public.product_availability, external_link = nullif(product_row->>'external_link','') where id = existing_id;
    end if;
    total := total + 1;
  end loop;
  update public.imports set status = 'committed', imported_count = total where id = imported.id;
  return query select total, false;
end; $$;
grant execute on function public.commit_catalog_import(uuid) to authenticated;
