-- MyZenTribe base schema (Postgres / Supabase)
-- Users come from auth.users; we store profiles here.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  is_business boolean default false,
  business_name text,
  website_url text,
  bio text,
  created_at timestamptz default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  location text,
  latitude double precision,
  longitude double precision,
  is_private boolean default false,
  address_private boolean default false,
  phone_visible boolean default false,
  rrule text, -- recurrence rule (e.g. 'FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1')
  created_at timestamptz default now()
);

create table if not exists public.event_attendees (
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  status text check (status in ('going','interested','declined')) default 'going',
  created_at timestamptz default now(),
  primary key (event_id, user_id)
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete set null,
  name text not null,
  description text,
  is_private boolean default false,
  region text,
  created_at timestamptz default now()
);

create table if not exists public.community_members (
  community_id uuid references public.communities(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text check (role in ('member','moderator','owner')) default 'member',
  created_at timestamptz default now(),
  primary key (community_id, user_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  community_id uuid references public.communities(id) on delete cascade,
  kind text check (kind in ('discussion','karma','announcement')) default 'discussion',
  content text,
  is_anonymous boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  content text,
  glimmers text[],
  created_at timestamptz default now()
);

create table if not exists public.meditation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz,
  visibility text check (visibility in ('public','anonymous')) default 'anonymous',
  created_at timestamptz default now()
);

create table if not exists public.whats_new (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  published_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.posts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.meditation_sessions enable row level security;

-- Simple policies (adapt as needed)
create policy "profiles read" on public.profiles
  for select using (true);
create policy "profiles write own" on public.profiles
  for insert with check (auth.uid() = id)
  using (auth.uid() = id);
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id);

create policy "events read" on public.events for select using (true);
create policy "events insert auth" on public.events for insert with check (auth.uid() is not null);
create policy "events update own" on public.events for update using (auth.uid() = host_id);
create policy "events delete own" on public.events for delete using (auth.uid() = host_id);

create policy "event attendees read" on public.event_attendees for select using (true);
create policy "event attendees modify self" on public.event_attendees
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "communities read" on public.communities for select using (true);
create policy "communities insert auth" on public.communities for insert with check (auth.uid() is not null);
create policy "communities update owner" on public.communities for update using (
  exists (select 1 from public.community_members m where m.community_id = id and m.user_id = auth.uid() and m.role = 'owner')
);
create policy "community members read" on public.community_members for select using (true);
create policy "community members self-manage" on public.community_members
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "posts read" on public.posts for select using (true);
create policy "posts insert auth" on public.posts for insert with check (auth.uid() is not null);
create policy "posts update own" on public.posts for update using (auth.uid() = author_id);
create policy "journal read own" on public.journal_entries for select using (auth.uid() = author_id);
create policy "journal write own" on public.journal_entries for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "meditation read" on public.meditation_sessions for select using (true);
create policy "meditation write own" on public.meditation_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
