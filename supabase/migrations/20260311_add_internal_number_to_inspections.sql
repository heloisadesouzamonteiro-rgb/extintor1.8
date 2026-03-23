alter table public.inspections
  add column if not exists internal_number integer;

create or replace function public.assign_inspection_internal_number()
returns trigger
language plpgsql
as $$
declare
  next_number integer;
begin
  if new.internal_number is not null then
    return new;
  end if;

  select coalesce(max(internal_number) + 1, 1001)
    into next_number
  from public.inspections
  where company_id = new.company_id;

  new.internal_number := next_number;
  return new;
end;
$$;

drop trigger if exists set_inspection_internal_number on public.inspections;
create trigger set_inspection_internal_number
before insert on public.inspections
for each row
execute function public.assign_inspection_internal_number();

create unique index if not exists inspections_company_internal_number_unique
  on public.inspections (company_id, internal_number)
  where internal_number is not null;

update public.inspections current_inspection
set internal_number = numbering.next_number
from (
  select id,
         company_id,
         1000 + row_number() over (
           partition by company_id
           order by coalesce(inspected_at, created_at), created_at, id
         ) as next_number
  from public.inspections
  where internal_number is null
) numbering
where current_inspection.id = numbering.id;
