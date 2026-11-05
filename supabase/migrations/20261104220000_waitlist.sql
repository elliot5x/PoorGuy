create extension if not exists pgcrypto;

create table if not exists public.waitlist_subscribers (
    id uuid primary key default gen_random_uuid(),
    email text not null check (char_length(email) <= 254),
    email_normalized text not null unique check (char_length(email_normalized) <= 254),
    interest text not null check (interest in ('request_support', 'support_others')),
    consent_at timestamptz not null,
    consent_version text not null,
    confirmed_at timestamptz,
    confirmation_token_hash text,
    confirmation_requested_at timestamptz,
    unsubscribed_at timestamptz,
    unsubscribe_token_hash text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create table if not exists public.waitlist_campaigns (
    id uuid primary key default gen_random_uuid(),
    subject text not null check (char_length(subject) <= 200),
    body text not null check (char_length(body) <= 10000),
    created_at timestamptz not null default now(),
    sent_at timestamptz,
    sent_count integer not null default 0
);

alter table public.waitlist_subscribers enable row level security;
alter table public.waitlist_campaigns enable row level security;

create index if not exists waitlist_subscribers_confirmed_idx
    on public.waitlist_subscribers (confirmed_at, unsubscribed_at, deleted_at);
