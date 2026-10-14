-- The intended email is configured separately by the operator, never by clients.
create table desvio_private.admin_bootstrap (
 singleton boolean primary key default true check(singleton),
 email text not null, claimed_by uuid references auth.users(id)
);
alter table desvio_private.admin_bootstrap enable row level security;
revoke all on desvio_private.admin_bootstrap from public,anon,authenticated;
create function desvio_private.claim_initial_admin() returns trigger language plpgsql security definer set search_path='' as $$
declare target desvio_private.admin_bootstrap; begin
 -- Auth owns email verification. Never trust user_metadata or a client supplied role.
 if new.email_confirmed_at is null then return new; end if;
 select * into target from desvio_private.admin_bootstrap where singleton=true for update;
 if target.claimed_by is null and lower(new.email)=lower(target.email) then
  insert into public.desvio_memberships(user_id,role) values(new.id,'admin') on conflict(user_id) do nothing;
  update desvio_private.admin_bootstrap set claimed_by=new.id where singleton=true;
 end if;
 return new;
end $$;
revoke all on function desvio_private.claim_initial_admin() from public,anon,authenticated;
create trigger desvio_initial_admin after insert or update of email_confirmed_at,email on auth.users
for each row execute function desvio_private.claim_initial_admin();
