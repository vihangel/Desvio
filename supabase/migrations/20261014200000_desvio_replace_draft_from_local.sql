-- Incremental: lets curators bring a browser-local draft into Supabase even
-- after remote edits exist. Only the draft is replaced; the published edition
-- is untouched until the next explicit publication.
create function desvio_private.replace_draft_from_local(snapshot jsonb,expected_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.desvio_collections; begin
 if auth.uid() is null or not desvio_private.is_editor() then raise exception 'Sem permissão de curadoria.' using errcode='42501'; end if;
 select * into c from public.desvio_collections where id='00000000-0000-4000-8000-000000000030' for update;
 if c.revision<>expected_revision then raise exception 'O acervo mudou. Recarregue antes de importar.' using errcode='40001'; end if;
 snapshot=jsonb_set(snapshot,'{exhibition,status}','"draft"');
 snapshot=jsonb_set(snapshot,'{records}',coalesce((select jsonb_agg(jsonb_set(value,'{status}','"draft"')) from jsonb_array_elements(snapshot->'records')),'[]'));
 perform desvio_private.validate_snapshot(snapshot,false);
 perform desvio_private.write_version(c.draft_version,snapshot);
 update public.desvio_collections set revision=revision+1 where id=c.id;
 insert into public.desvio_editorial_events(collection_id,user_id,operation,revision) values(c.id,auth.uid(),'replace_draft_local',c.revision+1);
 return public.desvio_load_collection();
end $$;
revoke all on function desvio_private.replace_draft_from_local(jsonb,bigint) from public;
grant execute on function desvio_private.replace_draft_from_local(jsonb,bigint) to authenticated;
create function public.desvio_replace_draft_from_local(snapshot jsonb,expected_revision bigint) returns jsonb language sql security invoker set search_path='' as $$ select desvio_private.replace_draft_from_local(snapshot,expected_revision); $$;
revoke all on function public.desvio_replace_draft_from_local(jsonb,bigint) from public,anon;
grant execute on function public.desvio_replace_draft_from_local(jsonb,bigint) to authenticated;
notify pgrst,'reload schema';
