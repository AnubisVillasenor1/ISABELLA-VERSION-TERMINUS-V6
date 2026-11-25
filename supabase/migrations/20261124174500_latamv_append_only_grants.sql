begin;

revoke all on table public.latamv_assessments from public, anon, authenticated, service_role;
grant select, insert on table public.latamv_assessments to service_role;

commit;
