-- Incremental: each work carries its own status (draft, published, archived).
-- Every editor command rewrites the public edition from the saved works whose
-- status is "published", so there is no separate review/publish step.
-- The exhibition status only says whether the whole site is on air
-- ("published") or taken down ("archived").

create function desvio_private.public_edition(s jsonb) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object(
  'exhibition',jsonb_set(s->'exhibition','{status}','"published"'),
  'artists',s->'artists',
  'rooms',s->'rooms',
  'records',coalesce((select jsonb_agg(r.value) from jsonb_array_elements(s->'records') r where r.value->>'status'='published'),'[]'),
  'media',coalesce((select jsonb_agg(m.value) from jsonb_array_elements(s->'media') m where exists(select 1 from jsonb_array_elements(s->'records') r where r.value->>'id'=m.value->>'recordId' and r.value->>'status'='published')),'[]'),
  'placements',coalesce((select jsonb_agg(p.value) from jsonb_array_elements(s->'placements') p where exists(select 1 from jsonb_array_elements(s->'records') r where r.value->>'id'=p.value->>'recordId' and r.value->>'status'='published')),'[]'));
$$;
revoke all on function desvio_private.public_edition(jsonb) from public;

-- Checks that apply when a work goes (or stays) live.
create function desvio_private.validate_live_record(s jsonb, rid text) returns void language plpgsql set search_path='' as $$
declare r jsonb; m jsonb; begin
 select value into r from jsonb_array_elements(s->'records') where value->>'id'=rid;
 if r is null or r->>'status'<>'published' then return; end if;
 select value into m from jsonb_array_elements(s->'media') where value->>'recordId'=rid;
 if coalesce(trim(r->>'description'),'')='' then raise exception 'Para publicar “%”, preencha a descrição.',r->>'title'; end if;
 if m->>'type'='model' and m->>'rights'<>'demo' and coalesce(m->>'src','')='' and coalesce(m->>'path','')='' then raise exception 'Envie o arquivo 3D antes de publicar.'; end if;
 if m->>'rights'='licensed' and (coalesce(trim(m->>'authorization'),'')='' or coalesce(trim(m->>'attribution'),'')='') then raise exception 'Registre autorização e créditos da mídia licenciada.'; end if;
 if m->>'rights'='reference' and coalesce(r->>'source','')='' then raise exception 'Registros de pesquisa precisam de fonte para publicar.'; end if;
 if m ? 'narration' and ((m->'narration'->>'authorized')::boolean is distinct from true or coalesce(trim(m->'narration'->>'credits'),'')='' or coalesce(trim(m->>'authorization'),'')='') then raise exception 'Registre autorização e créditos da narração antes de publicar.'; end if;
end $$;
revoke all on function desvio_private.validate_live_record(jsonb,text) from public;

create function desvio_private.sync_public(cid uuid, s jsonb) returns void language plpgsql set search_path='' as $$
declare v uuid; p jsonb; begin
 if s->'exhibition'->>'status'='archived' then
  update public.desvio_collections set published_version=null where id=cid;
  return;
 end if;
 p=desvio_private.public_edition(s);
 perform desvio_private.validate_snapshot(p,false);
 select published_version into v from public.desvio_collections where id=cid;
 if v is null then
  insert into public.desvio_versions(collection_id,exhibition) values(cid,p->'exhibition') returning id into v;
  update public.desvio_collections set published_version=v where id=cid;
 end if;
 perform desvio_private.write_version(v,p);
end $$;
revoke all on function desvio_private.sync_public(uuid,jsonb) from public;

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
  s=jsonb_set(s,'{records}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'records') where value->>'id'<>target_id),'[]') || jsonb_build_array(jsonb_set(payload->'record','{status}',to_jsonb(st))));
  s=jsonb_set(s,'{media}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'media') where value->>'recordId'<>target_id),'[]') || jsonb_build_array(payload->'media'));
  s=jsonb_set(s,'{placements}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'placements') where value->>'recordId'<>target_id),'[]') || jsonb_build_array(payload->'placement'));
 when 'set_record_status' then
  target_id=payload->>'id';
  st=payload->>'status';
  if st is null or st not in ('draft','published','archived') then raise exception 'Status inválido.'; end if;
  if not exists(select 1 from jsonb_array_elements(s->'records') where value->>'id'=target_id) then raise exception 'Obra inexistente.'; end if;
  s=jsonb_set(s,'{records}',(select jsonb_agg(case when value->>'id'=target_id then jsonb_set(value,'{status}',to_jsonb(st)) else value end) from jsonb_array_elements(s->'records')));
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
 if operation in ('save_record','set_record_status') then perform desvio_private.validate_live_record(s,target_id); end if;
 perform desvio_private.write_version(c.draft_version,s);
 perform desvio_private.sync_public(c.id,s);
 update public.desvio_collections set revision=revision+1 where id=c.id;
 insert into public.desvio_editorial_events(collection_id,user_id,operation,revision) values(c.id,auth.uid(),operation,c.revision+1);
 return public.desvio_load_collection();
end $$;

create or replace function desvio_private.replace_draft_from_local(snapshot jsonb,expected_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.desvio_collections; begin
 if auth.uid() is null or not desvio_private.is_editor() then raise exception 'Sem permissão de curadoria.' using errcode='42501'; end if;
 select * into c from public.desvio_collections where id='00000000-0000-4000-8000-000000000030' for update;
 if c.revision<>expected_revision then raise exception 'O acervo mudou. Recarregue antes de importar.' using errcode='40001'; end if;
 if coalesce(snapshot->'exhibition'->>'status','')<>'archived' then snapshot=jsonb_set(snapshot,'{exhibition,status}','"published"'); end if;
 snapshot=jsonb_set(snapshot,'{records}',coalesce((select jsonb_agg(case when value->>'status' in ('draft','published','archived') then value else jsonb_set(value,'{status}','"draft"') end) from jsonb_array_elements(snapshot->'records')),'[]'));
 perform desvio_private.validate_snapshot(snapshot,false);
 perform desvio_private.write_version(c.draft_version,snapshot);
 perform desvio_private.sync_public(c.id,snapshot);
 update public.desvio_collections set revision=revision+1 where id=c.id;
 insert into public.desvio_editorial_events(collection_id,user_id,operation,revision) values(c.id,auth.uid(),'replace_draft_local',c.revision+1);
 return public.desvio_load_collection();
end $$;

-- One-time conversion: works currently on the site become "published", the
-- rest stay "draft"; the public edition is then rebuilt from the saved works.
do $convert$ declare c public.desvio_collections; s jsonb; pub jsonb; begin
 select * into c from public.desvio_collections where id='00000000-0000-4000-8000-000000000030' for update;
 if c.id is null then return; end if;
 s=coalesce(desvio_private.snapshot(c.draft_version),desvio_private.empty_snapshot());
 pub=case when c.published_version is null then null else desvio_private.snapshot(c.published_version) end;
 s=jsonb_set(s,'{records}',coalesce((select jsonb_agg(jsonb_set(r.value,'{status}',to_jsonb(case
   when r.value->>'status'='archived' then 'archived'
   when pub is not null and exists(select 1 from jsonb_array_elements(pub->'records') p where p.value->>'id'=r.value->>'id') then 'published'
   else 'draft' end))) from jsonb_array_elements(s->'records') r),'[]'));
 s=jsonb_set(s,'{exhibition,status}',case when pub is null or pub->'exhibition'->>'status'<>'published' then '"archived"' else '"published"' end::jsonb);
 perform desvio_private.write_version(c.draft_version,s);
 perform desvio_private.sync_public(c.id,s);
end $convert$;
notify pgrst,'reload schema';
