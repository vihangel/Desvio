-- Incremental: artist accounts, artist profile photos and artist-scoped editing.
-- An artist account is linked by the curators to one artist. It can edit the
-- rooms that list that artist and the works placed in them; works it saves go
-- back to draft and are flagged for the curators ("reviewRequested").

create table public.desvio_artist_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 artist_id uuid not null,
 email text not null,
 created_at timestamptz not null default now()
);
alter table public.desvio_artist_accounts enable row level security;
revoke all on public.desvio_artist_accounts from anon, authenticated;

-- Curator membership wins over an artist link for the same user.
create function desvio_private.current_artist() returns uuid language sql stable security definer set search_path='' as $$
 select a.artist_id from public.desvio_artist_accounts a
 where auth.uid() is not null and a.user_id=auth.uid() and not desvio_private.is_editor();
$$;
revoke all on function desvio_private.current_artist() from public;
grant execute on function desvio_private.current_artist() to anon, authenticated;

create function desvio_private.current_role() returns text language sql stable security definer set search_path='' as $$
 select case
  when auth.uid() is null then null
  when exists(select 1 from public.desvio_memberships where user_id=auth.uid()) then (select role from public.desvio_memberships where user_id=auth.uid())
  when exists(select 1 from public.desvio_artist_accounts where user_id=auth.uid()) then 'artist'
 end;
$$;
revoke all on function desvio_private.current_role() from public;
grant execute on function desvio_private.current_role() to anon, authenticated;

create function public.desvio_whoami() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('role',desvio_private.current_role(),'artistId',desvio_private.current_artist());
$$;
revoke all on function public.desvio_whoami() from public;
grant execute on function public.desvio_whoami() to anon, authenticated;

create function desvio_private.validate_artist_photos(s jsonb) returns void language plpgsql set search_path='' as $$
declare x jsonb; begin
 for x in select value->'photo' from jsonb_array_elements(s->'artists') where jsonb_typeof(value->'photo')='object' loop
  if (coalesce(x->>'path','')='') <> (coalesce(x->>'bucket','')='') then raise exception 'Foto da pessoa artista sem vínculo de arquivo.'; end if;
  if coalesce(x->>'path','')<>'' and ((x->>'bucket')<>'desvio-media' or (x->>'path') ~ '(^/|\.\.)') then raise exception 'Caminho da foto inválido.'; end if;
  if coalesce(x->>'src','')<>'' and (x->>'src') !~ '^(https?://|/art/|/brand/)' then raise exception 'Envie a foto ao Storage.'; end if;
 end loop;
end $$;
revoke all on function desvio_private.validate_artist_photos(jsonb) from public;

-- The part of the draft an artist may see: their rooms and the works in them.
create function desvio_private.artist_view(s jsonb, aid uuid) returns jsonb language sql immutable set search_path='' as $$
 with rooms as (select r.value from jsonb_array_elements(s->'rooms') r where coalesce(r.value->'artistIds','[]'::jsonb) ? aid::text),
 pl as (select p.value from jsonb_array_elements(s->'placements') p where p.value->>'roomId' in (select value->>'id' from rooms))
 select jsonb_build_object(
  'exhibition',s->'exhibition',
  'artists',s->'artists',
  'rooms',coalesce((select jsonb_agg(value order by (value->>'order')::int) from rooms),'[]'::jsonb),
  'placements',coalesce((select jsonb_agg(value) from pl),'[]'::jsonb),
  'records',coalesce((select jsonb_agg(r.value) from jsonb_array_elements(s->'records') r where r.value->>'id' in (select value->>'recordId' from pl)),'[]'::jsonb),
  'media',coalesce((select jsonb_agg(m.value) from jsonb_array_elements(s->'media') m where m.value->>'recordId' in (select value->>'recordId' from pl)),'[]'::jsonb));
$$;
revoke all on function desvio_private.artist_view(jsonb,uuid) from public;

create function desvio_private.artist_draft() returns jsonb language sql stable security definer set search_path='' as $$
 select desvio_private.artist_view(coalesce(desvio_private.snapshot(c.draft_version),desvio_private.empty_snapshot()),desvio_private.current_artist())
 from public.desvio_collections c where c.id='00000000-0000-4000-8000-000000000030' and desvio_private.current_artist() is not null;
$$;
revoke all on function desvio_private.artist_draft() from public;
-- Visitors evaluate the load expression too; for them it returns nothing.
grant execute on function desvio_private.artist_draft() to anon, authenticated;

create or replace function public.desvio_load_collection() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('version',3,'revision',c.revision,
 'draft',case
   when desvio_private.is_editor() then coalesce(desvio_private.snapshot(c.draft_version),desvio_private.empty_snapshot())
   when desvio_private.current_artist() is not null then desvio_private.artist_draft()
   else desvio_private.empty_snapshot() end,
 'published',coalesce(desvio_private.snapshot(c.published_version),desvio_private.empty_snapshot()))
 from public.desvio_collections c where id='00000000-0000-4000-8000-000000000030';
$$;

create or replace function desvio_private.edit_collection(operation text,payload jsonb,expected_revision bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.desvio_collections; s jsonb; x jsonb; a jsonb; old_order integer; target_id text; second jsonb; st text; begin
 if auth.uid() is null or not desvio_private.is_editor() then raise exception 'Sem permissão de curadoria.' using errcode='42501'; end if;
 select * into c from public.desvio_collections where id='00000000-0000-4000-8000-000000000030' for update;
 if c.revision<>expected_revision then raise exception 'O acervo mudou. Recarregue antes de salvar.' using errcode='40001'; end if;
 s=coalesce(desvio_private.snapshot(c.draft_version),desvio_private.empty_snapshot());
 case operation
 when 'save_record' then
  target_id=payload->'record'->>'id';
  st=coalesce(payload->'record'->>'status','draft');
  if st not in ('draft','published','archived') then st='draft'; end if;
  s=jsonb_set(s,'{records}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'records') where value->>'id'<>target_id),'[]') || jsonb_build_array(case when st='published' then jsonb_set(payload->'record','{status}',to_jsonb(st))-'reviewRequested' else jsonb_set(payload->'record','{status}',to_jsonb(st)) end));
  s=jsonb_set(s,'{media}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'media') where value->>'recordId'<>target_id),'[]') || jsonb_build_array(payload->'media'));
  s=jsonb_set(s,'{placements}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'placements') where value->>'recordId'<>target_id),'[]') || jsonb_build_array(payload->'placement'));
 when 'set_record_status' then
  target_id=payload->>'id';
  st=payload->>'status';
  if st is null or st not in ('draft','published','archived') then raise exception 'Status inválido.'; end if;
  if not exists(select 1 from jsonb_array_elements(s->'records') where value->>'id'=target_id) then raise exception 'Obra inexistente.'; end if;
  s=jsonb_set(s,'{records}',(select jsonb_agg(case when value->>'id'=target_id then case when st='published' then jsonb_set(value,'{status}',to_jsonb(st))-'reviewRequested' else jsonb_set(value,'{status}',to_jsonb(st)) end else value end) from jsonb_array_elements(s->'records')));
 when 'delete_record' then
  foreach target_id in array array['records','media','placements'] loop
   s=jsonb_set(s,array[target_id],coalesce((select jsonb_agg(value) from jsonb_array_elements(s->target_id) where value->>(case when target_id='records' then 'id' else 'recordId' end)<>payload->>'id'),'[]'));
  end loop;
  target_id=null;
 when 'swap_placements' then
  select value into x from jsonb_array_elements(s->'placements') where value->>'recordId'=payload->>'firstId';
  select value into second from jsonb_array_elements(s->'placements') where value->>'recordId'=payload->>'secondId';
  if x is null or second is null or x->>'id'=second->>'id' then raise exception 'Escolha duas obras distintas.'; end if;
  if (select value->>'type' from jsonb_array_elements(s->'media') where value->>'id'=x->>'mediaId')<>(select value->>'type' from jsonb_array_elements(s->'media') where value->>'id'=second->>'mediaId') then raise exception 'Troque obras do mesmo tipo de mídia.'; end if;
  s=jsonb_set(s,'{placements}',(select jsonb_agg(case when p->>'id'=x->>'id' then p||jsonb_build_object('roomId',second->'roomId','slotId',second->'slotId','position',second->'position','rotation',second->'rotation') when p->>'id'=second->>'id' then p||jsonb_build_object('roomId',x->'roomId','slotId',x->'slotId','position',x->'position','rotation',x->'rotation') else p end) from jsonb_array_elements(s->'placements') p));
 when 'delete_artist' then
  if exists(select 1 from jsonb_array_elements(s->'records') r, jsonb_array_elements(r.value->'credits') cr where cr.value->>'artistId'=payload->>'id') then raise exception 'Remova os créditos desta pessoa artista nas obras antes de excluí-la.'; end if;
  if exists(select 1 from jsonb_array_elements(s->'rooms') where coalesce(value->'artistIds','[]') ? (payload->>'id')) then raise exception 'Desvincule esta pessoa artista das salas antes de excluí-la.'; end if;
  s=jsonb_set(s,'{artists}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'artists') where value->>'id'<>payload->>'id'),'[]'));
  delete from public.desvio_artist_accounts where artist_id=(payload->>'id')::uuid;
 when 'save_artist' then s=jsonb_set(s,'{artists}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'artists') where value->>'id'<>payload->>'id'),'[]')||jsonb_build_array(payload));
 -- The on-air state is changed only by publish/archive, never by editing the texts.
 when 'save_exhibition' then
  if jsonb_typeof(payload) is distinct from 'object' then raise exception 'Exposição incompleta.'; end if;
  s=jsonb_set(s,'{exhibition}',payload||jsonb_build_object('status',s->'exhibition'->'status'));
 when 'save_room' then
  select (value->>'order')::integer into old_order from jsonb_array_elements(s->'rooms') where value->>'id'=payload->>'id';
  x=jsonb_set(payload,'{order}',to_jsonb(coalesce(old_order,jsonb_array_length(s->'rooms'))));
  s=jsonb_set(s,'{rooms}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'rooms') where value->>'id'<>payload->>'id'),'[]')||jsonb_build_array(x));
 when 'delete_room' then
  if exists(select 1 from jsonb_array_elements(s->'placements') where value->>'roomId'=payload->>'id') then raise exception 'Mova as obras antes de excluir a sala.'; end if;
  select (value->>'order')::int into old_order from jsonb_array_elements(s->'rooms') where value->>'id'=payload->>'id';
  if old_order is null then raise exception 'Sala inexistente.'; end if;
  s=jsonb_set(s,'{rooms}',coalesce((select jsonb_agg(jsonb_set(value,'{order}',to_jsonb((value->>'order')::int-case when (value->>'order')::int>old_order then 1 else 0 end))) from jsonb_array_elements(s->'rooms') where value->>'id'<>payload->>'id'),'[]'));
  s=jsonb_set(s,'{placements}',coalesce((select jsonb_agg(case when (select (value->>'order')::int from jsonb_array_elements(s->'rooms') where value->>'id'=p->>'roomId')>=old_order then jsonb_set(p,'{position,2}',to_jsonb((p->'position'->>2)::numeric+12)) else p end) from jsonb_array_elements(s->'placements') p),'[]'));
 when 'reorder_rooms' then
  if jsonb_array_length(payload->'ids')<>jsonb_array_length(s->'rooms') or (select count(distinct value) from jsonb_array_elements_text(payload->'ids'))<>jsonb_array_length(s->'rooms') or exists(select 1 from jsonb_array_elements_text(payload->'ids') i where not exists(select 1 from jsonb_array_elements(s->'rooms') r where r->>'id'=i)) then raise exception 'Ordem inválida.'; end if;
  a='[]';
  for x in select jsonb_build_object('id',value,'order',ordinality-1) from jsonb_array_elements_text(payload->'ids') with ordinality loop
   select (value->>'order')::int into old_order from jsonb_array_elements(s->'rooms') where value->>'id'=x->>'id';
   a=a||jsonb_build_array((select jsonb_set(value,'{order}',x->'order') from jsonb_array_elements(s->'rooms') where value->>'id'=x->>'id'));
   s=jsonb_set(s,'{placements}',coalesce((select jsonb_agg(case when p->>'roomId'=x->>'id' then jsonb_set(p,'{position,2}',to_jsonb((p->'position'->>2)::numeric+(old_order-(x->>'order')::int)*12)) else p end) from jsonb_array_elements(s->'placements') p),'[]'));
  end loop;
  s=jsonb_set(s,'{rooms}',a);
 when 'initialize' then
  if jsonb_array_length(s->'records')>0 then raise exception 'O acervo já contém obras.'; end if;
  s=payload;
 -- "review" is kept as an alias so older clients do not break.
 when 'publish','review' then s=jsonb_set(s,'{exhibition,status}','"published"');
 when 'archive' then s=jsonb_set(s,'{exhibition,status}','"archived"');
 else raise exception 'Operação desconhecida.';
 end case;
 perform desvio_private.validate_snapshot(s,false);
 perform desvio_private.validate_artist_photos(s);
 if operation in ('save_record','set_record_status') then perform desvio_private.validate_live_record(s,target_id); end if;
 perform desvio_private.write_version(c.draft_version,s);
 perform desvio_private.sync_public(c.id,s);
 update public.desvio_collections set revision=revision+1 where id=c.id;
 insert into public.desvio_editorial_events(collection_id,user_id,operation,revision) values(c.id,auth.uid(),operation,c.revision+1);
 return public.desvio_load_collection();
end $$;

create function desvio_private.artist_edit(operation text,payload jsonb,expected_revision bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.desvio_collections; s jsonb; aid uuid; mine text[]; target_id text; old jsonb; room jsonb; x jsonb; second jsonb; begin
 aid=desvio_private.current_artist();
 if auth.uid() is null or aid is null then raise exception 'Sem permissão de artista.' using errcode='42501'; end if;
 select * into c from public.desvio_collections where id='00000000-0000-4000-8000-000000000030' for update;
 if c.revision<>expected_revision then raise exception 'O acervo mudou. Recarregue antes de salvar.' using errcode='40001'; end if;
 s=coalesce(desvio_private.snapshot(c.draft_version),desvio_private.empty_snapshot());
 select coalesce(array_agg(value->>'id'),'{}') into mine from jsonb_array_elements(s->'rooms') where coalesce(value->'artistIds','[]'::jsonb) ? aid::text;
 case operation
 -- Only the descriptive fields and capacity; membership and order stay with the curators.
 when 'save_room' then
  select value into room from jsonb_array_elements(s->'rooms') where value->>'id'=payload->>'id';
  if room is null or not (room->>'id'=any(mine)) then raise exception 'Esta sala não está vinculada a você.' using errcode='42501'; end if;
  room=room||jsonb_strip_nulls(jsonb_build_object('name',payload->'name','subtitle',payload->'subtitle','wallSlots',payload->'wallSlots','pedestalSlots',payload->'pedestalSlots'));
  s=jsonb_set(s,'{rooms}',(select jsonb_agg(case when value->>'id'=room->>'id' then room else value end) from jsonb_array_elements(s->'rooms')));
 when 'save_record' then
  target_id=payload->'record'->>'id';
  if payload->'media'->>'recordId' is distinct from target_id or payload->'placement'->>'recordId' is distinct from target_id then raise exception 'Vínculos da obra inválidos.'; end if;
  if not (payload->'placement'->>'roomId'=any(mine)) then raise exception 'Escolha uma das suas salas.' using errcode='42501'; end if;
  select value into old from jsonb_array_elements(s->'placements') where value->>'recordId'=target_id;
  if old is not null and not (old->>'roomId'=any(mine)) then raise exception 'Esta obra não está nas suas salas.' using errcode='42501'; end if;
  if old is null and exists(select 1 from jsonb_array_elements(s->'records') where value->>'id'=target_id) then raise exception 'Esta obra não está nas suas salas.' using errcode='42501'; end if;
  s=jsonb_set(s,'{records}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'records') where value->>'id'<>target_id),'[]')||jsonb_build_array(jsonb_set(payload->'record','{status}','"draft"')||'{"reviewRequested":true}'::jsonb));
  s=jsonb_set(s,'{media}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'media') where value->>'recordId'<>target_id),'[]')||jsonb_build_array(payload->'media'));
  s=jsonb_set(s,'{placements}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'placements') where value->>'recordId'<>target_id),'[]')||jsonb_build_array(payload->'placement'));
 when 'delete_record' then
  target_id=payload->>'id';
  select value into old from jsonb_array_elements(s->'placements') where value->>'recordId'=target_id;
  if old is null or not (old->>'roomId'=any(mine)) then raise exception 'Esta obra não está nas suas salas.' using errcode='42501'; end if;
  if (select value->>'status' from jsonb_array_elements(s->'records') where value->>'id'=target_id)<>'draft' then raise exception 'Só obras em rascunho podem ser excluídas. Peça à curadoria para despublicar.'; end if;
  foreach x in array array['"records"','"media"','"placements"']::jsonb[] loop
   s=jsonb_set(s,array[x#>>'{}'],coalesce((select jsonb_agg(value) from jsonb_array_elements(s->(x#>>'{}')) where value->>(case when x#>>'{}'='records' then 'id' else 'recordId' end)<>target_id),'[]'));
  end loop;
 when 'swap_placements' then
  select value into x from jsonb_array_elements(s->'placements') where value->>'recordId'=payload->>'firstId';
  select value into second from jsonb_array_elements(s->'placements') where value->>'recordId'=payload->>'secondId';
  if x is null or second is null or x->>'id'=second->>'id' then raise exception 'Escolha duas obras distintas.'; end if;
  if not (x->>'roomId'=any(mine)) or not (second->>'roomId'=any(mine)) then raise exception 'Troque apenas obras das suas salas.' using errcode='42501'; end if;
  if (select value->>'type' from jsonb_array_elements(s->'media') where value->>'id'=x->>'mediaId')<>(select value->>'type' from jsonb_array_elements(s->'media') where value->>'id'=second->>'mediaId') then raise exception 'Troque obras do mesmo tipo de mídia.'; end if;
  s=jsonb_set(s,'{placements}',(select jsonb_agg(case when p->>'id'=x->>'id' then p||jsonb_build_object('roomId',second->'roomId','slotId',second->'slotId','position',second->'position','rotation',second->'rotation') when p->>'id'=second->>'id' then p||jsonb_build_object('roomId',x->'roomId','slotId',x->'slotId','position',x->'position','rotation',x->'rotation') else p end) from jsonb_array_elements(s->'placements') p));
 else raise exception 'Operação não permitida para artistas.' using errcode='42501';
 end case;
 perform desvio_private.validate_snapshot(s,false);
 perform desvio_private.write_version(c.draft_version,s);
 perform desvio_private.sync_public(c.id,s);
 update public.desvio_collections set revision=revision+1 where id=c.id;
 insert into public.desvio_editorial_events(collection_id,user_id,operation,revision) values(c.id,auth.uid(),'artist:'||operation,c.revision+1);
 return public.desvio_load_collection();
end $$;
revoke all on function desvio_private.artist_edit(text,jsonb,bigint) from public;
grant execute on function desvio_private.artist_edit(text,jsonb,bigint) to authenticated;
create function public.desvio_artist_edit(operation text,payload jsonb,expected_revision bigint) returns jsonb
language sql security invoker set search_path='' as $$ select desvio_private.artist_edit(operation,payload,expected_revision); $$;
revoke all on function public.desvio_artist_edit(text,jsonb,bigint) from public, anon;
grant execute on function public.desvio_artist_edit(text,jsonb,bigint) to authenticated;

-- Account management for curators.
create function desvio_private.list_artist_accounts() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not desvio_private.is_editor() then raise exception 'Sem permissão de curadoria.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('userId',a.user_id,'artistId',a.artist_id,'email',a.email,
   'confirmed',u.email_confirmed_at is not null,'lastSignInAt',u.last_sign_in_at) order by a.created_at)
  from public.desvio_artist_accounts a join auth.users u on u.id=a.user_id),'[]'::jsonb);
end $$;
revoke all on function desvio_private.list_artist_accounts() from public;
grant execute on function desvio_private.list_artist_accounts() to authenticated;
create function public.desvio_list_artist_accounts() returns jsonb language sql stable security invoker set search_path='' as $$ select desvio_private.list_artist_accounts(); $$;
revoke all on function public.desvio_list_artist_accounts() from public, anon;
grant execute on function public.desvio_list_artist_accounts() to authenticated;

create function desvio_private.remove_artist_account(account uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not desvio_private.is_editor() then raise exception 'Sem permissão de curadoria.' using errcode='42501'; end if;
 delete from public.desvio_artist_accounts where user_id=account;
end $$;
revoke all on function desvio_private.remove_artist_account(uuid) from public;
grant execute on function desvio_private.remove_artist_account(uuid) to authenticated;
create function public.desvio_remove_artist_account(account uuid) returns void language sql security invoker set search_path='' as $$ select desvio_private.remove_artist_account(account); $$;
revoke all on function public.desvio_remove_artist_account(uuid) from public, anon;
grant execute on function public.desvio_remove_artist_account(uuid) to authenticated;

-- Called only by the invite Edge Function with the service role, after it
-- has checked that the caller is a curator.
create function public.desvio_link_artist_account(account_email text, artist uuid) returns void language plpgsql security definer set search_path='' as $$
declare u uuid; begin
 select id into u from auth.users where lower(email)=lower(trim(account_email));
 if u is null then raise exception 'Conta não encontrada para este e-mail.'; end if;
 insert into public.desvio_artist_accounts(user_id,artist_id,email) values(u,artist,lower(trim(account_email)))
 on conflict(user_id) do update set artist_id=excluded.artist_id, email=excluded.email;
end $$;
revoke all on function public.desvio_link_artist_account(text,uuid) from public, anon, authenticated;
grant execute on function public.desvio_link_artist_account(text,uuid) to service_role;

-- Storage: artists upload into their own folder and read what they manage;
-- artist photos on the public edition are readable like other public media.
create or replace function desvio_private.can_read_media(bucket text,path text) returns boolean language sql stable security definer set search_path='' as $$
 select desvio_private.is_editor()
 or exists(
  select 1 from public.desvio_media m join public.desvio_collections c on c.published_version=m.version_id
  join public.desvio_versions v on v.id=c.published_version
  where v.exhibition->>'status'='published' and
  ((m.content->>'bucket'=bucket and m.content->>'path'=path) or
  (m.content->'narration'->>'bucket'=bucket and m.content->'narration'->>'path'=path)))
 or exists(
  select 1 from public.desvio_artists a join public.desvio_collections c on c.published_version=a.version_id
  join public.desvio_versions v on v.id=c.published_version
  where v.exhibition->>'status'='published' and a.content->'photo'->>'bucket'=bucket and a.content->'photo'->>'path'=path)
 or (desvio_private.current_artist() is not null and (
  split_part(path,'/',1)=auth.uid()::text or exists(
   select 1 from jsonb_array_elements(desvio_private.artist_draft()->'media') m
   where (m.value->>'bucket'=bucket and m.value->>'path'=path) or (m.value->'narration'->>'bucket'=bucket and m.value->'narration'->>'path'=path))));
$$;
create or replace function desvio_private.media_referenced(bucket text,path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.desvio_media m where
  (m.content->>'bucket'=bucket and m.content->>'path'=path) or
  (m.content->'narration'->>'bucket'=bucket and m.content->'narration'->>'path'=path))
 or exists(select 1 from public.desvio_artists a where a.content->'photo'->>'bucket'=bucket and a.content->'photo'->>'path'=path);
$$;
drop policy desvio_media_upload on storage.objects;
create policy desvio_media_upload on storage.objects for insert to authenticated
 with check(bucket_id='desvio-media' and (desvio_private.is_editor() or desvio_private.current_artist() is not null) and split_part(name,'/',1)=auth.uid()::text);
notify pgrst,'reload schema';
