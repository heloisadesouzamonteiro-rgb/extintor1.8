create table if not exists public.trial_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  company_name text not null,
  employee_count integer not null check (employee_count > 0),
  source text not null default 'landing_page',
  page_url text,
  status text not null default 'novo',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.trial_requests enable row level security;

create policy "service role manages trial requests"
on public.trial_requests
as permissive
for all
to service_role
using (true)
with check (true);
