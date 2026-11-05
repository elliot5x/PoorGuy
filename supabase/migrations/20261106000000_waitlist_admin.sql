create table if not exists public.waitlist_admin_attempts (
    id bigint generated always as identity primary key,
    ip_hash text,
    global_key text not null default 'global',
    attempted_at timestamptz not null default now()
);

create table if not exists public.waitlist_templates (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    subject text not null check (char_length(subject) <= 200),
    html_body text not null check (char_length(html_body) <= 30000),
    text_body text not null check (char_length(text_body) <= 30000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.waitlist_sends (
    id uuid primary key default gen_random_uuid(),
    template_id uuid references public.waitlist_templates(id) on delete set null,
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    total_count integer not null default 0,
    success_count integer not null default 0,
    failure_count integer not null default 0
);

create table if not exists public.waitlist_admin_events (
    id uuid primary key default gen_random_uuid(),
    event_type text not null,
    subscriber_id uuid,
    anonymous_id text,
    created_at timestamptz not null default now()
);

alter table public.waitlist_admin_attempts enable row level security;
alter table public.waitlist_templates enable row level security;
alter table public.waitlist_sends enable row level security;
alter table public.waitlist_admin_events enable row level security;

insert into public.waitlist_templates (name, subject, html_body, text_body)
values
('Boas-vindas', 'Bem-vindo à lista de espera do PoorGuy', '<p>Olá!</p><p>Obrigado por acompanhar o PoorGuy. Seu interesse foi registrado.</p><p>O PoorGuy está em pré-lançamento. Nenhum apoio ou pagamento é garantido.</p><p><a href="{{unsubscribe_url}}">Descadastrar meu e-mail</a></p>', 'Olá!\n\nObrigado por acompanhar o PoorGuy. Seu interesse foi registrado.\n\nO PoorGuy está em pré-lançamento. Nenhum apoio ou pagamento é garantido.\n\nDescadastrar meu e-mail: {{unsubscribe_url}}'),
('Novidades do pré-lançamento', 'Novidades do pré-lançamento do PoorGuy', '<p>Olá!</p><p>Estamos preparando novidades sobre a construção do PoorGuy.</p><p>Nenhum apoio ou pagamento é garantido.</p><p><a href="{{unsubscribe_url}}">Descadastrar meu e-mail</a></p>', 'Olá!\n\nEstamos preparando novidades sobre a construção do PoorGuy.\n\nNenhum apoio ou pagamento é garantido.\n\nDescadastrar meu e-mail: {{unsubscribe_url}}'),
('Abertura da lista de espera', 'A lista de espera do PoorGuy continua aberta', '<p>Olá!</p><p>A lista de espera continua aberta para acompanhar o próximo passo do PoorGuy.</p><p>Nenhum apoio ou pagamento é garantido.</p><p><a href="{{unsubscribe_url}}">Descadastrar meu e-mail</a></p>', 'Olá!\n\nA lista de espera continua aberta para acompanhar o próximo passo do PoorGuy.\n\nNenhum apoio ou pagamento é garantido.\n\nDescadastrar meu e-mail: {{unsubscribe_url}}')
on conflict do nothing;
