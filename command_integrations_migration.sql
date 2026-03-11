-- Migration: Create command_integrations table for automation command configs
-- Stores user credentials and settings for custom claw: commands

create table if not exists public.command_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Command type: send-email, webhook, slack, telegram, discord, twitter, notion
  command_type text not null,

  -- Configuration stored as JSON for flexibility
  -- Examples:
  -- send-email: { email_address: "user@example.com" }
  -- webhook: { url: "https://example.com/webhook" }
  -- slack: { webhook_url: "https://hooks.slack.com/...", channel: "#general" }
  -- telegram: { bot_token: "...", chat_id: "..." }
  -- discord: { webhook_url: "https://discordapp.com/api/webhooks/..." }
  -- twitter: { api_key: "...", api_secret: "...", access_token: "...", access_token_secret: "..." }
  -- notion: { api_key: "...", database_id: "..." }
  config jsonb not null default '{}'::jsonb,

  -- Whether this integration is enabled
  enabled boolean not null default true,

  -- Timestamps
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  -- Unique constraint: one config per user per command type
  unique(user_id, command_type)
);

-- Add RLS policies
alter table public.command_integrations enable row level security;

create policy "Users manage own command integrations" on public.command_integrations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create index for faster lookups
create index if not exists idx_command_integrations_user_id on public.command_integrations(user_id);
create index if not exists idx_command_integrations_enabled on public.command_integrations(user_id, enabled);
