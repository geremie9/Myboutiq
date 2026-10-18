-- Reproduit ce que Supabase pose AVANT nos objets : les rôles, le schéma
-- `extensions`, et surtout les droits par défaut — c'est eux qui rendent les
-- `revoke` du fichier de migration nécessaires, donc ce qu'il faut tester.
do $$ begin
  if not exists (select from pg_roles where rolname='anon')          then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname='service_role')  then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
