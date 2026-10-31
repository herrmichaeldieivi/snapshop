-- Run after 202610230001_social_sync.sql with `supabase test db`.
-- Meta tokens and the posting ledger must be unreachable from the browser: only the server's service role may touch them.
begin;
select plan(12);
select ok(not has_table_privilege('anon', 'public.social_connections', 'SELECT'), 'anon cannot read Meta connections (tokens)');
select ok(not has_table_privilege('authenticated', 'public.social_connections', 'SELECT'), 'signed-in users cannot read Meta connections (tokens)');
select ok(not has_table_privilege('authenticated', 'public.social_connections', 'INSERT'), 'signed-in users cannot write Meta connections');
select ok(not has_table_privilege('authenticated', 'public.social_connections', 'UPDATE'), 'signed-in users cannot alter Meta connections');
select ok(not has_table_privilege('authenticated', 'public.social_connections', 'DELETE'), 'signed-in users cannot delete Meta connections');
select ok(not has_table_privilege('anon', 'public.channel_posts', 'SELECT'), 'anon cannot read the posting ledger');
select ok(not has_table_privilege('authenticated', 'public.channel_posts', 'SELECT'), 'signed-in users cannot read the posting ledger');
select ok(not has_table_privilege('authenticated', 'public.channel_posts', 'INSERT'), 'signed-in users cannot forge ledger rows');
select ok((select relrowsecurity from pg_class where oid = 'public.social_connections'::regclass), 'RLS is enabled on social_connections');
select ok((select relrowsecurity from pg_class where oid = 'public.channel_posts'::regclass), 'RLS is enabled on channel_posts');
select is((select count(*)::int from pg_policies where tablename in ('social_connections', 'channel_posts')), 0, 'no policies grant client access to either table');
select has_index('public', 'products', 'products_store_external_uidx', 'one product per Instagram post per store');
select * from finish();
rollback;
