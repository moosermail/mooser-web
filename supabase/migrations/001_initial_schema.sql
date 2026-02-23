-- ─────────────────────────────────────────────────────────────
-- Moosermail — Initial Schema
-- Run this in the Supabase SQL editor or via supabase db push
-- ─────────────────────────────────────────────────────────────

-- ── PROFILES ─────────────────────────────────────────────────
-- One row per user, auto-created by trigger on signup.
create table if not exists public.profiles (
  id                      uuid references auth.users(id) on delete cascade primary key,
  plan                    text not null default 'basic',         -- 'basic' | 'pro'
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  subscription_status     text not null default 'inactive',     -- 'active' | 'canceled' | 'past_due' | 'inactive'
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read and update only their own profile
create policy "profiles: own read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Service role can do anything (bypasses RLS automatically)

-- ── RESEND KEYS ───────────────────────────────────────────────
-- Stores a reference to the encrypted key in Supabase Vault.
-- Raw key is NEVER stored in this table.
create table if not exists public.resend_keys (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null unique,
  vault_secret_id uuid not null,    -- references vault.secrets(id)
  key_hint        text not null,    -- e.g. "re_****abc1" — display only
  from_address    text not null,    -- e.g. "hello@example.com"
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.resend_keys enable row level security;

-- Users can read their own row (hint + from_address only — vault_secret_id is opaque)
create policy "resend_keys: own read"
  on public.resend_keys for select
  using (auth.uid() = user_id);

-- Users cannot insert/update/delete directly — only via the store-key edge function (service role)

-- ── WEBHOOK EVENTS ────────────────────────────────────────────
-- Stripe idempotency guard — stores processed event IDs.
create table if not exists public.webhook_events (
  id            text primary key,   -- Stripe event ID (evt_...)
  type          text not null,
  processed_at  timestamptz not null default now()
);

alter table public.webhook_events enable row level security;

-- No user access — service role only
-- (no policies created = deny by default for non-service-role)

-- ── AUTO-CREATE PROFILE TRIGGER ───────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop and recreate trigger to avoid duplicates on re-run
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- ── UPDATED_AT HELPER ─────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_resend_keys_updated_at on public.resend_keys;
create trigger set_resend_keys_updated_at
  before update on public.resend_keys
  for each row execute procedure public.set_updated_at();
