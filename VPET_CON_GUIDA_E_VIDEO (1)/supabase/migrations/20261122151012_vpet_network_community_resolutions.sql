create table public.network_resolutions (
  post_id uuid primary key references public.network_posts on delete cascade,
  thanks text not null default '' check (char_length(thanks) <= 500),
  resolved_at timestamptz not null default now()
);
alter table public.network_resolutions enable row level security;
revoke all on public.network_resolutions from anon, authenticated;
grant select on public.network_resolutions to anon, authenticated;
grant insert (post_id, thanks) on public.network_resolutions to authenticated;
create policy resolutions_public on public.network_resolutions for select using (true);
create policy resolutions_owner_insert on public.network_resolutions for insert to authenticated
with check (exists (
  select 1 from public.network_posts
  where id = post_id and owner = (select auth.uid()) and type = 'Cerchiamo'
));
