-- Safe Migration: Server-Authoritative Root System
-- Drops and recreates to ensure clean state

-- ==============================================================================
-- CLEANUP: Drop existing policies and triggers only
-- ==============================================================================

drop policy if exists "Anyone can read categories" on public.resin_categories;
drop policy if exists "Only service role can update categories" on public.resin_categories;
drop policy if exists "Users see own blocks" on public.active_blocks;
drop policy if exists "Users can update their own blocks" on public.active_blocks;
drop policy if exists "No direct delete" on public.active_blocks;
drop policy if exists "Users manage own tokens" on public.ios_token_registry;
drop policy if exists "Users can upload tokens" on public.ios_token_registry;
drop policy if exists "Users can update token confirmations" on public.ios_token_registry;
drop policy if exists "Users see own audit" on public.block_audit_log;

drop trigger if exists update_resin_categories_updated_at on public.resin_categories;
drop trigger if exists update_active_blocks_updated_at on public.active_blocks;
drop trigger if exists enforce_block_immutability on public.active_blocks;

drop function if exists enforce_active_block_immutability();
drop function if exists is_block_active(active_blocks);

-- NOTE: update_updated_at_column() is shared with other tables, so we keep it

-- ==============================================================================
-- 1. CANONICAL CATEGORY MAPPING
-- ==============================================================================

create table if not exists public.resin_categories (
  id uuid primary key default gen_random_uuid(),
  category_id text not null unique,
  display_name text not null,
  description text,
  chrome_url_patterns jsonb not null default '[]'::jsonb,
  ios_tokens_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  block_type text default 'website'
);

alter table public.resin_categories enable row level security;

create policy "Anyone can read categories" on public.resin_categories
  for select using (true);

create policy "Only service role can update categories" on public.resin_categories
  for update using (false);

create index if not exists idx_resin_categories_id on public.resin_categories(category_id);

-- ==============================================================================
-- 2. ACTIVE BLOCKS (Server-Authoritative State)
-- ==============================================================================

create table if not exists public.active_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id text references public.resin_categories(category_id) not null,
  session_id uuid,
  server_start_time timestamptz not null,
  server_end_time timestamptz not null,
  acknowledged_at timestamptz,
  acked_by_platform text,
  cancelled_by_user_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.active_blocks enable row level security;

create policy "Users see own blocks" on public.active_blocks
  for select using (auth.uid() = user_id);

create policy "Users can update their own blocks" on public.active_blocks
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "No direct delete" on public.active_blocks
  for delete using (false);

create index if not exists idx_active_blocks_user_id on public.active_blocks(user_id);
create index if not exists idx_active_blocks_time on public.active_blocks(user_id, server_start_time, server_end_time);
create index if not exists idx_active_blocks_category on public.active_blocks(user_id, category_id);

-- ==============================================================================
-- 3. iOS TOKEN REGISTRY
-- ==============================================================================

create table if not exists public.ios_token_registry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id text references public.resin_categories(category_id) not null,
  token_base64 text not null,
  token_type text not null,
  app_bundle_id text,
  app_name text,
  uploaded_at timestamptz default now(),
  last_confirmed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.ios_token_registry enable row level security;

create policy "Users manage own tokens" on public.ios_token_registry
  for select using (auth.uid() = user_id);

create policy "Users can upload tokens" on public.ios_token_registry
  for insert with check (auth.uid() = user_id);

create policy "Users can update token confirmations" on public.ios_token_registry
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_ios_token_user_category on public.ios_token_registry(user_id, category_id);

-- ==============================================================================
-- 4. BLOCK AUDIT LOG
-- ==============================================================================

create table if not exists public.block_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  block_id uuid references public.active_blocks(id) on delete set null,
  event_type text not null,
  event_details jsonb,
  platform text,
  created_at timestamptz default now()
);

alter table public.block_audit_log enable row level security;

create policy "Users see own audit" on public.block_audit_log
  for select using (auth.uid() = user_id);

create index if not exists idx_audit_user_time on public.block_audit_log(user_id, created_at desc);

-- ==============================================================================
-- 5. REALTIME PUBLICATION
-- ==============================================================================

alter publication supabase_realtime add table public.active_blocks;
alter publication supabase_realtime add table public.resin_categories;

-- ==============================================================================
-- 6. HELPER FUNCTION
-- ==============================================================================

create or replace function is_block_active(block_record active_blocks)
returns boolean as $$
begin
  return (
    now() >= block_record.server_start_time AND
    now() < block_record.server_end_time AND
    block_record.cancelled_by_user_at is null
  );
end;
$$ language plpgsql stable;

-- ==============================================================================
-- 7. TRIGGERS: Update timestamps
-- ==============================================================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_resin_categories_updated_at
  before update on public.resin_categories
  for each row
  execute function update_updated_at_column();

create trigger update_active_blocks_updated_at
  before update on public.active_blocks
  for each row
  execute function update_updated_at_column();

-- ==============================================================================
-- 8. TRIGGER: Enforce immutability
-- ==============================================================================

create or replace function enforce_active_block_immutability()
returns trigger as $$
begin
  if (OLD.server_start_time IS DISTINCT FROM NEW.server_start_time OR
      OLD.server_end_time IS DISTINCT FROM NEW.server_end_time OR
      OLD.user_id IS DISTINCT FROM NEW.user_id OR
      OLD.category_id IS DISTINCT FROM NEW.category_id OR
      OLD.session_id IS DISTINCT FROM NEW.session_id)
  then
    raise exception 'Cannot modify server-authoritative columns: server_start_time, server_end_time, user_id, category_id, session_id' using errcode = 'IMMUTABLE';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger enforce_block_immutability
  before update on public.active_blocks
  for each row
  execute function enforce_active_block_immutability();

-- ==============================================================================
-- 9. SEED DATA
-- ==============================================================================

delete from public.resin_categories where category_id in ('youtube', 'reddit', 'instagram', 'facebook', 'twitter', 'tiktok');

insert into public.resin_categories (category_id, display_name, description, chrome_url_patterns, block_type)
values
  ('youtube', 'YouTube', 'Video streaming (procrastination hub)', '["youtube.com/*", "*.youtube.com/*", "youtubecdn.com/*", "youtube-nocookie.com/*"]'::jsonb, 'website'),
  ('reddit', 'Reddit', 'Social discussion', '["reddit.com/*", "*.reddit.com/*"]'::jsonb, 'website'),
  ('instagram', 'Instagram', 'Photo sharing', '["instagram.com/*", "*.instagram.com/*"]'::jsonb, 'website'),
  ('facebook', 'Facebook', 'Social network', '["facebook.com/*", "*.facebook.com/*", "fb.com/*"]'::jsonb, 'website'),
  ('twitter', 'Twitter / X', 'Microblogging', '["twitter.com/*", "*.twitter.com/*", "x.com/*", "*.x.com/*"]'::jsonb, 'website'),
  ('tiktok', 'TikTok', 'Short-form video', '["tiktok.com/*", "*.tiktok.com/*", "vm.tiktok.com/*"]'::jsonb, 'website');

-- ==============================================================================
-- PERMISSIONS
-- ==============================================================================

grant all on public.resin_categories to service_role;
grant all on public.active_blocks to service_role;
grant all on public.ios_token_registry to service_role;
grant all on public.block_audit_log to service_role;
