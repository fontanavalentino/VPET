create table public.network_members (
  id uuid primary key references auth.users on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80)
);
create table public.network_moderators (
  id uuid primary key references auth.users on delete cascade
);
alter table public.network_moderators enable row level security;
revoke all on public.network_moderators from anon, authenticated;
grant select on public.network_moderators to anon, authenticated;
create policy moderator_self on public.network_moderators for select to authenticated using (id = (select auth.uid()));

create table public.network_profiles (
  owner uuid primary key references public.network_members on delete cascade,
  name text not null check (length(trim(name)) between 1 and 90),
  kind text not null check (kind in ('Associazione','Azienda','Altra realtà')),
  city text not null check (length(trim(city)) between 1 and 80),
  description text not null check (length(trim(description)) between 1 and 1200)
);
create table public.network_contacts (
  owner uuid primary key references public.network_profiles on delete cascade,
  phone text not null check (length(phone) <= 22),
  whatsapp text not null check (length(whatsapp) <= 22),
  email text not null check (length(email) <= 150),
  visible boolean not null default false
);
create table public.network_posts (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.network_members on delete cascade,
  city text not null check (length(trim(city)) between 1 and 80),
  type text not null check (type in ('Storie','Esperienze','Eventi','Cerchiamo','Offriamo')),
  title text not null check (length(trim(title)) between 1 and 100),
  body text not null check (length(trim(body)) between 1 and 2000),
  date date,
  partner text check (length(partner) <= 100),
  outcome text check (length(outcome) <= 800),
  media text,
  media_type text,
  created_at timestamptz not null default now(),
  check (type <> 'Eventi' or date is not null),
  check (type <> 'Esperienze' or (nullif(trim(partner), '') is not null and nullif(trim(outcome), '') is not null)),
  check (media is null or split_part(media,'/',1) = owner::text)
);
create index network_posts_recent on public.network_posts(created_at desc);
create table public.network_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.network_posts on delete cascade,
  owner uuid not null references public.network_members on delete cascade,
  message text not null check (length(trim(message)) between 1 and 600),
  created_at timestamptz not null default now()
);
create index network_comments_post on public.network_comments(post_id, created_at);
create table public.network_notes (
  post_id uuid primary key references public.network_posts on delete cascade,
  message text not null check (length(message) <= 500)
);

alter table public.network_members enable row level security;
alter table public.network_profiles enable row level security;
alter table public.network_contacts enable row level security;
alter table public.network_posts enable row level security;
alter table public.network_comments enable row level security;
alter table public.network_notes enable row level security;
revoke all on public.network_members, public.network_profiles, public.network_contacts, public.network_posts, public.network_comments, public.network_notes from anon, authenticated;
grant select on public.network_members, public.network_profiles, public.network_contacts, public.network_posts, public.network_comments, public.network_notes to anon, authenticated;
grant insert, update on public.network_members, public.network_profiles, public.network_contacts, public.network_notes to authenticated;
grant insert, delete on public.network_posts, public.network_comments to authenticated;

create policy members_public on public.network_members for select using (true);
create policy members_write on public.network_members for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_public on public.network_profiles for select using (true);
create policy profiles_write on public.network_profiles for all to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
create policy contacts_public on public.network_contacts for select using (visible);
create policy contacts_owner on public.network_contacts for all to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
create policy contacts_staff on public.network_contacts for select to authenticated using (exists(select 1 from public.network_moderators));
create policy posts_public on public.network_posts for select using (true);
create policy posts_create on public.network_posts for insert to authenticated with check (owner = (select auth.uid()));
create policy posts_remove on public.network_posts for delete to authenticated using (owner = (select auth.uid()) or exists(select 1 from public.network_moderators));
create policy comments_public on public.network_comments for select using (true);
create policy comments_create on public.network_comments for insert to authenticated with check (owner = (select auth.uid()));
create policy comments_remove on public.network_comments for delete to authenticated using (owner = (select auth.uid()) or exists(select 1 from public.network_moderators));
create policy notes_public on public.network_notes for select using (true);
create policy notes_write on public.network_notes for all to authenticated using (exists(select 1 from public.network_moderators)) with check (exists(select 1 from public.network_moderators));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('network-media','network-media',false,20971520,array['image/jpeg','image/png','image/webp','video/mp4','video/webm','audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/webm']);
create policy media_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'network-media' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy media_read on storage.objects for select using (
  bucket_id = 'network-media' and (
    (storage.foldername(name))[1] = (select auth.uid())::text or
    exists(select 1 from public.network_posts where media = name) or
    exists(select 1 from public.network_moderators)
  )
);
create policy media_remove on storage.objects for delete to authenticated using (
  bucket_id = 'network-media' and ((storage.foldername(name))[1] = (select auth.uid())::text or exists(select 1 from public.network_moderators))
);
