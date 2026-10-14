-- Apply to a dedicated Desvio project. No existing app tables are modified.
create schema if not exists desvio_private;
revoke all on schema desvio_private from public;
grant usage on schema desvio_private to anon, authenticated;
create table public.desvio_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('curator','admin'))
);
alter table public.desvio_memberships enable row level security;
revoke all on public.desvio_memberships from anon, authenticated;
create function desvio_private.is_editor() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.desvio_memberships where user_id = auth.uid() and role in ('curator','admin'));
$$;
revoke all on function desvio_private.is_editor() from public;
grant execute on function desvio_private.is_editor() to anon, authenticated;
create function public.desvio_is_editor() returns boolean language sql stable security invoker set search_path='' as $$ select desvio_private.is_editor(); $$;
revoke all on function public.desvio_is_editor() from public;
grant execute on function public.desvio_is_editor() to anon, authenticated;

create table public.desvio_collections (
 id uuid primary key, revision bigint not null default 0, draft_version uuid, published_version uuid
);
create table public.desvio_versions (
 id uuid primary key default gen_random_uuid(), collection_id uuid not null references public.desvio_collections(id),
 exhibition jsonb not null, created_at timestamptz not null default now()
);
alter table public.desvio_collections add foreign key(draft_version) references public.desvio_versions(id);
alter table public.desvio_collections add foreign key(published_version) references public.desvio_versions(id);
create table public.desvio_artists (
 version_id uuid references public.desvio_versions(id) on delete cascade, id uuid not null, content jsonb not null,
 primary key(version_id,id), check(length(trim(content->>'name'))>0)
);
create table public.desvio_records (
 version_id uuid references public.desvio_versions(id) on delete cascade, id uuid not null, content jsonb not null,
 primary key(version_id,id), check(length(trim(content->>'title'))>0)
);
create table public.desvio_media (
 version_id uuid not null, id uuid not null, record_id uuid not null, content jsonb not null,
 primary key(version_id,id), unique(version_id,id,record_id),
 foreign key(version_id,record_id) references public.desvio_records(version_id,id) on delete cascade,
 check(content->>'type' in ('image','model')), check(content->>'rights' in ('demo','reference','licensed','preview'))
);
create table public.desvio_media_authorizations (
 version_id uuid not null, media_id uuid not null, authorization_note text,
 primary key(version_id,media_id), foreign key(version_id,media_id) references public.desvio_media(version_id,id) on delete cascade
);
create table public.desvio_rooms (
 version_id uuid references public.desvio_versions(id) on delete cascade, id uuid not null, sort_order integer not null check(sort_order>=0), content jsonb not null,
 primary key(version_id,id), unique(version_id,sort_order), check(length(trim(content->>'name'))>0)
);
create table public.desvio_placements (
 version_id uuid not null, id uuid not null, record_id uuid not null, media_id uuid not null, room_id uuid not null, slot_id text not null, content jsonb not null,
 primary key(version_id,id), unique(version_id,room_id,slot_id),
 foreign key(version_id,record_id) references public.desvio_records(version_id,id),
 foreign key(version_id,media_id,record_id) references public.desvio_media(version_id,id,record_id),
 foreign key(version_id,room_id) references public.desvio_rooms(version_id,id)
);
create index desvio_placements_record on public.desvio_placements(version_id,record_id);
create index desvio_media_paths on public.desvio_media((content->>'bucket'),(content->>'path'));
create table public.desvio_editorial_events (
 id bigint generated always as identity primary key, collection_id uuid references public.desvio_collections(id),
 user_id uuid references auth.users(id), operation text not null, revision bigint not null, created_at timestamptz not null default now()
);
-- Anonymous readers only see the currently published edition, not old editions or drafts.
create function desvio_private.can_read_version(v uuid) returns boolean language sql stable security definer set search_path='' as $$
 select desvio_private.is_editor() or exists(select 1 from public.desvio_collections c join public.desvio_versions e on e.id=c.published_version where e.id=v and e.exhibition->>'status'='published');
$$;
revoke all on function desvio_private.can_read_version(uuid) from public;
grant execute on function desvio_private.can_read_version(uuid) to anon, authenticated;
do $$ declare t text; begin
 foreach t in array array['desvio_collections','desvio_versions','desvio_artists','desvio_records','desvio_media','desvio_rooms','desvio_placements','desvio_media_authorizations','desvio_editorial_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to anon, authenticated',t);
  if t='desvio_collections' then execute format('create policy read on public.%I for select to anon, authenticated using (true)',t);
  elsif t in ('desvio_media_authorizations','desvio_editorial_events') then execute format('create policy read on public.%I for select to anon, authenticated using (desvio_private.is_editor())',t);
  elsif t='desvio_versions' then execute format('create policy read on public.%I for select to anon, authenticated using (desvio_private.can_read_version(id))',t);
  else execute format('create policy read on public.%I for select to anon, authenticated using (desvio_private.can_read_version(version_id))',t); end if;
 end loop;
end $$;
create function desvio_private.empty_snapshot() returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('artists','[]'::jsonb,'records','[]'::jsonb,'media','[]'::jsonb,'placements','[]'::jsonb,
 'rooms',jsonb_build_array(jsonb_build_object('id','00000000-0000-4000-8000-000000000010','name','Primeira sala','subtitle','','template','corridor','order',0)),
 'exhibition',jsonb_build_object('id','00000000-0000-4000-8000-000000000020','title','Desvio','subtitle','','status','draft','beginsAt','','endsAt','','notice',''));
$$;
create function desvio_private.snapshot(v uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'exhibition',e.exhibition,
 'artists',coalesce((select jsonb_agg(content order by id) from public.desvio_artists where version_id=v),'[]'::jsonb),
 'records',coalesce((select jsonb_agg(content order by id) from public.desvio_records where version_id=v),'[]'::jsonb),
 'media',coalesce((select jsonb_agg(m.content || case when a.authorization_note is not null then jsonb_build_object('authorization',a.authorization_note) else '{}'::jsonb end order by m.id) from public.desvio_media m left join public.desvio_media_authorizations a on a.version_id=m.version_id and a.media_id=m.id where m.version_id=v),'[]'::jsonb),
 'rooms',coalesce((select jsonb_agg(content order by sort_order) from public.desvio_rooms where version_id=v),'[]'::jsonb),
 'placements',coalesce((select jsonb_agg(content order by room_id,slot_id,id) from public.desvio_placements where version_id=v),'[]'::jsonb))
 from public.desvio_versions e where id=v;
$$;
grant execute on function desvio_private.empty_snapshot(), desvio_private.snapshot(uuid) to anon, authenticated;
revoke all on function desvio_private.empty_snapshot(), desvio_private.snapshot(uuid) from public;
create function public.desvio_load_collection() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('version',3,'revision',c.revision,
 'draft',case when desvio_private.is_editor() then coalesce(desvio_private.snapshot(c.draft_version),desvio_private.empty_snapshot()) else desvio_private.empty_snapshot() end,
 'published',coalesce(desvio_private.snapshot(c.published_version),desvio_private.empty_snapshot()))
 from public.desvio_collections c where id='00000000-0000-4000-8000-000000000030';
$$;
revoke all on function public.desvio_load_collection() from public;
grant execute on function public.desvio_load_collection() to anon, authenticated;

-- Payload validation is repeated server-side; browser validation is only UX.
create function desvio_private.validate_snapshot(s jsonb, publishing boolean) returns void language plpgsql set search_path='' as $$
declare x jsonb; room jsonb; n integer; ord integer; axis jsonb; p text; k text; begin
 foreach k in array array['artists','records','media','rooms','placements'] loop
  if jsonb_typeof(s->k) is distinct from 'array' then raise exception 'Coleção inválida: %.',k; end if;
 end loop;
 if jsonb_typeof(s->'exhibition') is distinct from 'object' or not ((s->'exhibition') ?& array['id','title','subtitle','status','beginsAt','endsAt','notice']) then raise exception 'Exposição incompleta.'; end if;
 for x in select value from jsonb_array_elements(s->'artists') loop
  if not(x ?& array['id','name','location','bio','source']) or coalesce(trim(x->>'name'),'')='' then raise exception 'Artista incompleto.'; end if;
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
  if x->>'status' not in ('draft','in_review','published','archived') then raise exception 'Estado inválido.'; end if;
  if length(trim(x->>'title'))=0 or (x->>'year')::integer not between 0 and 9999 then raise exception 'Registro inválido.'; end if;
  if jsonb_array_length(x->'credits')=0 and coalesce(trim(x->>'creditNote'),'')='' then raise exception 'Informe autoria.'; end if;
  if exists(select 1 from jsonb_array_elements(x->'credits') a where not exists(select 1 from jsonb_array_elements(s->'artists') b where b->>'id'=a->>'artistId')) then raise exception 'Artista inexistente.'; end if;
  if coalesce(x->>'source','')<>'' and (x->>'source') !~ '^https?://' then raise exception 'Fonte inválida.'; end if;
  if publishing and coalesce(trim(x->>'description'),'')='' then raise exception 'Complete a descrição.'; end if;
 end loop;
 for x in select value from jsonb_array_elements(s->'media') loop
  if not(x ?& array['id','recordId','type','alt','attribution','rights']) then raise exception 'Mídia incompleta.'; end if;
  if (coalesce(x->>'path','')='') <> (coalesce(x->>'bucket','')='') then raise exception 'Bucket e caminho precisam estar vinculados.'; end if;
  if publishing and x->>'rights'='reference' and not exists(select 1 from jsonb_array_elements(s->'records') r where r->>'id'=x->>'recordId' and coalesce(r->>'source','')<>'') then raise exception 'Registros de pesquisa precisam de fonte.'; end if;
  if coalesce(x->>'src','')<>'' and (x->>'src') !~ '^(https?://|/art/|/brand/)' then raise exception 'Envie a mídia ao Storage.'; end if;
  if coalesce(x->>'path','')<>'' and ((x->>'bucket')<>'desvio-media' or (x->>'path') ~ '(^/|\.\.)') then raise exception 'Caminho de mídia inválido.'; end if;
  if x->>'type'='image' and (coalesce(x->>'alt','')='' or (coalesce(x->>'src','')='' and coalesce(x->>'path','')='')) then raise exception 'Imagem e descrição acessível obrigatórias.'; end if;
  if publishing and x->>'rights'='preview' then raise exception 'Registre autorização antes de publicar a prévia.'; end if;
  if publishing and x->>'rights'='licensed' and (coalesce(trim(x->>'authorization'),'')='' or coalesce(trim(x->>'attribution'),'')='') then raise exception 'Autorização e créditos obrigatórios.'; end if;
  if publishing and x->>'type'='model' and x->>'rights'<>'demo' and coalesce(x->>'src','')='' and coalesce(x->>'path','')='' then raise exception 'Envie o modelo 3D.'; end if;
 end loop;
 if publishing and jsonb_array_length(s->'placements')=0 then raise exception 'Adicione obras antes de publicar.'; end if;
 for x in select value from jsonb_array_elements(s->'placements') loop
  if not(x ?& array['id','roomId','recordId','mediaId','slotId','position','rotation','scale']) then raise exception 'Montagem incompleta.'; end if;
  select value into room from jsonb_array_elements(s->'rooms') where value->>'id'=x->>'roomId';
  if room is null then raise exception 'Sala inexistente.'; end if;
  select value->>'type' into p from jsonb_array_elements(s->'media') where value->>'id'=x->>'mediaId' and value->>'recordId'=x->>'recordId';
  if p is null then raise exception 'Vínculo de mídia inválido.'; end if;
  if p='image' then
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
revoke all on function desvio_private.validate_snapshot(jsonb,boolean) from public;
-- This privileged function is only reached from the checked editor command.
create function desvio_private.write_version(v uuid, s jsonb) returns void language plpgsql set search_path='' as $$
begin
 delete from public.desvio_placements where version_id=v;
 delete from public.desvio_media where version_id=v;
 delete from public.desvio_records where version_id=v;
 delete from public.desvio_artists where version_id=v;
 delete from public.desvio_rooms where version_id=v;
 update public.desvio_versions set exhibition=s->'exhibition' where id=v;
 insert into public.desvio_artists select v,(x->>'id')::uuid,x from jsonb_array_elements(s->'artists') x;
 insert into public.desvio_records select v,(x->>'id')::uuid,x from jsonb_array_elements(s->'records') x;
 insert into public.desvio_rooms select v,(x->>'id')::uuid,(x->>'order')::int,x from jsonb_array_elements(s->'rooms') x;
 insert into public.desvio_media select v,(x->>'id')::uuid,(x->>'recordId')::uuid,x-'authorization' from jsonb_array_elements(s->'media') x;
 insert into public.desvio_media_authorizations select v,(x->>'id')::uuid,x->>'authorization' from jsonb_array_elements(s->'media') x where x ? 'authorization';
 insert into public.desvio_placements select v,(x->>'id')::uuid,(x->>'recordId')::uuid,(x->>'mediaId')::uuid,(x->>'roomId')::uuid,x->>'slotId',x from jsonb_array_elements(s->'placements') x;
end $$;
revoke all on function desvio_private.write_version(uuid,jsonb) from public;
create function desvio_private.edit_collection(operation text,payload jsonb,expected_revision bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.desvio_collections; s jsonb; x jsonb; a jsonb; v uuid; old_order integer; target_id text; second jsonb; begin
 if auth.uid() is null or not desvio_private.is_editor() then raise exception 'Sem permissão de curadoria.' using errcode='42501'; end if;
 select * into c from public.desvio_collections where id='00000000-0000-4000-8000-000000000030' for update;
 if c.revision<>expected_revision then raise exception 'O acervo mudou. Recarregue antes de salvar.' using errcode='40001'; end if;
 s=coalesce(desvio_private.snapshot(c.draft_version),desvio_private.empty_snapshot());
 case operation
 when 'save_record' then
  target_id=payload->'record'->>'id';
  s=jsonb_set(s,'{records}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'records') where value->>'id'<>target_id),'[]') || jsonb_build_array(jsonb_set(payload->'record','{status}','"draft"')));
  s=jsonb_set(s,'{media}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'media') where value->>'recordId'<>target_id),'[]') || jsonb_build_array(payload->'media'));
  s=jsonb_set(s,'{placements}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'placements') where value->>'recordId'<>target_id),'[]') || jsonb_build_array(payload->'placement'));
 when 'delete_record' then
  foreach target_id in array array['records','media','placements'] loop
   s=jsonb_set(s,array[target_id],coalesce((select jsonb_agg(value) from jsonb_array_elements(s->target_id) where value->>(case when target_id='records' then 'id' else 'recordId' end)<>payload->>'id'),'[]'));
  end loop;
 when 'swap_placements' then
  select value into x from jsonb_array_elements(s->'placements') where value->>'recordId'=payload->>'firstId';
  select value into second from jsonb_array_elements(s->'placements') where value->>'recordId'=payload->>'secondId';
  if x is null or second is null or x->>'id'=second->>'id' then raise exception 'Escolha duas obras distintas.'; end if;
  if (select value->>'type' from jsonb_array_elements(s->'media') where value->>'id'=x->>'mediaId')<>(select value->>'type' from jsonb_array_elements(s->'media') where value->>'id'=second->>'mediaId') then raise exception 'Troque obras do mesmo tipo de mídia.'; end if;
  s=jsonb_set(s,'{placements}',(select jsonb_agg(case when p->>'id'=x->>'id' then p||jsonb_build_object('roomId',second->'roomId','slotId',second->'slotId','position',second->'position','rotation',second->'rotation') when p->>'id'=second->>'id' then p||jsonb_build_object('roomId',x->'roomId','slotId',x->'slotId','position',x->'position','rotation',x->'rotation') else p end) from jsonb_array_elements(s->'placements') p));
 when 'save_artist' then s=jsonb_set(s,'{artists}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'artists') where value->>'id'<>payload->>'id'),'[]')||jsonb_build_array(payload));
 when 'save_exhibition' then s=jsonb_set(s,'{exhibition}',payload);
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
 when 'review' then s=jsonb_set(s,'{exhibition,status}','"in_review"');
 when 'publish' then
  if s->'exhibition'->>'status'<>'in_review' then raise exception 'Envie para revisão antes de publicar.'; end if;
  s=jsonb_set(s,'{exhibition,status}','"published"');
 when 'archive' then s=jsonb_set(s,'{exhibition,status}','"archived"');
 else raise exception 'Operação desconhecida.';
 end case;
 if operation not in ('review','publish','archive') then s=jsonb_set(s,'{exhibition,status}','"draft"'); end if;
 perform desvio_private.validate_snapshot(s,operation in ('review','publish'));
 if operation in ('review','publish') then
  s=jsonb_set(s,'{records}',coalesce((select jsonb_agg(jsonb_set(value,'{status}',to_jsonb(case operation when 'review' then 'in_review' else 'published' end))) from jsonb_array_elements(s->'records')),'[]'));
 end if;
 -- Publication copies a complete immutable edition in the same transaction.
 perform desvio_private.write_version(c.draft_version,s);
 if operation='publish' then
  insert into public.desvio_versions(collection_id,exhibition) values(c.id,s->'exhibition') returning id into v;
  perform desvio_private.write_version(v,s);
  update public.desvio_collections set published_version=v where id=c.id;
 elsif operation='archive' then update public.desvio_collections set published_version=null where id=c.id; end if;
 update public.desvio_collections set revision=revision+1 where id=c.id;
 insert into public.desvio_editorial_events(collection_id,user_id,operation,revision) values(c.id,auth.uid(),operation,c.revision+1);
 return public.desvio_load_collection();
end $$;
revoke all on function desvio_private.edit_collection(text,jsonb,bigint) from public;
grant execute on function desvio_private.edit_collection(text,jsonb,bigint) to authenticated;
create function public.desvio_edit_collection(operation text,payload jsonb,expected_revision bigint) returns jsonb
language sql security invoker set search_path='' as $$ select desvio_private.edit_collection(operation,payload,expected_revision); $$;
revoke all on function public.desvio_edit_collection(text,jsonb,bigint) from public;
grant execute on function public.desvio_edit_collection(text,jsonb,bigint) to authenticated;
insert into public.desvio_collections(id) values('00000000-0000-4000-8000-000000000030');
with v as (insert into public.desvio_versions(collection_id,exhibition) values('00000000-0000-4000-8000-000000000030',desvio_private.empty_snapshot()->'exhibition') returning id)
update public.desvio_collections set draft_version=v.id from v;
select desvio_private.write_version(draft_version,desvio_private.empty_snapshot()) from public.desvio_collections;
