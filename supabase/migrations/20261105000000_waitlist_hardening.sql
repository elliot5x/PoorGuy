alter table public.waitlist_subscribers
    add column if not exists confirmation_expires_at timestamptz,
    add column if not exists confirmation_sent_at timestamptz;

create table if not exists public.waitlist_rate_limits (
    scope text not null check (scope in ('ip', 'email')),
    scope_hash text not null,
    window_started_at timestamptz not null,
    attempts integer not null default 0 check (attempts >= 0),
    updated_at timestamptz not null default now(),
    primary key (scope, scope_hash)
);

alter table public.waitlist_rate_limits enable row level security;

