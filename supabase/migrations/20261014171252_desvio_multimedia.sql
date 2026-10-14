-- Incremental: apply after collection and Storage migrations, without resetting data.
DO $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.desvio_media'::regclass and contype='c' and pg_get_constraintdef(oid) like '%type%' loop
  execute format('alter table public.desvio_media drop constraint %I',c.conname);
 end loop;
end $$;
alter table public.desvio_media add constraint desvio_media_type_check check(content->>'type' in ('image','model','video'));
update storage.buckets set file_size_limit=24000000, allowed_mime_types=array['image/png','image/jpeg','image/webp','model/gltf-binary','application/octet-stream','audio/mpeg','audio/wav','audio/ogg','audio/mp4'] where id='desvio-media';
create or replace function desvio_private.validate_snapshot(s jsonb, publishing boolean) returns void language plpgsql set search_path='' as $$
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
  if x->>'type'='video' and coalesce(x->>'src','') !~ '^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$' then raise exception 'Informe um link canônico válido do YouTube.'; end if;
  if x ? 'modelFormat' and x->>'modelFormat' not in ('glb','stl','obj') then raise exception 'Formato 3D inválido.'; end if;
  if x ? 'narration' then
   if jsonb_typeof(x->'narration') is distinct from 'object' or not ((x->'narration') ?& array['credits','transcript','authorized']) then raise exception 'Narração incompleta.'; end if;
   if (coalesce(x->'narration'->>'path','')='') <> (coalesce(x->'narration'->>'bucket','')='') then raise exception 'Vínculo de áudio inválido.'; end if;
   if coalesce(x->'narration'->>'bucket','desvio-media')<>'desvio-media' or coalesce(x->'narration'->>'path','') ~ '(^/|\.\.)' then raise exception 'Caminho de áudio inválido.'; end if;
   if coalesce(x->'narration'->>'src','')<>'' and x->'narration'->>'src' !~ '^https?://' then raise exception 'Envie o áudio ao Storage.'; end if;
   if coalesce(x->'narration'->>'src','')='' and coalesce(x->'narration'->>'path','')='' then raise exception 'Envie o áudio do artista.'; end if;
   if publishing and ((x->'narration'->>'authorized')::boolean is distinct from true or coalesce(trim(x->'narration'->>'credits'),'')='' or coalesce(trim(x->>'authorization'),'')='') then raise exception 'Registre autorização e créditos da narração.'; end if;
  end if;
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

create or replace function desvio_private.can_read_media(bucket text,path text) returns boolean language sql stable security definer set search_path='' as $$
 select desvio_private.is_editor() or exists(
 select 1 from public.desvio_media m join public.desvio_collections c on c.published_version=m.version_id
 join public.desvio_versions v on v.id=c.published_version
 where v.exhibition->>'status'='published' and
 ((m.content->>'bucket'=bucket and m.content->>'path'=path) or
 (m.content->'narration'->>'bucket'=bucket and m.content->'narration'->>'path'=path)));
$$;
create or replace function desvio_private.media_referenced(bucket text,path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.desvio_media m where
 (m.content->>'bucket'=bucket and m.content->>'path'=path) or
 (m.content->'narration'->>'bucket'=bucket and m.content->'narration'->>'path'=path));
$$;
notify pgrst,'reload schema';
