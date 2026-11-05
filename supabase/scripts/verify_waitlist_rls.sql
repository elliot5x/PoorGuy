-- Waitlist RLS audit. This script contains only SELECT statements.

select
    c.relname as table_name,
    c.relrowsecurity as row_security_enabled,
    c.relforcerowsecurity as row_security_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relname like 'waitlist_%'
order by c.relname;

select
    table_schema,
    table_name,
    grantee,
    privilege_type,
    is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name like 'waitlist_%'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

select
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
from pg_policies
where schemaname = 'public'
  and tablename like 'waitlist_%'
order by tablename, policyname;
