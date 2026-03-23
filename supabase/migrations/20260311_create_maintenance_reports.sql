create table if not exists public.maintenance_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  unit_id uuid references public.units(id) on delete set null,
  extinguisher_id uuid not null references public.extinguishers(id) on delete cascade,
  inspection_id uuid references public.inspections(id) on delete set null,
  technician_id uuid references public.profiles(id) on delete set null,
  maintenance_date timestamptz not null default now(),
  service_order_number text,
  invoice_number text,
  maintenance_type text,
  report_status text,
  maintenance_level integer,
  executor_name text,
  seal_number text,
  extinguisher_code_snapshot text,
  serial_number_snapshot text,
  extinguisher_type_snapshot text,
  capacity_snapshot text,
  agent_snapshot text,
  manufacturer_snapshot text,
  standard_code_snapshot text,
  location_snapshot text,
  sector_snapshot text,
  manufacture_year_snapshot integer,
  last_inspection_year integer,
  gross_weight numeric(10,2),
  tare_weight numeric(10,2),
  total_weight numeric(10,2),
  loss_percentage numeric(5,2),
  pressure_value numeric(10,2),
  cylinder_volume numeric(10,2),
  charge_capacity text,
  hydrostatic_test_reference text,
  rejection_pin boolean not null default false,
  rejection_thread boolean not null default false,
  rejection_valve boolean not null default false,
  rejection_pressure_gauge boolean not null default false,
  rejection_hose boolean not null default false,
  rejection_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists maintenance_reports_company_id_idx
  on public.maintenance_reports (company_id);

create index if not exists maintenance_reports_extinguisher_id_idx
  on public.maintenance_reports (extinguisher_id);

create index if not exists maintenance_reports_inspection_id_idx
  on public.maintenance_reports (inspection_id);

alter table public.maintenance_reports enable row level security;

drop policy if exists "maintenance_reports_select_same_company" on public.maintenance_reports;
create policy "maintenance_reports_select_same_company"
  on public.maintenance_reports
  for select
  using (
    company_id in (
      select company_id
      from public.profiles
      where id = auth.uid()
    )
  );

drop policy if exists "maintenance_reports_insert_same_company" on public.maintenance_reports;
create policy "maintenance_reports_insert_same_company"
  on public.maintenance_reports
  for insert
  with check (
    company_id in (
      select company_id
      from public.profiles
      where id = auth.uid()
    )
  );

drop policy if exists "maintenance_reports_update_same_company" on public.maintenance_reports;
create policy "maintenance_reports_update_same_company"
  on public.maintenance_reports
  for update
  using (
    company_id in (
      select company_id
      from public.profiles
      where id = auth.uid()
    )
  )
  with check (
    company_id in (
      select company_id
      from public.profiles
      where id = auth.uid()
    )
  );

drop policy if exists "maintenance_reports_delete_same_company" on public.maintenance_reports;
create policy "maintenance_reports_delete_same_company"
  on public.maintenance_reports
  for delete
  using (
    company_id in (
      select company_id
      from public.profiles
      where id = auth.uid()
    )
  );
