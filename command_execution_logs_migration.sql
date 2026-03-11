-- Migration: Create command_execution_logs table for auditing command execution results

create table if not exists public.command_execution_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- The command that was executed
  command text not null,

  -- Whether execution succeeded
  success boolean not null,

  -- Result message/error
  message text,

  -- When it was executed
  executed_at timestamp with time zone not null default now()
);

-- Add RLS policies
alter table public.command_execution_logs enable row level security;

create policy "Users view own execution logs" on public.command_execution_logs
  for select
  using (auth.uid() = user_id);

-- Create index for faster lookups
create index if not exists idx_command_execution_logs_user_id on public.command_execution_logs(user_id);
create index if not exists idx_command_execution_logs_executed_at on public.command_execution_logs(executed_at);
