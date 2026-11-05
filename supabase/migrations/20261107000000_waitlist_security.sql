-- Restrict the Waitlist tables to backend roles that use the service-role key.
revoke all privileges on table public.waitlist_subscribers,
    public.waitlist_campaigns,
    public.waitlist_rate_limits,
    public.waitlist_admin_attempts,
    public.waitlist_templates,
    public.waitlist_sends,
    public.waitlist_admin_events
from anon, authenticated;

-- Identity sequences are also exposed through PostgREST and need explicit protection.
revoke all privileges on sequence public.waitlist_admin_attempts_id_seq
from anon, authenticated;

alter table public.waitlist_subscribers enable row level security;
alter table public.waitlist_campaigns enable row level security;
alter table public.waitlist_rate_limits enable row level security;
alter table public.waitlist_admin_attempts enable row level security;
alter table public.waitlist_templates enable row level security;
alter table public.waitlist_sends enable row level security;
alter table public.waitlist_admin_events enable row level security;

alter table public.waitlist_subscribers force row level security;
alter table public.waitlist_campaigns force row level security;
alter table public.waitlist_rate_limits force row level security;
alter table public.waitlist_admin_attempts force row level security;
alter table public.waitlist_templates force row level security;
alter table public.waitlist_sends force row level security;
alter table public.waitlist_admin_events force row level security;

-- Prevent future tables in public from becoming accessible to API roles by default.
alter default privileges in schema public
    revoke all privileges on tables from anon, authenticated;
alter default privileges in schema public
    revoke all privileges on sequences from anon, authenticated;
