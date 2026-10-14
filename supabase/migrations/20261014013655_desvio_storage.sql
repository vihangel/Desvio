insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('desvio-media','desvio-media',false,24000000,array['image/png','image/jpeg','image/webp','model/gltf-binary'])
on conflict(id) do nothing;
create function desvio_private.can_read_media(bucket text,path text) returns boolean language sql stable security definer set search_path='' as $$
 select desvio_private.is_editor() or exists(
 select 1 from public.desvio_media m join public.desvio_collections c on c.published_version=m.version_id
 join public.desvio_versions v on v.id=c.published_version
 where v.exhibition->>'status'='published' and m.content->>'bucket'=bucket and m.content->>'path'=path);
$$;
revoke all on function desvio_private.can_read_media(text,text) from public;
grant execute on function desvio_private.can_read_media(text,text) to anon,authenticated;
create function desvio_private.media_referenced(bucket text,path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.desvio_media m where m.content->>'bucket'=bucket and m.content->>'path'=path);
$$;
revoke all on function desvio_private.media_referenced(text,text) from public;
grant execute on function desvio_private.media_referenced(text,text) to authenticated;
create policy desvio_media_read on storage.objects for select to anon,authenticated
 using(bucket_id='desvio-media' and desvio_private.can_read_media(bucket_id,name));
create policy desvio_media_upload on storage.objects for insert to authenticated
 with check(bucket_id='desvio-media' and desvio_private.is_editor() and split_part(name,'/',1)=auth.uid()::text);
-- No overwrites: editions always point to immutable, uniquely named files.
create policy desvio_media_remove_orphan on storage.objects for delete to authenticated
 using(bucket_id='desvio-media' and desvio_private.is_editor() and split_part(name,'/',1)=auth.uid()::text and not desvio_private.media_referenced(bucket_id,name));
