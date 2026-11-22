alter table public.network_proposals
  drop constraint network_proposals_kind_check,
  add constraint network_proposals_kind_check check (kind in ('Azienda','Professionista','Opera solidale'));
alter table public.network_posts
  drop constraint network_posts_type_check,
  add constraint network_posts_type_check check (type in ('Storie','Esperienze','Eventi','Cerchiamo','Offriamo','Opere solidali'));
alter policy posts_create on public.network_posts with check (
  owner = (select auth.uid())
  and not exists (
    select 1 from public.network_profiles where owner = (select auth.uid()) and kind in ('Azienda','Professionista')
  )
  and (type <> 'Opere solidali' or exists (select 1 from public.network_moderators))
);
