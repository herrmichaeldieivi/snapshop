-- Run after 202610210001_lead_magnet_signups.sql with `supabase test db`.
begin;
select plan(6);
select ok(has_any_column_privilege('anon', 'public.lead_magnet_signups', 'INSERT'), 'anonymous visitors may submit a guide request');
select ok(has_any_column_privilege('authenticated', 'public.lead_magnet_signups', 'INSERT'), 'authenticated visitors may submit a guide request');
select ok(not has_table_privilege('anon', 'public.lead_magnet_signups', 'SELECT'), 'anonymous visitors cannot read lead emails');
select ok(not has_table_privilege('anon', 'public.lead_magnet_signups', 'UPDATE'), 'anonymous visitors cannot alter lead emails');
select ok(not has_table_privilege('anon', 'public.lead_magnet_signups', 'DELETE'), 'anonymous visitors cannot delete lead emails');
select ok(not has_table_privilege('authenticated', 'public.lead_magnet_signups', 'SELECT'), 'authenticated visitors cannot read lead emails');
select * from finish();
rollback;
