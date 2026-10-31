-- Execute with `supabase test db` after applying the Phase 1 migration.
-- This test creates an owner and non-owner fixture and proves that RLS leaks no draft data.
begin;
select plan(4);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'owner.rls@snapshop.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'reader.rls@snapshop.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

-- The auth-user trigger creates profiles. Keep both fixture identities non-operators.
update public.profiles set is_operator = false where id in ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
insert into public.stores (id, owner_id, slug, name, status) values ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', 'rls-draft-shop', 'RLS Draft Shop', 'draft');
insert into public.products (id, store_id, title, price, currency, image_urls) values ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000100', 'Private product', 12.00, 'USD', '{}');
insert into public.imports (id, store_id, created_by, filename, row_count, error_report, preview_rows) values ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', 'private.csv', 1, '[]', '[]');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.stores where id = '00000000-0000-0000-0000-000000000100'), 0::bigint, 'a non-owner cannot read another owner draft store');
select is((select count(*) from public.products where store_id = '00000000-0000-0000-0000-000000000100'), 0::bigint, 'a non-owner cannot read another owner draft products');
select is((select count(*) from public.imports where store_id = '00000000-0000-0000-0000-000000000100'), 0::bigint, 'a non-owner cannot read another owner imports');
select is((with changed as (update public.products set title = 'Leaked write' where id = '00000000-0000-0000-0000-000000000101' returning id) select count(*) from changed), 0::bigint, 'a non-owner cannot update another owner products');
select * from finish();
rollback;
