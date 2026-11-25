-- =============================================================================
-- Family-App Supabase Database Schema
-- Idempotent, Security-Hardened Schema for Profiles, Wichteln & Family Events
-- Project: yoenyfrwlilcbhklfucr
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Table: public.profiles
-- User profiles linked directly to Supabase auth.users
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  birthday date,
  avatar_color text default '#9E2A2B',
  wishlist text default '',
  updated_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 2. Auth Triggers: Auto-Confirm & New User Registration
-- Security hardened: search_path = '' and NEVER trusts client-supplied role metadata.
-- The very first user inserted into public.profiles automatically becomes 'admin';
-- all subsequent users become 'member'.
-- -----------------------------------------------------------------------------
create or replace function public.auto_confirm_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end;
$$;

revoke all on function public.auto_confirm_user() from public, anon, authenticated;

drop trigger if exists before_auth_user_created on auth.users;
create trigger before_auth_user_created
  before insert on auth.users
  for each row execute function public.auto_confirm_user();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role text;
begin
  if not exists (select 1 from public.profiles) then
    assigned_role := 'admin';
  else
    assigned_role := 'member';
  end if;

  insert into public.profiles (id, email, username, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1)),
    assigned_role
  )
  on conflict (id) do update set
    email = excluded.email,
    username = coalesce(nullif(public.profiles.username, ''), excluded.username);

  insert into public.wichtel_participants (round_id, user_id)
  select r.id, new.id
  from public.wichtel_rounds r
  where r.status = 'open'
  on conflict (round_id, user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 3. Table: public.wichtel_rounds
-- Annual Secret Santa (Wichteln) rounds with budget, dates, colors & exclusions
-- -----------------------------------------------------------------------------
create table if not exists public.wichtel_rounds (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  year int not null,
  budget text default '',
  event_date date,
  status text not null default 'open' check (status in ('open', 'drawn', 'archived')),
  colors jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 4. Table: public.wichtel_participants
-- Participants in a Wichtel round, including wishlist and secret partner draw
-- -----------------------------------------------------------------------------
create table if not exists public.wichtel_participants (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.wichtel_rounds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  wishlist_note text default '',
  assigned_partner_id uuid references public.profiles(id) on delete set null,
  assigned_color_name text,
  assigned_color_hex text,
  revealed boolean not null default false,
  unique(round_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 5. Table: public.family_events
-- Shared family calendar events with RSVP attendance
-- -----------------------------------------------------------------------------
create table if not exists public.family_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  event_date date not null,
  event_time text default '',
  location text default '',
  category text not null default 'gathering' check (category in ('christmas', 'birthday', 'gathering', 'vacation', 'other')),
  created_by uuid references public.profiles(id) on delete set null,
  attendees jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 6. Foreign-Key & Query Performance Indexes
-- -----------------------------------------------------------------------------
create index if not exists idx_wichtel_participants_round_id
  on public.wichtel_participants(round_id);

create index if not exists idx_wichtel_participants_user_id
  on public.wichtel_participants(user_id);

create index if not exists idx_wichtel_participants_partner_id
  on public.wichtel_participants(assigned_partner_id);

create index if not exists idx_family_events_created_by
  on public.family_events(created_by);

create index if not exists idx_family_events_event_date
  on public.family_events(event_date);

-- -----------------------------------------------------------------------------
-- 7. Grants & Row Level Security (RLS)
-- -----------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.wichtel_rounds to authenticated;
grant select, insert, update, delete on public.wichtel_participants to authenticated;
grant select, insert, update, delete on public.family_events to authenticated;

alter table public.profiles enable row level security;
alter table public.wichtel_rounds enable row level security;
alter table public.wichtel_participants enable row level security;
alter table public.family_events enable row level security;

-- Policies for public.profiles
drop policy if exists "Authenticated users can select profiles" on public.profiles;
create policy "Authenticated users can select profiles"
  on public.profiles for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can insert profiles" on public.profiles;
create policy "Authenticated users can insert profiles"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Authenticated users can update profiles" on public.profiles;
create policy "Authenticated users can update profiles"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id or exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  ))
  with check ((select auth.uid()) = id or exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  ));

-- Policies for public.wichtel_rounds
drop policy if exists "Authenticated users can select wichtel_rounds" on public.wichtel_rounds;
create policy "Authenticated users can select wichtel_rounds"
  on public.wichtel_rounds for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can insert wichtel_rounds" on public.wichtel_rounds;
create policy "Authenticated users can insert wichtel_rounds"
  on public.wichtel_rounds for insert to authenticated
  with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can update wichtel_rounds" on public.wichtel_rounds;
create policy "Authenticated users can update wichtel_rounds"
  on public.wichtel_rounds for update to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can delete wichtel_rounds" on public.wichtel_rounds;
create policy "Authenticated users can delete wichtel_rounds"
  on public.wichtel_rounds for delete to authenticated
  using ((select auth.uid()) is not null);

-- Policies for public.wichtel_participants
drop policy if exists "Authenticated users can select wichtel_participants" on public.wichtel_participants;
create policy "Authenticated users can select wichtel_participants"
  on public.wichtel_participants for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can insert wichtel_participants" on public.wichtel_participants;
create policy "Authenticated users can insert wichtel_participants"
  on public.wichtel_participants for insert to authenticated
  with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can update wichtel_participants" on public.wichtel_participants;
create policy "Authenticated users can update wichtel_participants"
  on public.wichtel_participants for update to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can delete wichtel_participants" on public.wichtel_participants;
create policy "Authenticated users can delete wichtel_participants"
  on public.wichtel_participants for delete to authenticated
  using ((select auth.uid()) is not null);

-- Policies for public.family_events
drop policy if exists "Authenticated users can select family_events" on public.family_events;
create policy "Authenticated users can select family_events"
  on public.family_events for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can insert family_events" on public.family_events;
create policy "Authenticated users can insert family_events"
  on public.family_events for insert to authenticated
  with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can update family_events" on public.family_events;
create policy "Authenticated users can update family_events"
  on public.family_events for update to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can delete family_events" on public.family_events;
create policy "Authenticated users can delete family_events"
  on public.family_events for delete to authenticated
  using ((select auth.uid()) is not null);

-- -----------------------------------------------------------------------------
-- 8. Initial Seed Data (only inserted when tables are empty)
-- -----------------------------------------------------------------------------
insert into public.wichtel_rounds (title, year, budget, event_date, status, colors, exclusions)
select
  'Weihnachten 2026',
  2026,
  '',
  '2026-12-24',
  'open',
  '[
    {"name":"Rot","hex":"#dc2626"},
    {"name":"Blau","hex":"#2563eb"},
    {"name":"Grün","hex":"#16a34a"},
    {"name":"Gelb","hex":"#eab308"},
    {"name":"Orange","hex":"#ea580c"},
    {"name":"Lila","hex":"#9333ea"},
    {"name":"Rosa","hex":"#ec4899"},
    {"name":"Türkis","hex":"#0d9488"},
    {"name":"Braun","hex":"#92400e"},
    {"name":"Schwarz","hex":"#18181b"},
    {"name":"Weiß","hex":"#f8fafc"},
    {"name":"Grau","hex":"#64748b"}
  ]'::jsonb,
  '[]'::jsonb
where not exists (select 1 from public.wichtel_rounds);

insert into public.family_events (title, description, event_date, event_time, location, category, attendees)
select * from (
  values
    ('Adventskaffee & Plätzchenbacken', 'Gemeinsames Plätzchenbacken und erster Glühwein in der Küche.', date '2026-11-29', '15:00', 'Zuhause', 'christmas', '{}'::jsonb),
    ('Nikolaus-Spaziergang', 'Kleiner Winterspaziergang mit heißem Kakao danach.', date '2026-12-06', '14:30', 'Stadtwald', 'gathering', '{}'::jsonb),
    ('Heiligabend & Großes Wichteln', 'Bescherung, gemeinsames Essen und Auflösung der Wichtel-Farben!', date '2026-12-24', '18:00', 'Bei der Familie', 'christmas', '{}'::jsonb)
) as seed(title, description, event_date, event_time, location, category, attendees)
where not exists (select 1 from public.family_events);
