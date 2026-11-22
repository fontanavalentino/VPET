alter table public.network_profiles
  drop constraint network_profiles_kind_check,
  add constraint network_profiles_kind_check
  check (kind in ('Associazione', 'Azienda', 'Professionista', 'Altra realtà'));
