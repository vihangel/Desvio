-- Incremental, no change to the data model the app reads:
-- 1. removing a login no longer fails for people who already edited;
-- 2. editions nothing points at are deleted (and no longer created);
-- 3. missing indexes and integrity checks;
-- 4. one validator and shared helpers behind the curator and artist commands;
-- 5. functions nobody calls are gone.

-- 1. History survives the account: events and the bootstrap note keep their
-- row with no user. Without this, deleting an artist who edited anything fails.
alter table public.desvio_editorial_events drop constraint if exists desvio_editorial_events_user_id_fkey;
alter table public.desvio_editorial_events add constraint desvio_editorial_events_user_id_fkey foreign key(user_id) references auth.users(id) on delete set null;
alter table desvio_private.admin_bootstrap drop constraint if exists admin_bootstrap_claimed_by_fkey;
alter table desvio_private.admin_bootstrap add constraint admin_bootstrap_claimed_by_fkey foreign key(claimed_by) references auth.users(id) on delete set null;

-- 2. Placements hold the only foreign keys without cascade, so they go first.
create function desvio_private.delete_version(v uuid) returns void language plpgsql set search_path='' as $$
begin
 delete from public.desvio_placements where version_id=v;
 delete from public.desvio_versions where id=v;
end $$;
revoke all on function desvio_private.delete_version(uuid) from public;

select desvio_private.delete_version(v.id) from public.desvio_versions v
where not exists(select 1 from public.desvio_collections c where v.id in (c.draft_version,c.published_version));

-- 3. Indexes: foreign keys and the lookups done when a file is read or removed.
create index if not exists desvio_versions_collection on public.desvio_versions(collection_id);
create index if not exists desvio_collections_draft on public.desvio_collections(draft_version);
create index if not exists desvio_collections_published on public.desvio_collections(published_version);
create index if not exists desvio_events_collection on public.desvio_editorial_events(collection_id);
create index if not exists desvio_events_user on public.desvio_editorial_events(user_id);
create index if not exists desvio_media_record on public.desvio_media(version_id,record_id);
create index if not exists desvio_placements_media on public.desvio_placements(version_id,media_id,record_id);
create index if not exists desvio_artist_accounts_artist on public.desvio_artist_accounts(artist_id);
create index if not exists desvio_media_narration_paths on public.desvio_media((content->'narration'->>'bucket'),(content->'narration'->>'path')) where content ? 'narration';
create index if not exists desvio_artists_photo_paths on public.desvio_artists((content->'photo'->>'bucket'),(content->'photo'->>'path')) where content ? 'photo';

-- 3. Columns and the JSON they were copied from must agree. Only legacy works
-- can carry "in_review", which now means draft.
update public.desvio_records set content=jsonb_set(content,'{status}','"draft"') where content->>'status' not in ('draft','published','archived');
alter table public.desvio_artists add constraint desvio_artists_content_id check(lower(content->>'id')=id::text);
alter table public.desvio_records add constraint desvio_records_content_id check(lower(content->>'id')=id::text);
alter table public.desvio_records add constraint desvio_records_status check(content->>'status' in ('draft','published','archived'));
alter table public.desvio_media add constraint desvio_media_content_id check(lower(content->>'id')=id::text and lower(content->>'recordId')=record_id::text);
alter table public.desvio_rooms add constraint desvio_rooms_content_id check(lower(content->>'id')=id::text and (content->>'order')::integer=sort_order);
alter table public.desvio_placements add constraint desvio_placements_content_id check(lower(content->>'id')=id::text and lower(content->>'recordId')=record_id::text and lower(content->>'mediaId')=media_id::text and lower(content->>'roomId')=room_id::text and content->>'slotId'=slot_id);

-- The address shown comes from auth.users. (The copy in desvio_artist_accounts
-- stays: the published Edge Function still reads it.)
create or replace function desvio_private.list_artist_accounts() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not desvio_private.is_editor() then raise exception 'Sem permissão de curadoria.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('userId',a.user_id,'artistId',a.artist_id,'email',u.email,'lastSignInAt',u.last_sign_in_at) order by a.created_at)
  from public.desvio_artist_accounts a join auth.users u on u.id=a.user_id),'[]'::jsonb);
end $$;

-- 4. The one collection, named once.
create function desvio_private.collection_id() returns uuid language sql immutable set search_path='' as $$
 select '00000000-0000-4000-8000-000000000030'::uuid;
$$;
revoke all on function desvio_private.collection_id() from public;
grant execute on function desvio_private.collection_id() to anon, authenticated;

create or replace function public.desvio_load_collection() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('version',3,'revision',c.revision,
 'draft',case
   when desvio_private.is_editor() then coalesce(desvio_private.snapshot(c.draft_version),desvio_private.empty_snapshot())
   when desvio_private.current_artist() is not null then desvio_private.artist_draft()
   else desvio_private.empty_snapshot() end,
 'published',coalesce(desvio_private.snapshot(c.published_version),desvio_private.empty_snapshot()))
 from public.desvio_collections c where id=desvio_private.collection_id();
$$;
create or replace function desvio_private.artist_draft() returns jsonb language sql stable security definer set search_path='' as $$
 select desvio_private.artist_view(coalesce(desvio_private.snapshot(c.draft_version),desvio_private.empty_snapshot()),desvio_private.current_artist())
 from public.desvio_collections c where c.id=desvio_private.collection_id() and desvio_private.current_artist() is not null;
$$;

-- 4. Everything a saved edition must satisfy, in one place: the former
-- validate_artist_photos is folded in, and subtitles are now checked here too.
create function desvio_private.validate_snapshot(s jsonb) returns void language plpgsql set search_path='' as $$
declare x jsonb; room jsonb; ord integer; axis jsonb; p text; k text; begin
 foreach k in array array['artists','records','media','rooms','placements'] loop
  if jsonb_typeof(s->k) is distinct from 'array' then raise exception 'Coleção inválida: %.',k; end if;
 end loop;
 if jsonb_typeof(s->'exhibition') is distinct from 'object' or not ((s->'exhibition') ?& array['id','title','subtitle','status','beginsAt','endsAt','notice']) then raise exception 'Exposição incompleta.'; end if;
 for x in select value from jsonb_array_elements(s->'artists') loop
  if not(x ?& array['id','name','location','bio','source']) or coalesce(trim(x->>'name'),'')='' then raise exception 'Artista incompleto.'; end if;
  if jsonb_typeof(x->'photo')='object' then
   if (coalesce(x->'photo'->>'path','')='') <> (coalesce(x->'photo'->>'bucket','')='') then raise exception 'Foto da pessoa artista sem vínculo de arquivo.'; end if;
   if coalesce(x->'photo'->>'path','')<>'' and ((x->'photo'->>'bucket')<>'desvio-media' or (x->'photo'->>'path') ~ '(^/|\.\.)') then raise exception 'Caminho da foto inválido.'; end if;
   if coalesce(x->'photo'->>'src','')<>'' and (x->'photo'->>'src') !~ '^(https?://|/art/|/brand/)' then raise exception 'Envie a foto ao Storage.'; end if;
  end if;
 end loop;
 if jsonb_array_length(s->'rooms') not between 1 and 24 then raise exception 'Mantenha entre 1 e 24 salas.'; end if;
 for x in select value from jsonb_array_elements(s->'rooms') loop
  if not(x ?& array['id','name','subtitle','template','order']) or x->>'template'<>'corridor' then raise exception 'Sala incompleta.'; end if;
  ord=(x->>'order')::integer;
  if ord<0 or ord>=jsonb_array_length(s->'rooms') or length(trim(x->>'name'))=0 or coalesce((x->>'wallSlots')::integer,3) not between 1 and 6 or coalesce((x->>'pedestalSlots')::integer,2) not between 0 and 4 then raise exception 'Sala inválida.'; end if;
  if exists(select 1 from jsonb_array_elements_text(coalesce(x->'artistIds','[]')) a where not exists(select 1 from jsonb_array_elements(s->'artists') b where b->>'id'=a)) then raise exception 'Artista da sala inexistente.'; end if;
 end loop;
 if length(trim(s->'exhibition'->>'title'))=0 or (s->'exhibition'->>'status') not in ('draft','in_review','published','archived') then raise exception 'Exposição inválida.'; end if;
 if coalesce(s->'exhibition'->>'beginsAt','')<>'' then perform (s->'exhibition'->>'beginsAt')::date; end if;
 if coalesce(s->'exhibition'->>'endsAt','')<>'' then perform (s->'exhibition'->>'endsAt')::date; end if;
 if coalesce(s->'exhibition'->>'endsAt','')<>'' and coalesce(s->'exhibition'->>'beginsAt','')<>'' and (s->'exhibition'->>'endsAt')::date<(s->'exhibition'->>'beginsAt')::date then raise exception 'Datas invertidas.'; end if;
 for x in select value from jsonb_array_elements(s->'records') loop
  if not(x ?& array['id','title','year','description','kind','credits','creditNote','status']) or jsonb_typeof(x->'credits') is distinct from 'array' then raise exception 'Registro incompleto.'; end if;
  if x->>'status' not in ('draft','published','archived') then raise exception 'Estado inválido.'; end if;
  if length(trim(x->>'title'))=0 or (x->>'year')::integer not between 0 and 9999 then raise exception 'Registro inválido.'; end if;
  if jsonb_array_length(x->'credits')=0 and coalesce(trim(x->>'creditNote'),'')='' then raise exception 'Informe autoria.'; end if;
  if exists(select 1 from jsonb_array_elements(x->'credits') a where not exists(select 1 from jsonb_array_elements(s->'artists') b where b->>'id'=a->>'artistId')) then raise exception 'Artista inexistente.'; end if;
  if coalesce(x->>'source','')<>'' and (x->>'source') !~ '^https?://' then raise exception 'Fonte inválida.'; end if;
 end loop;
 for x in select value from jsonb_array_elements(s->'media') loop
  if not(x ?& array['id','recordId','type','alt','attribution','rights']) then raise exception 'Mídia incompleta.'; end if;
  if (coalesce(x->>'path','')='') <> (coalesce(x->>'bucket','')='') then raise exception 'Bucket e caminho precisam estar vinculados.'; end if;
  if coalesce(x->>'src','')<>'' and (x->>'src') !~ '^(https?://|/art/|/brand/)' then raise exception 'Envie a mídia ao Storage.'; end if;
  if coalesce(x->>'path','')<>'' and ((x->>'bucket')<>'desvio-media' or (x->>'path') ~ '(^/|\.\.)') then raise exception 'Caminho de mídia inválido.'; end if;
  if x->>'type'='video' and coalesce(x->>'src','') !~ '^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$' then raise exception 'Informe um link canônico válido do YouTube.'; end if;
  if x ? 'modelFormat' and x->>'modelFormat' not in ('glb','stl','obj') then raise exception 'Formato 3D inválido.'; end if;
  if x ? 'narration' then
   if jsonb_typeof(x->'narration') is distinct from 'object' or not ((x->'narration') ?& array['credits','transcript','authorized']) then raise exception 'Narração incompleta.'; end if;
   if (coalesce(x->'narration'->>'path','')='') <> (coalesce(x->'narration'->>'bucket','')='') then raise exception 'Vínculo de áudio inválido.'; end if;
   if coalesce(x->'narration'->>'bucket','desvio-media')<>'desvio-media' or coalesce(x->'narration'->>'path','') ~ '(^/|\.\.)' then raise exception 'Caminho de áudio inválido.'; end if;
   if coalesce(x->'narration'->>'src','')<>'' and x->'narration'->>'src' !~ '^https?://' then raise exception 'Envie o áudio ao Storage.'; end if;
   if coalesce(x->'narration'->>'src','')='' and coalesce(x->'narration'->>'path','')='' then raise exception 'Envie o áudio do artista.'; end if;
   if x->'narration' ? 'captions' then
    if length(x->'narration'->>'captions')>200000 then raise exception 'Arquivo de legenda acima de 200 KB.'; end if;
    if (x->'narration'->>'captions') !~ '^﻿?WEBVTT' then raise exception 'A legenda precisa ser um arquivo WebVTT (.vtt).'; end if;
   end if;
  end if;
  if x->>'type'='image' and (coalesce(x->>'alt','')='' or (coalesce(x->>'src','')='' and coalesce(x->>'path','')='')) then raise exception 'Imagem e descrição acessível obrigatórias.'; end if;
 end loop;
 for x in select value from jsonb_array_elements(s->'placements') loop
  if not(x ?& array['id','roomId','recordId','mediaId','slotId','position','rotation','scale']) then raise exception 'Montagem incompleta.'; end if;
  select value into room from jsonb_array_elements(s->'rooms') where value->>'id'=x->>'roomId';
  if room is null then raise exception 'Sala inexistente.'; end if;
  select value->>'type' into p from jsonb_array_elements(s->'media') where value->>'id'=x->>'mediaId' and value->>'recordId'=x->>'recordId';
  if p is null then raise exception 'Vínculo de mídia inválido.'; end if;
  if p in ('image','video') then
   if x->>'slotId' !~ '^wall-(left|right)-[0-5]$' or split_part(x->>'slotId','-',3)::integer>=coalesce((room->>'wallSlots')::integer,3) or coalesce(x->>'presentation','frame')<>'frame' then raise exception 'Escolha uma posição de quadro.'; end if;
  else
   if x->>'slotId' not in ('pedestal-front','pedestal-back','pedestal-2','pedestal-3') or (case x->>'slotId' when 'pedestal-front' then 0 when 'pedestal-back' then 1 when 'pedestal-2' then 2 else 3 end)>=coalesce((room->>'pedestalSlots')::integer,2) or coalesce(x->>'presentation','pedestal') not in ('pedestal','floor') then raise exception 'Escolha uma posição 3D.'; end if;
  end if;
  if abs((x->'position'->>0)::numeric)>4.8 or (x->'position'->>1)::numeric not between 0 and 3.8 or abs((x->'position'->>2)::numeric+(room->>'order')::integer*12)>5.7 then raise exception 'Mantenha a obra dentro da sala.'; end if;
  foreach p in array array['position','rotation','scale'] loop
   if jsonb_typeof(x->p) is distinct from 'array' or jsonb_array_length(x->p)<>3 then raise exception 'Vetor inválido.'; end if;
   for axis in select value from jsonb_array_elements(x->p) loop
    if jsonb_typeof(axis)<>'number' or abs(axis::text::numeric)>10000 or (p='scale' and (axis::text::numeric<=0 or axis::text::numeric>4)) then raise exception 'Posicionamento inválido.'; end if;
   end loop;
  end loop;
 end loop;
end $$;
revoke all on function desvio_private.validate_snapshot(jsonb) from public;

-- Archiving deletes the public edition instead of leaving it behind: an
-- unreachable copy would keep files "referenced" and impossible to remove.
create or replace function desvio_private.sync_public(cid uuid, s jsonb) returns void language plpgsql set search_path='' as $$
declare v uuid; p jsonb; begin
 select published_version into v from public.desvio_collections where id=cid;
 if s->'exhibition'->>'status'='archived' then
  update public.desvio_collections set published_version=null where id=cid;
  if v is not null then perform desvio_private.delete_version(v); end if;
  return;
 end if;
 p=desvio_private.public_edition(s);
 perform desvio_private.validate_snapshot(p);
 if v is null then
  insert into public.desvio_versions(collection_id,exhibition) values(cid,p->'exhibition') returning id into v;
  update public.desvio_collections set published_version=v where id=cid;
 end if;
 perform desvio_private.write_version(v,p);
end $$;

-- 4. Every command opens and closes the same way.
create function desvio_private.lock_collection(expected_revision bigint) returns public.desvio_collections language plpgsql set search_path='' as $$
declare c public.desvio_collections; begin
 select * into c from public.desvio_collections where id=desvio_private.collection_id() for update;
 if c.revision<>expected_revision then raise exception 'O acervo mudou. Recarregue antes de salvar.' using errcode='40001'; end if;
 return c;
end $$;
revoke all on function desvio_private.lock_collection(bigint) from public;

create function desvio_private.commit_edit(c public.desvio_collections, s jsonb, event text) returns jsonb language plpgsql set search_path='' as $$
begin
 perform desvio_private.validate_snapshot(s);
 perform desvio_private.write_version(c.draft_version,s);
 perform desvio_private.sync_public(c.id,s);
 update public.desvio_collections set revision=revision+1 where id=c.id;
 insert into public.desvio_editorial_events(collection_id,user_id,operation,revision) values(c.id,auth.uid(),event,c.revision+1);
 return public.desvio_load_collection();
end $$;
revoke all on function desvio_private.commit_edit(public.desvio_collections,jsonb,text) from public;

-- 4. Snapshot edits shared by the curator and artist commands.
create function desvio_private.without_item(s jsonb, list text, field text, item_id text) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_set(s,array[list],coalesce((select jsonb_agg(value) from jsonb_array_elements(s->list) where value->>field<>item_id),'[]'::jsonb));
$$;
create function desvio_private.put_item(s jsonb, list text, field text, item jsonb) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_set(t,array[list],(t->list)||jsonb_build_array(item)) from desvio_private.without_item(s,list,field,item->>field) t;
$$;
create function desvio_private.put_work(s jsonb, record jsonb, media jsonb, placement jsonb) returns jsonb language sql immutable set search_path='' as $$
 select desvio_private.put_item(desvio_private.put_item(desvio_private.put_item(
  desvio_private.without_item(desvio_private.without_item(s,'media','recordId',record->>'id'),'placements','recordId',record->>'id'),
  'records','id',record),'media','id',media),'placements','id',placement);
$$;
create function desvio_private.drop_work(s jsonb, rid text) returns jsonb language sql immutable set search_path='' as $$
 select desvio_private.without_item(desvio_private.without_item(desvio_private.without_item(s,'records','id',rid),'media','recordId',rid),'placements','recordId',rid);
$$;
-- `allowed` limits the swap to these rooms; null means every room.
create function desvio_private.swap_placements(s jsonb, first_id text, second_id text, allowed text[]) returns jsonb language plpgsql set search_path='' as $$
declare x jsonb; second jsonb; begin
 select value into x from jsonb_array_elements(s->'placements') where value->>'recordId'=first_id;
 select value into second from jsonb_array_elements(s->'placements') where value->>'recordId'=second_id;
 if x is null or second is null or x->>'id'=second->>'id' then raise exception 'Escolha duas obras distintas.'; end if;
 if allowed is not null and (not (x->>'roomId'=any(allowed)) or not (second->>'roomId'=any(allowed))) then raise exception 'Troque apenas obras das suas salas.' using errcode='42501'; end if;
 if (select value->>'type' from jsonb_array_elements(s->'media') where value->>'id'=x->>'mediaId')<>(select value->>'type' from jsonb_array_elements(s->'media') where value->>'id'=second->>'mediaId') then raise exception 'Troque obras do mesmo tipo de mídia.'; end if;
 return jsonb_set(s,'{placements}',(select jsonb_agg(case
  when p->>'id'=x->>'id' then p||jsonb_build_object('roomId',second->'roomId','slotId',second->'slotId','position',second->'position','rotation',second->'rotation')
  when p->>'id'=second->>'id' then p||jsonb_build_object('roomId',x->'roomId','slotId',x->'slotId','position',x->'position','rotation',x->'rotation')
  else p end) from jsonb_array_elements(s->'placements') p));
end $$;
do $$ declare f text; begin
 foreach f in array array['without_item(jsonb,text,text,text)','put_item(jsonb,text,text,jsonb)','put_work(jsonb,jsonb,jsonb,jsonb)','drop_work(jsonb,text)','swap_placements(jsonb,text,text,text[])'] loop
  execute format('revoke all on function desvio_private.%s from public',f);
 end loop;
end $$;

create or replace function desvio_private.edit_collection(operation text,payload jsonb,expected_revision bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.desvio_collections; s jsonb; x jsonb; a jsonb; old_order integer; target_id text; st text; begin
 if auth.uid() is null or not desvio_private.is_editor() then raise exception 'Sem permissão de curadoria.' using errcode='42501'; end if;
 c=desvio_private.lock_collection(expected_revision);
 s=coalesce(desvio_private.snapshot(c.draft_version),desvio_private.empty_snapshot());
 case operation
 when 'save_record' then
  target_id=payload->'record'->>'id';
  st=coalesce(payload->'record'->>'status','draft');
  if st not in ('draft','published','archived') then st='draft'; end if;
  x=jsonb_set(payload->'record','{status}',to_jsonb(st));
  if st='published' then x=x-'reviewRequested'; end if;
  s=desvio_private.put_work(s,x,payload->'media',payload->'placement');
 when 'set_record_status' then
  target_id=payload->>'id';
  st=payload->>'status';
  if st is null or st not in ('draft','published','archived') then raise exception 'Status inválido.'; end if;
  if not exists(select 1 from jsonb_array_elements(s->'records') where value->>'id'=target_id) then raise exception 'Obra inexistente.'; end if;
  s=jsonb_set(s,'{records}',(select jsonb_agg(case when value->>'id'=target_id then case when st='published' then jsonb_set(value,'{status}',to_jsonb(st))-'reviewRequested' else jsonb_set(value,'{status}',to_jsonb(st)) end else value end) from jsonb_array_elements(s->'records')));
 when 'delete_record' then s=desvio_private.drop_work(s,payload->>'id');
 when 'swap_placements' then s=desvio_private.swap_placements(s,payload->>'firstId',payload->>'secondId',null);
 when 'delete_artist' then
  if exists(select 1 from jsonb_array_elements(s->'records') r, jsonb_array_elements(r.value->'credits') cr where cr.value->>'artistId'=payload->>'id') then raise exception 'Remova os créditos desta pessoa artista nas obras antes de excluí-la.'; end if;
  if exists(select 1 from jsonb_array_elements(s->'rooms') where coalesce(value->'artistIds','[]') ? (payload->>'id')) then raise exception 'Desvincule esta pessoa artista das salas antes de excluí-la.'; end if;
  s=desvio_private.without_item(s,'artists','id',payload->>'id');
  delete from public.desvio_artist_accounts where artist_id=(payload->>'id')::uuid;
 when 'save_artist' then s=desvio_private.put_item(s,'artists','id',payload);
 -- The on-air state is changed only by publish/archive, never by editing the texts.
 when 'save_exhibition' then
  if jsonb_typeof(payload) is distinct from 'object' then raise exception 'Exposição incompleta.'; end if;
  s=jsonb_set(s,'{exhibition}',payload||jsonb_build_object('status',s->'exhibition'->'status'));
 when 'save_room' then
  select (value->>'order')::integer into old_order from jsonb_array_elements(s->'rooms') where value->>'id'=payload->>'id';
  s=desvio_private.put_item(s,'rooms','id',jsonb_set(payload,'{order}',to_jsonb(coalesce(old_order,jsonb_array_length(s->'rooms')))));
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
 when 'publish' then s=jsonb_set(s,'{exhibition,status}','"published"');
 when 'archive' then s=jsonb_set(s,'{exhibition,status}','"archived"');
 else raise exception 'Operação desconhecida.';
 end case;
 if operation in ('save_record','set_record_status') then perform desvio_private.validate_live_record(s,target_id); end if;
 return desvio_private.commit_edit(c,s,operation);
end $$;

create or replace function desvio_private.artist_edit(operation text,payload jsonb,expected_revision bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.desvio_collections; s jsonb; aid uuid; mine text[]; target_id text; old jsonb; room jsonb; begin
 aid=desvio_private.current_artist();
 if auth.uid() is null or aid is null then raise exception 'Sem permissão de artista.' using errcode='42501'; end if;
 c=desvio_private.lock_collection(expected_revision);
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
  s=desvio_private.put_work(s,jsonb_set(payload->'record','{status}','"draft"')||'{"reviewRequested":true}'::jsonb,payload->'media',payload->'placement');
 when 'delete_record' then
  target_id=payload->>'id';
  select value into old from jsonb_array_elements(s->'placements') where value->>'recordId'=target_id;
  if old is null or not (old->>'roomId'=any(mine)) then raise exception 'Esta obra não está nas suas salas.' using errcode='42501'; end if;
  if (select value->>'status' from jsonb_array_elements(s->'records') where value->>'id'=target_id)<>'draft' then raise exception 'Só obras em rascunho podem ser excluídas. Peça à curadoria para despublicar.'; end if;
  s=desvio_private.drop_work(s,target_id);
 when 'swap_placements' then s=desvio_private.swap_placements(s,payload->>'firstId',payload->>'secondId',mine);
 else raise exception 'Operação não permitida para artistas.' using errcode='42501';
 end case;
 return desvio_private.commit_edit(c,s,'artist:'||operation);
end $$;

-- An import can put works on the site, so it passes the same checks as saving them.
create or replace function desvio_private.replace_draft_from_local(snapshot jsonb,expected_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.desvio_collections; r jsonb; begin
 if auth.uid() is null or not desvio_private.is_editor() then raise exception 'Sem permissão de curadoria.' using errcode='42501'; end if;
 c=desvio_private.lock_collection(expected_revision);
 if coalesce(snapshot->'exhibition'->>'status','')<>'archived' then snapshot=jsonb_set(snapshot,'{exhibition,status}','"published"'); end if;
 snapshot=jsonb_set(snapshot,'{records}',coalesce((select jsonb_agg(case when value->>'status' in ('draft','published','archived') then value else jsonb_set(value,'{status}','"draft"') end) from jsonb_array_elements(snapshot->'records')),'[]'));
 for r in select value from jsonb_array_elements(snapshot->'records') loop
  perform desvio_private.validate_live_record(snapshot,r->>'id');
 end loop;
 return desvio_private.commit_edit(c,snapshot,'replace_draft_local');
end $$;

-- 5. Not called by the app or the Edge Function.
drop function if exists public.desvio_import_local(jsonb,bigint);
drop function if exists desvio_private.import_local(jsonb,bigint);
drop function public.desvio_remove_artist_account(uuid);
drop function desvio_private.remove_artist_account(uuid);
drop function desvio_private.validate_artist_photos(jsonb);
drop function desvio_private.validate_snapshot(jsonb,boolean);

-- 5. Models always reach Storage as GLB: the browser optimizer converts them.
update storage.buckets set allowed_mime_types=array['image/png','image/jpeg','image/webp','model/gltf-binary','audio/mpeg','audio/wav','audio/ogg','audio/mp4'] where id='desvio-media';
notify pgrst,'reload schema';
