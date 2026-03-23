alter table public.profiles
add column if not exists must_change_password boolean not null default false;

create table if not exists public.notification_dispatch_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  notification_type text not null,
  notification_key text not null,
  recipient_email text not null,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default now()
);

create unique index if not exists notification_dispatch_log_unique_idx
  on public.notification_dispatch_log (notification_type, notification_key, recipient_email);

create index if not exists notification_dispatch_log_company_idx
  on public.notification_dispatch_log (company_id, sent_at desc);
