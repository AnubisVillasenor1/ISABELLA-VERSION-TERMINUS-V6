-- Shared PostgreSQL BookPI pipeline event store.
-- Additive only. Apply via the approved migration process; do not run manually in production.
begin;

create table if not exists public.bookpi_events (
  id text primary key check (length(trim(id)) > 0),
  type text not null check (length(trim(type)) > 0),
  sequence bigint not null unique check (sequence > 0),
  prev_hash text not null check (prev_hash ~ '^[a-fA-F0-9]{64}$'),
  timestamp timestamptz not null,
  actor_id text,
  payload jsonb not null,
  schema_version text not null,
  meta jsonb not null default '{}'::jsonb,
  header jsonb not null,
  hash text not null check (hash ~ '^[a-fA-F0-9]{64}$'),
  integrity text not null,
  canonical text not null,
  created_at timestamptz not null default now()
);

create index if not exists bookpi_events_timestamp_idx
  on public.bookpi_events (timestamp desc);
create index if not exists bookpi_events_actor_sequence_idx
  on public.bookpi_events (actor_id, sequence);

alter table public.bookpi_events enable row level security;
revoke all on table public.bookpi_events from anon, authenticated;
grant select, insert on table public.bookpi_events to service_role;

comment on table public.bookpi_events is
  'Append-only evidence events for the governed BookPI pipeline; chain verification remains application-enforced and is not physical WORM.';

commit;
