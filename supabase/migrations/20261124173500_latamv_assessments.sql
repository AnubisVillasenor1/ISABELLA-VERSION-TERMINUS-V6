begin;

create table if not exists public.latamv_assessments (
  assessment_id text primary key check (char_length(assessment_id) between 1 and 120),
  system_name text not null check (char_length(system_name) between 1 and 160),
  system_version text not null check (char_length(system_version) between 1 and 80),
  jurisdictions jsonb not null check (jsonb_typeof(jurisdictions) = 'array'),
  assessment jsonb not null check (jsonb_typeof(assessment) = 'object'),
  assessment_hash text not null check (assessment_hash ~ '^[a-f0-9]{128}$'),
  created_at timestamptz not null default now()
);

create index if not exists latamv_assessments_created_at_idx
  on public.latamv_assessments (created_at desc);

alter table public.latamv_assessments enable row level security;
revoke all on table public.latamv_assessments from anon, authenticated;
grant select, insert on table public.latamv_assessments to service_role;

comment on table public.latamv_assessments is
  'Append-only, private LATAMV evaluation records; service-role access only through the Isabella backend.';

commit;
