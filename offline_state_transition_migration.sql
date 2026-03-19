-- Offline State Transition: Handle Nonce Expiry & App Attest During Reconnection
-- Adds support for offline note creation with deferred attestation

-- Add offline-related columns to saved_notes
alter table if exists public.saved_notes add column if not exists
  offline boolean default false;

alter table if exists public.saved_notes add column if not exists
  attestation_nonce text;

alter table if exists public.saved_notes add column if not exists
  nonce_created_at timestamp with time zone;

alter table if exists public.saved_notes add column if not exists
  attestation_blob bytea;

alter table if exists public.saved_notes add column if not exists
  attested_key_id text;

-- Same for amber_entries (plans created offline)
alter table if exists public.amber_entries add column if not exists
  offline boolean default false;

alter table if exists public.amber_entries add column if not exists
  attestation_nonce text;

alter table if exists public.amber_entries add column if not exists
  nonce_created_at timestamp with time zone;

alter table if exists public.amber_entries add column if not exists
  attestation_blob bytea;

alter table if exists public.amber_entries add column if not exists
  attested_key_id text;

-- Index for finding stale offline entries (nonce older than 5 minutes)
create index if not exists idx_saved_notes_offline_stale
  on public.saved_notes(user_id, nonce_created_at)
  where offline = true and nonce_created_at < now() - interval '5 minutes';

create index if not exists idx_amber_entries_offline_stale
  on public.amber_entries(user_id, nonce_created_at)
  where offline = true and nonce_created_at < now() - interval '5 minutes';

-- Function to mark offline data as online after successful attestation
create or replace function public.mark_as_online(
  p_table text,
  p_id uuid,
  p_user_id uuid
)
returns void as $$
begin
  if p_table = 'saved_notes' then
    update public.saved_notes
    set offline = false,
        attestation_nonce = null,
        nonce_created_at = null,
        attestation_blob = null
    where id = p_id and user_id = p_user_id;
  elsif p_table = 'amber_entries' then
    update public.amber_entries
    set offline = false,
        attestation_nonce = null,
        nonce_created_at = null,
        attestation_blob = null
    where id = p_id and user_id = p_user_id;
  end if;
end;
$$ language plpgsql security definer;

-- Cleanup function: Remove stale offline entries (older than 7 days)
create or replace function public.cleanup_stale_offline_data()
returns void as $$
begin
  delete from public.saved_notes
  where offline = true and created_at < now() - interval '7 days';

  delete from public.amber_entries
  where offline = true and created_at < now() - interval '7 days';
end;
$$ language plpgsql security definer;

-- Grant execute permissions
grant execute on function public.mark_as_online to authenticated;
grant execute on function public.cleanup_stale_offline_data to service_role;
