begin;

alter function public.atlas_knowledge_guard_claim_version() set search_path = '';
alter function public.atlas_knowledge_set_updated_at() set search_path = '';
alter function public.atlas_knowledge_guard_source_identity() set search_path = '';

commit;
