revoke execute on function public.network_weekly_report(integer) from anon;
revoke execute on function vpet_reporting.staff_report(integer) from anon;
revoke execute on function vpet_reporting.weekly(integer) from anon, authenticated;
