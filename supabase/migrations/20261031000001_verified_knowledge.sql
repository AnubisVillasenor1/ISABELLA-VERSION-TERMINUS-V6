begin;

create table if not exists public.verified_knowledge (
  id text primary key check (length(trim(id)) > 0),
  content text not null check (length(trim(content)) > 0),
  source text not null check (length(trim(source)) > 0),
  verified_at timestamptz not null,
  confidence_level text not null check (confidence_level in ('E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6')),
  created_at timestamptz not null default now()
);

create index if not exists verified_knowledge_verified_at_idx
  on public.verified_knowledge (verified_at desc);

alter table public.verified_knowledge enable row level security;
revoke all on table public.verified_knowledge from anon, authenticated;
grant select, insert, update on table public.verified_knowledge to service_role;

comment on table public.verified_knowledge is 'Server-side verified memory records with epistemic confidence level and source provenance.';

commit;
