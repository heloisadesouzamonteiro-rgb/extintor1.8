create table if not exists public.calculator_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  phone text not null,
  email text not null,
  source text,
  campaign text,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.calculator_results (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.calculator_leads(id) on delete cascade,
  clients_count integer not null default 0 check (clients_count >= 0),
  extinguishers_count integer not null default 0 check (extinguishers_count >= 0),
  annual_value_per_extinguisher numeric not null default 0 check (annual_value_per_extinguisher >= 0),
  renewal_percent numeric not null default 100 check (renewal_percent >= 0 and renewal_percent <= 100),
  new_contracts_per_month integer not null default 0 check (new_contracts_per_month >= 0),
  average_new_client_ticket numeric not null default 0 check (average_new_client_ticket >= 0),
  annual_revenue numeric not null default 0 check (annual_revenue >= 0),
  monthly_revenue numeric not null default 0 check (monthly_revenue >= 0),
  revenue_per_client numeric not null default 0 check (revenue_per_client >= 0),
  growth_scenario numeric not null default 0 check (growth_scenario >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.calculator_leads enable row level security;
alter table public.calculator_results enable row level security;

create policy "service role manages calculator leads"
on public.calculator_leads
as permissive
for all
to service_role
using (true)
with check (true);

create policy "service role manages calculator results"
on public.calculator_results
as permissive
for all
to service_role
using (true)
with check (true);

create policy "anon can create calculator leads"
on public.calculator_leads
as permissive
for insert
to public
with check (
  length(trim(name)) > 1
  and length(trim(company)) > 1
  and length(trim(phone)) >= 10
  and position('@' in email) > 1
);

create policy "anon can create calculator results"
on public.calculator_results
as permissive
for insert
to public
with check (
  exists (
    select 1
    from public.calculator_leads
    where calculator_leads.id = lead_id
  )
);
