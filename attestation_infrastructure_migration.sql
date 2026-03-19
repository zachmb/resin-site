-- Attestation Infrastructure: Phase 2B - Hardware-Bound Identity Moat
-- Tables and RPC functions for App Attest nonce management and key storage

-- ===========================
-- TABLE 1: Attestation Challenges (Nonce Management)
-- ===========================
create table if not exists public.attestation_challenges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  nonce text not null unique,

  -- Nonce TTL: 5 minutes (300 seconds)
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null,

  -- Replay protection: mark when nonce is consumed
  consumed_at timestamp with time zone,

  -- Audit trail
  consumed_by_key_id text,

  constraint nonce_not_empty check (nonce != '')
);

-- Indexes for fast lookups
create index if not exists idx_attestation_challenges_user_id on public.attestation_challenges(user_id);
create index if not exists idx_attestation_challenges_nonce on public.attestation_challenges(nonce);
create index if not exists idx_attestation_challenges_expires_at on public.attestation_challenges(expires_at);

-- Cleanup expired nonces daily
create or replace function public.cleanup_expired_nonces()
returns void as $$
begin
  delete from public.attestation_challenges
  where expires_at < now() - interval '1 day';
end;
$$ language plpgsql security definer;

-- ===========================
-- TABLE 2: Attested Keys (Verified Hardware Keys)
-- ===========================
create table if not exists public.attested_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  key_id text not null,

  -- CBOR-encoded attestation object from Apple
  attestation_blob bytea,

  -- aaguid identifies the type of attestator:
  -- 'appattest' = Production device (iOS 14+)
  -- 'appattestdevelop' = Development device (simulator/beta)
  aaguid text not null,

  -- Environment flag: 'prod' or 'sandbox'
  environment text not null check (environment in ('prod', 'sandbox')),

  -- Timestamp when key was verified
  attested_at timestamp with time zone not null,

  -- Audit trail
  created_at timestamp with time zone default now(),
  last_assertion_at timestamp with time zone,
  assertion_count int default 0,

  constraint key_id_not_empty check (key_id != '')
);

-- Indexes for fast lookups
create index if not exists idx_attested_keys_user_id on public.attested_keys(user_id);
create index if not exists idx_attested_keys_key_id on public.attested_keys(key_id);
create index if not exists idx_attested_keys_environment on public.attested_keys(environment);

-- ===========================
-- RPC FUNCTION: Atomic Nonce Validation & Consumption
-- ===========================
-- This function prevents replay attacks by atomically:
-- 1. Checking nonce exists
-- 2. Checking nonce hasn't been consumed
-- 3. Checking nonce hasn't expired
-- 4. Marking nonce as consumed (all in one transaction)
create or replace function public.verify_and_consume_nonce(
  p_nonce text,
  p_user_id uuid
)
returns table(
  valid boolean,
  error_message text
) as $$
declare
  v_nonce_record record;
begin
  -- Acquire row lock to prevent race condition
  select id, expires_at, consumed_at
  into v_nonce_record
  from public.attestation_challenges
  where nonce = p_nonce
    and user_id = p_user_id
  for update;

  -- Check if nonce exists
  if v_nonce_record is null then
    return query select false, 'Nonce not found'::text;
    return;
  end if;

  -- Check if already consumed (replay attack)
  if v_nonce_record.consumed_at is not null then
    return query select false, 'Nonce already consumed (replay attack detected)'::text;
    return;
  end if;

  -- Check expiration
  if v_nonce_record.expires_at < now() then
    return query select false, 'Nonce expired'::text;
    return;
  end if;

  -- Mark as consumed
  update public.attestation_challenges
  set consumed_at = now()
  where nonce = p_nonce;

  -- Return success
  return query select true, ''::text;
end;
$$ language plpgsql security definer;

-- ===========================
-- RPC FUNCTION: Update Assertion Stats (for auditing)
-- ===========================
create or replace function public.record_assertion(
  p_user_id uuid,
  p_key_id text
)
returns void as $$
begin
  update public.attested_keys
  set
    last_assertion_at = now(),
    assertion_count = assertion_count + 1
  where user_id = p_user_id
    and key_id = p_key_id;
end;
$$ language plpgsql security definer;

-- ===========================
-- ROW LEVEL SECURITY
-- ===========================
-- Users can only read/write their own attestation data
alter table public.attestation_challenges enable row level security;
alter table public.attested_keys enable row level security;

-- Challenge policy: only user who created it can read/update
create policy "Users can read own attestation challenges"
  on public.attestation_challenges
  for select
  using (auth.uid() = user_id);

create policy "Users can create attestation challenges"
  on public.attestation_challenges
  for insert
  with check (auth.uid() = user_id);

-- Key policy: only user who owns it can read
create policy "Users can read own attested keys"
  on public.attested_keys
  for select
  using (auth.uid() = user_id);

-- Edge functions (service role) can insert/update
create policy "Service role can manage attested keys"
  on public.attested_keys
  for all
  using (
    (select auth.role()) = 'service_role'
  );

-- ===========================
-- GRANTS (for Edge Functions)
-- ===========================
grant usage on schema public to authenticated;
grant execute on function public.verify_and_consume_nonce to authenticated;
grant execute on function public.record_assertion to authenticated;

-- Allow Edge Functions to call RPC directly
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- ===========================
-- REALTIME SUBSCRIPTIONS
-- ===========================
-- Edge functions need to broadcast to clients
alter publication supabase_realtime add table public.attestation_challenges;
alter publication supabase_realtime add table public.attested_keys;
