create table public.network_proposals (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.network_members on delete cascade,
  kind text not null check (kind in ('Azienda','Professionista')),
  name text not null check (char_length(trim(name)) between 1 and 90),
  city text not null check (char_length(trim(city)) between 1 and 80),
  email text not null check (char_length(trim(email)) between 3 and 150),
  message text not null check (char_length(trim(message)) between 1 and 1500),
  created_at timestamptz not null default now()
);
alter table public.network_proposals enable row level security;
revoke all on public.network_proposals from anon, authenticated;
grant select on public.network_proposals to authenticated;
grant insert (owner,kind,name,city,email,message) on public.network_proposals to authenticated;
create index network_proposals_owner on public.network_proposals(owner);
create index network_proposals_recent on public.network_proposals(created_at desc);
create policy proposals_author_or_staff_read on public.network_proposals
for select to authenticated using (owner = (select auth.uid()) or exists(select 1 from public.network_moderators));
create policy proposals_author_insert on public.network_proposals
for insert to authenticated with check (owner = (select auth.uid()));
