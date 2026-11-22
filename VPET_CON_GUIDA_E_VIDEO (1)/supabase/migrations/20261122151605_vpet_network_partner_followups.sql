create table public.network_proposal_followups (
  proposal_id uuid primary key references public.network_proposals on delete cascade,
  status text not null default 'Nuova' check (status in ('Nuova','In valutazione','Attiva','Conclusa')),
  next_contact date,
  internal_note text not null default '' check (char_length(internal_note) <= 2000)
);
alter table public.network_proposal_followups enable row level security;
revoke all on public.network_proposal_followups from anon, authenticated;
grant select, insert, update on public.network_proposal_followups to authenticated;
create policy proposal_followups_staff on public.network_proposal_followups
for all to authenticated using (exists(select 1 from public.network_moderators))
with check (exists(select 1 from public.network_moderators));
