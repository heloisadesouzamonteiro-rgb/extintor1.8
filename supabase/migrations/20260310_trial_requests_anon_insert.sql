create policy "anon can create trial requests"
on public.trial_requests
as permissive
for insert
to anon
with check (
  source = 'landing_page'
  and employee_count > 0
);
