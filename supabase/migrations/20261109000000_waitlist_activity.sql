alter table public.waitlist_admin_events
    add column if not exists ip_hash text,
    add column if not exists result text,
    add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists waitlist_admin_events_created_at_idx
    on public.waitlist_admin_events (created_at desc);

create table if not exists public.waitlist_revoked_admin_sessions (
    jti text primary key,
    expires_at timestamptz not null,
    revoked_at timestamptz not null default now()
);

alter table public.waitlist_revoked_admin_sessions enable row level security;
alter table public.waitlist_revoked_admin_sessions force row level security;

revoke all privileges on table public.waitlist_admin_events,
    public.waitlist_revoked_admin_sessions
from anon, authenticated;
