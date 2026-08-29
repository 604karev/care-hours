begin;

create extension if not exists pgcrypto;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Моя рабочая область',
  currency_code text not null default 'PLN' check (char_length(currency_code) = 3),
  timezone text not null default 'Europe/Warsaw',
  locale text not null default 'ru',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  unique (user_id)
);

create table public.service_types (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  code text not null check (char_length(code) between 1 and 16),
  background_color text not null default '#86B875',
  text_color text not null default '#18331F',
  rate_unit text not null default 'hourly' check (rate_unit in ('hourly', 'per_visit')),
  rate_amount numeric(12, 2) not null default 0 check (rate_amount >= 0),
  currency_code text not null default 'PLN' check (char_length(currency_code) = 3),
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, code),
  unique (id, workspace_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  full_name text,
  client_code text,
  address text,
  phone text,
  default_service_type_id uuid,
  typical_start_time time,
  typical_duration_minutes integer check (typical_duration_minutes > 0),
  planned_minutes_per_month integer check (planned_minutes_per_month >= 0),
  planned_visits_per_month integer check (planned_visits_per_month >= 0),
  active_from date,
  active_to date,
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, client_code),
  unique (id, workspace_id),
  foreign key (default_service_type_id, workspace_id)
    references public.service_types(id, workspace_id)
    on delete restrict,
  check (active_to is null or active_from is null or active_to >= active_from)
);

create table public.client_rate_overrides (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null,
  service_type_id uuid not null,
  rate_unit text not null check (rate_unit in ('hourly', 'per_visit')),
  rate_amount numeric(12, 2) not null check (rate_amount >= 0),
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, workspace_id)
    references public.clients(id, workspace_id)
    on delete cascade,
  foreign key (service_type_id, workspace_id)
    references public.service_types(id, workspace_id)
    on delete cascade,
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null,
  service_type_id uuid not null,
  visit_date date not null,
  start_time time not null,
  end_time time not null,
  unpaid_break_minutes integer not null default 0 check (unpaid_break_minutes >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  rate_unit_snapshot text not null check (rate_unit_snapshot in ('hourly', 'per_visit')),
  rate_amount_snapshot numeric(12, 2) not null check (rate_amount_snapshot >= 0),
  currency_code_snapshot text not null check (char_length(currency_code_snapshot) = 3),
  service_name_snapshot text not null,
  background_color_snapshot text not null,
  text_color_snapshot text not null,
  amount_snapshot numeric(12, 2) not null check (amount_snapshot >= 0),
  short_note text check (char_length(short_note) <= 300),
  series_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, workspace_id)
    references public.clients(id, workspace_id)
    on delete restrict,
  foreign key (service_type_id, workspace_id)
    references public.service_types(id, workspace_id)
    on delete restrict,
  check (end_time > start_time),
  check (unpaid_break_minutes < duration_minutes + unpaid_break_minutes)
);

create index visits_workspace_date_idx on public.visits(workspace_id, visit_date);
create index visits_client_date_idx on public.visits(client_id, visit_date);

create table public.day_markers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null,
  marker_date date not null,
  label text not null check (char_length(label) between 1 and 80),
  background_color text not null,
  text_color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, workspace_id)
    references public.clients(id, workspace_id)
    on delete cascade
);

create table public.monthly_sheets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  year integer not null check (year between 2000 and 2200),
  month integer not null check (month between 1 and 12),
  status text not null default 'open' check (status in ('open', 'locked')),
  locked_at timestamptz,
  totals_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, year, month)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  event_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workspaces_set_updated_at before update on public.workspaces
for each row execute function public.set_updated_at();
create trigger service_types_set_updated_at before update on public.service_types
for each row execute function public.set_updated_at();
create trigger clients_set_updated_at before update on public.clients
for each row execute function public.set_updated_at();
create trigger client_rate_overrides_set_updated_at before update on public.client_rate_overrides
for each row execute function public.set_updated_at();
create trigger visits_set_updated_at before update on public.visits
for each row execute function public.set_updated_at();
create trigger day_markers_set_updated_at before update on public.day_markers
for each row execute function public.set_updated_at();
create trigger monthly_sheets_set_updated_at before update on public.monthly_sheets
for each row execute function public.set_updated_at();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;

create or replace function public.ensure_personal_workspace()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  existing_workspace_id uuid;
  new_workspace_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtext(current_user_id::text));

  select workspace_id
  into existing_workspace_id
  from public.workspace_members
  where user_id = current_user_id
  limit 1;

  if existing_workspace_id is not null then
    return existing_workspace_id;
  end if;

  insert into public.workspaces default values
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, current_user_id, 'owner');

  return new_workspace_id;
end;
$$;

revoke all on function public.ensure_personal_workspace() from public;
grant execute on function public.ensure_personal_workspace() to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.service_types enable row level security;
alter table public.clients enable row level security;
alter table public.client_rate_overrides enable row level security;
alter table public.visits enable row level security;
alter table public.day_markers enable row level security;
alter table public.monthly_sheets enable row level security;
alter table public.audit_events enable row level security;

create policy workspaces_member_select on public.workspaces
for select to authenticated
using (public.is_workspace_member(id));

create policy workspace_members_self_select on public.workspace_members
for select to authenticated
using (user_id = auth.uid());

create policy service_types_member_all on public.service_types
for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy clients_member_all on public.clients
for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy client_rate_overrides_member_all on public.client_rate_overrides
for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy visits_member_all on public.visits
for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy day_markers_member_all on public.day_markers
for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy monthly_sheets_member_all on public.monthly_sheets
for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy audit_events_member_select on public.audit_events
for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy audit_events_member_insert on public.audit_events
for insert to authenticated
with check (public.is_workspace_member(workspace_id));

commit;
