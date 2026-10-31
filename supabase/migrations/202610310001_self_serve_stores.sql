-- Self-serve signup: any signed-in user may create their own shop, limited to one.
-- Operators and service-role calls (auth.uid() is null) are exempt.
-- The existing "stores: owner create" policy already restricts inserts to owner_id = auth.uid().
create or replace function public.limit_owner_stores() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_operator() then
    if new.owner_id is distinct from auth.uid() then raise exception 'You can only create a store for yourself'; end if;
    if (select count(*) from public.stores where owner_id = new.owner_id) >= 1 then raise exception 'You already have a shop'; end if;
  end if;
  return new;
end; $$;

drop trigger if exists stores_limit_owner on public.stores;
create trigger stores_limit_owner before insert on public.stores for each row execute function public.limit_owner_stores();
