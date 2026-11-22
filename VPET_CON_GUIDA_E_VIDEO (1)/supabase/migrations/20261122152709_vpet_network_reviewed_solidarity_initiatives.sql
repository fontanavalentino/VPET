alter table public.network_proposals
  drop constraint network_proposals_kind_check,
  add constraint network_proposals_kind_check check (kind in ('Azienda','Professionista','Opera solidale','Iniziativa solidale'));
alter table public.network_proposal_followups
  drop constraint network_proposal_followups_status_check,
  add constraint network_proposal_followups_status_check check (status in ('Nuova','In valutazione','Autorizzata','Attiva','Conclusa','Respinta'));
alter table public.network_posts
  drop constraint network_posts_type_check,
  add constraint network_posts_type_check check (type in ('Storie','Esperienze','Eventi','Cerchiamo','Offriamo','Opere solidali','Iniziative solidali'));
alter table public.network_posts add column approved_proposal_id uuid references public.network_proposals on delete cascade;
create unique index network_posts_unique_approved_proposal on public.network_posts(approved_proposal_id) where approved_proposal_id is not null;
alter table public.network_posts add constraint network_post_approved_proposal
check ((type='Iniziative solidali') = (approved_proposal_id is not null));
alter policy posts_create on public.network_posts with check (
  owner = (select auth.uid())
  and not exists (
    select 1 from public.network_profiles where owner = (select auth.uid()) and kind in ('Azienda','Professionista')
  )
  and (type not in ('Opere solidali','Iniziative solidali') or exists (select 1 from public.network_moderators))
  and (type <> 'Iniziative solidali' or exists (
    select 1 from public.network_proposal_followups f join public.network_proposals p on p.id=f.proposal_id
    where f.proposal_id=approved_proposal_id and f.status in ('Autorizzata','Attiva') and p.kind='Iniziativa solidale'
  ))
);
