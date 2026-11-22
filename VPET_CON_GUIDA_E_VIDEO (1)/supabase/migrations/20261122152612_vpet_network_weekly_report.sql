create schema vpet_reporting;
grant usage on schema vpet_reporting to anon, authenticated;

create table vpet_reporting.openings (
  day date not null,
  channel text not null,
  openings bigint not null default 0,
  primary key (day, channel)
);
alter table vpet_reporting.openings enable row level security;

create function vpet_reporting.record_opening(source text)
returns void language sql security definer set search_path = '' as $$
  insert into vpet_reporting.openings(day,channel,openings)
  values ((now() at time zone 'Europe/Rome')::date,
    case when source in ('whatsapp','facebook','instagram','qr','link','share','invito') then source else 'diretto' end, 1)
  on conflict (day,channel) do update set openings = vpet_reporting.openings.openings + 1;
$$;
revoke all on function vpet_reporting.record_opening(text) from public;
grant execute on function vpet_reporting.record_opening(text) to anon, authenticated;

create function public.network_record_opening(source text)
returns void language sql security invoker set search_path = '' as $$
  select vpet_reporting.record_opening(source);
$$;
revoke all on function public.network_record_opening(text) from public;
grant execute on function public.network_record_opening(text) to anon, authenticated;

create function vpet_reporting.weekly(weeks_ago integer)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with bounds as (
    select (date_trunc('week',now() at time zone 'Europe/Rome')::date - 7 * greatest(0, least(weeks_ago, 51))) as monday
  ), dates as (
    select monday, monday+7 as end_day,
      monday::timestamp at time zone 'Europe/Rome' as start_time,
      (monday+7)::timestamp at time zone 'Europe/Rome' as end_time
    from bounds
  ), posts as (
    select p.type, p.created_at from public.network_posts p
  ), weekly_posts as (
    select p.* from posts p cross join dates d where p.created_at >= d.start_time and p.created_at < d.end_time
  ), channels as (
    select channel,sum(openings) as count from vpet_reporting.openings cross join dates
    where day >= monday and day < end_day group by channel
  )
  select jsonb_build_object(
    'from',d.monday,'to',d.end_day-1,
    'tracking_from',(select min(day) from vpet_reporting.openings),
    'channels',coalesce((select jsonb_object_agg(channel,count) from channels),'{}'::jsonb),
    'week', jsonb_build_object(
      'openings', coalesce((select sum(count) from channels),0),
      'members',(select count(*) from public.network_members m join auth.users u on m.id=u.id where u.created_at >= d.start_time and u.created_at < d.end_time),
      'requests',(select count(*) from weekly_posts where type='Cerchiamo'),
      'offers',(select count(*) from weekly_posts where type='Offriamo'),
      'resolved',(select count(*) from public.network_resolutions where resolved_at >= d.start_time and resolved_at < d.end_time),
      'proposals',(select count(*) from public.network_proposals where created_at >= d.start_time and created_at < d.end_time and kind <> 'Opera solidale'),
      'culture_proposals',(select count(*) from public.network_proposals where created_at >= d.start_time and created_at < d.end_time and kind='Opera solidale'),
      'culture_published',(select count(*) from weekly_posts where type='Opere solidali')
    ),
    'total',jsonb_build_object(
      'openings',coalesce((select sum(openings) from vpet_reporting.openings),0),
      'members',(select count(*) from public.network_members),
      'requests',(select count(*) from posts where type='Cerchiamo'),
      'offers',(select count(*) from posts where type='Offriamo'),
      'resolved',(select count(*) from public.network_resolutions),
      'proposals',(select count(*) from public.network_proposals where kind <> 'Opera solidale'),
      'culture_proposals',(select count(*) from public.network_proposals where kind='Opera solidale'),
      'culture_published',(select count(*) from posts where type='Opere solidali')
    ),
    'active_partnerships',(select count(*) from public.network_proposal_followups f join public.network_proposals p on p.id=f.proposal_id where f.status='Attiva' and p.kind <> 'Opera solidale'),
    'next_contacts',(select count(*) from public.network_proposal_followups where next_contact < (now() at time zone 'Europe/Rome')::date + 7 and status in ('In valutazione','Attiva'))
  )
  from dates d;
$$;
revoke all on function vpet_reporting.weekly(integer) from public;

create function vpet_reporting.staff_report(weeks_ago integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.network_moderators where id = (select auth.uid())) then
    raise exception 'Report riservato alla redazione' using errcode = '42501';
  end if;
  return vpet_reporting.weekly(weeks_ago);
end;
$$;
revoke all on function vpet_reporting.staff_report(integer) from public;
grant execute on function vpet_reporting.staff_report(integer) to authenticated;

create function public.network_weekly_report(weeks_ago integer)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select vpet_reporting.staff_report(weeks_ago);
$$;
revoke all on function public.network_weekly_report(integer) from public;
grant execute on function public.network_weekly_report(integer) to authenticated;
