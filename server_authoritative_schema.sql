-- Migration: Server-Authoritative Root System
-- Implements a single source of truth for blocking state across all platforms
-- Created: 2026-03-19

-- ==============================================================================
-- 1. CANONICAL CATEGORY MAPPING
-- ==============================================================================

create table if not exists public.resin_categories (
  id uuid primary key default gen_random_uuid(),
  category_id text not null unique,  -- "youtube", "reddit", "instagram", etc.
  display_name text not null,
  description text,

  -- Chrome DNR patterns (JSON array of URL patterns)
  -- Example: ["youtube.com/*", "*.youtube.com/*", "youtubecdn.com/*"]
  chrome_url_patterns jsonb not null default '[]'::jsonb,

  -- iOS app bundle IDs and their opaque FamilyControls tokens
  -- Structure: {
  --   "bundle_ids": ["com.google.YouTubeMusic", "com.google.ios.youtube"],
  --   "app_tokens": [{token: <binary>, name: "YouTube"}],
  --   "category_tokens": [{token: <binary>, name: "Video"}]
  -- }
  -- Populated by iOS clients via upload_ios_tokens() endpoint
  ios_tokens_json jsonb default '{}'::jsonb,

  -- Server-managed metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Enum: 'app' | 'website' | 'category'
  block_type text default 'website'
);

alter table public.resin_categories enable row level security;

-- RLS: Allow all authenticated users to READ categories (shared reference data)
-- But only admins can WRITE
create policy "Anyone can read categories" on public.resin_categories
  for select using (true);

create policy "Only service role can update categories" on public.resin_categories
  for update using (false);  -- Disabled for clients; only service role via Edge Function

-- Index for fast lookups
create index if not exists idx_resin_categories_id on public.resin_categories(category_id);

-- ==============================================================================
-- 2. ACTIVE BLOCKS (Server-Authoritative State)
-- ==============================================================================

create table if not exists public.active_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Reference to the canonical category
  category_id text references public.resin_categories(category_id) not null,

  -- Origin: which amber session triggered this block
  session_id uuid,  -- nullable; could be from automation or manual focus

  -- Server-set timestamps (IMMUTABLE from client perspective via RLS)
  server_start_time timestamptz not null,
  server_end_time timestamptz not null,

  -- Computed: whether this block is currently active
  -- DO NOT store this; compute it as: now() BETWEEN server_start_time AND server_end_time

  -- Client tracking (for acknowledgment)
  acknowledged_at timestamptz,  -- when client last confirmed receipt of this block
  acked_by_platform text,       -- 'ios' | 'extension' | 'web'

  -- Soft-delete pattern (for audit trail)
  cancelled_by_user_at timestamptz,

  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.active_blocks enable row level security;

-- RLS: Users can only see their own active blocks
-- Clients can READ all their blocks, but can only UPDATE the acknowledgment field
create policy "Users see own blocks" on public.active_blocks
  for select using (auth.uid() = user_id);

create policy "Users can update their own blocks" on public.active_blocks
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Prevent user from deleting their own blocks (only soft-delete via Edge Function)
create policy "No direct delete" on public.active_blocks
  for delete using (false);

-- Index for fast queries
create index if not exists idx_active_blocks_user_id on public.active_blocks(user_id);
create index if not exists idx_active_blocks_time on public.active_blocks(user_id, server_start_time, server_end_time);
create index if not exists idx_active_blocks_category on public.active_blocks(user_id, category_id);

-- ==============================================================================
-- 3. iOS TOKEN REGISTRY (Bridge between opaque tokens and categories)
-- ==============================================================================

create table if not exists public.ios_token_registry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Which resin category this token is mapped to
  category_id text references public.resin_categories(category_id) not null,

  -- The opaque token as bytes (base64 encoded for JSON storage)
  token_base64 text not null,

  -- Token type: 'app' | 'category' | 'web_domain'
  token_type text not null,

  -- Human-readable reference (for debugging)
  app_bundle_id text,
  app_name text,

  -- When the user synced this token
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
-- 4. BLOCK AUDIT LOG (For debugging and compliance)
-- ==============================================================================

create table if not exists public.block_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  block_id uuid references public.active_blocks(id) on delete set null,

  -- Event type
  event_type text not null,  -- 'created' | 'acknowledged' | 'cancelled' | 'expired'
  event_details jsonb,

  -- Which platform detected/acknowledged the event
  platform text,  -- 'server' | 'ios' | 'extension' | 'web'

  created_at timestamptz default now()
);

alter table public.block_audit_log enable row level security;

create policy "Users see own audit" on public.block_audit_log
  for select using (auth.uid() = user_id);

create index if not exists idx_audit_user_time on public.block_audit_log(user_id, created_at desc);

-- ==============================================================================
-- 5. REALTIME PUBLICATION CONFIGURATION
-- ==============================================================================

-- Enable realtime for active_blocks so clients can subscribe to changes
alter publication supabase_realtime add table public.active_blocks;
alter publication supabase_realtime add table public.resin_categories;

-- ==============================================================================
-- 6. HELPER FUNCTION: Compute whether a block is currently active
-- ==============================================================================

create or replace function is_block_active(
  block_record active_blocks
)
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
-- 7. TRIGGER: Update updated_at timestamp
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
-- 8. TRIGGER: Enforce immutability of server-set columns
-- ==============================================================================

create or replace function enforce_active_block_immutability()
returns trigger as $$
begin
  -- Prevent modification of server-authoritative columns
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
-- 9. SEED DATA: Common categories
-- ==============================================================================

insert into public.resin_categories (category_id, display_name, description, chrome_url_patterns, block_type)
values
  ('youtube', 'YouTube', 'Video streaming (procrastination hub)', '["youtube.com/*", "*.youtube.com/*", "youtubecdn.com/*", "youtube-nocookie.com/*"]'::jsonb, 'website'),
  ('reddit', 'Reddit', 'Social discussion', '["reddit.com/*", "*.reddit.com/*"]'::jsonb, 'website'),
  ('instagram', 'Instagram', 'Photo sharing', '["instagram.com/*", "*.instagram.com/*"]'::jsonb, 'website'),
  ('facebook', 'Facebook', 'Social network', '["facebook.com/*", "*.facebook.com/*", "fb.com/*"]'::jsonb, 'website'),
  ('twitter', 'Twitter / X', 'Microblogging', '["twitter.com/*", "*.twitter.com/*", "x.com/*", "*.x.com/*"]'::jsonb, 'website'),
  ('tiktok', 'TikTok', 'Short-form video', '["tiktok.com/*", "*.tiktok.com/*", "vm.tiktok.com/*"]'::jsonb, 'website')
on conflict (category_id) do nothing;

-- ==============================================================================
-- GRANT permissions for service role
-- ==============================================================================

grant all on public.resin_categories to service_role;
grant all on public.active_blocks to service_role;
grant all on public.ios_token_registry to service_role;
grant all on public.block_audit_log to service_role;
