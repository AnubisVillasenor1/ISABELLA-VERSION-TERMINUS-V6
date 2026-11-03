begin;

create table if not exists public.atlas_hcu_nodes (
  owner_key_hash char(64) not null,
  id uuid not null,
  name varchar(140) not null,
  domain varchar(80) not null,
  influence numeric(6, 3) not null check (influence between 0 and 1),
  risk numeric(6, 3) not null check (risk between 0 and 1),
  evidence numeric(6, 3) not null check (evidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atlas_hcu_nodes_pkey primary key (owner_key_hash, id)
);

create table if not exists public.atlas_hcu_edges (
  owner_key_hash char(64) not null,
  id uuid not null,
  source_node_id uuid not null,
  target_node_id uuid not null,
  effect_sign smallint not null check (effect_sign in (-1, 1)),
  strength numeric(6, 3) not null check (strength between 0.1 and 1),
  lag_years integer not null check (lag_years >= 0),
  evidence_source varchar(600) not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atlas_hcu_edges_pkey primary key (owner_key_hash, id),
  constraint atlas_hcu_edges_source_node_fk
    foreign key (owner_key_hash, source_node_id)
    references public.atlas_hcu_nodes (owner_key_hash, id)
    on delete cascade,
  constraint atlas_hcu_edges_target_node_fk
    foreign key (owner_key_hash, target_node_id)
    references public.atlas_hcu_nodes (owner_key_hash, id)
    on delete cascade
);

create index if not exists atlas_hcu_nodes_owner_updated_idx
  on public.atlas_hcu_nodes (owner_key_hash, updated_at desc);
create index if not exists atlas_hcu_edges_owner_source_idx
  on public.atlas_hcu_edges (owner_key_hash, source_node_id);
create index if not exists atlas_hcu_edges_owner_target_idx
  on public.atlas_hcu_edges (owner_key_hash, target_node_id);

create or replace function public.atlas_hcu_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger atlas_hcu_nodes_updated_at
before update on public.atlas_hcu_nodes
for each row execute function public.atlas_hcu_set_updated_at();

create trigger atlas_hcu_edges_updated_at
before update on public.atlas_hcu_edges
for each row execute function public.atlas_hcu_set_updated_at();

alter table public.atlas_hcu_nodes enable row level security;
alter table public.atlas_hcu_edges enable row level security;

revoke all on table public.atlas_hcu_nodes, public.atlas_hcu_edges from anon, authenticated;
grant select, insert, update, delete on table public.atlas_hcu_nodes, public.atlas_hcu_edges to service_role;
revoke all on function public.atlas_hcu_set_updated_at() from public, anon, authenticated;
grant execute on function public.atlas_hcu_set_updated_at() to service_role;

comment on table public.atlas_hcu_nodes is 'User-scoped Atlas HCU prototype nodes. Scores are hypotheses, not measurements.';
comment on table public.atlas_hcu_edges is 'User-scoped directional causal hypotheses with explicit sign, strength, lag, and citable evidence.';

commit;
