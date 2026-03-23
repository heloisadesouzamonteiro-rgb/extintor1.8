alter table public.extinguishers
  add column if not exists created_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists created_by_name text;
