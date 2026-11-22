alter policy profiles_public on public.network_profiles
  using (kind not in ('Azienda','Professionista'));
create policy profiles_staff on public.network_profiles
  for select to authenticated using (exists(select 1 from public.network_moderators));
alter policy contacts_public on public.network_contacts using (visible and exists (
  select 1 from public.network_profiles
  where owner = network_contacts.owner and kind not in ('Azienda','Professionista')
));
alter policy posts_create on public.network_posts with check (
  owner = (select auth.uid()) and not exists (
    select 1 from public.network_profiles where owner = (select auth.uid()) and kind in ('Azienda','Professionista')
  )
);
