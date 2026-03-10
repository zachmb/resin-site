-- Migration: Create blocking_sessions and focus_automations tables
-- This enables the focus scheduling functionality on the web and mobile apps

-- blocking_sessions table - stores user-created blocking sessions (immediate or scheduled)
create table if not exists public.blocking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  device_scheduled boolean default false,
  status text default 'active',
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.blocking_sessions enable row level security;

-- RLS Policy: Users can only see and manage their own sessions
create policy "Users manage own blocking sessions" on public.blocking_sessions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create index for faster queries
create index if not exists idx_blocking_sessions_user_id on public.blocking_sessions(user_id);
create index if not exists idx_blocking_sessions_start_end on public.blocking_sessions(start_time, end_time);

-- focus_automations table - stores recurring focus session automations (daily at specific time on specific days)
create table if not exists public.focus_automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  time text not null, -- format: "HH:MM" (e.g., "14:30")
  duration_minutes integer not null default 25,
  days_of_week text not null, -- comma-separated list of days (e.g., "Monday,Wednesday,Friday")
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.focus_automations enable row level security;

-- RLS Policy: Users can only see and manage their own automations
create policy "Users manage own focus automations" on public.focus_automations
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create index for faster queries
create index if not exists idx_focus_automations_user_id on public.focus_automations(user_id);
