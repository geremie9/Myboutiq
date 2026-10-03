-- ═══════════════════════════════════════════════════════════════════
--  NOTIFICATIONS PUSH — l'app fermée, le téléphone sonne quand même.
--
--  Le téléphone donne une adresse de livraison (endpoint + 2 clés) ; le
--  serveur y dépose un message chiffré ; le service de push de Google
--  (ou Mozilla, Apple) le garde jusqu'au retour du réseau (TTL).
--
--  ⚠️ Trois tables FERMÉES : ni anon ni authenticated n'y lisent quoi
--  que ce soit. Tout passe par des fonctions qui ne rendent que le
--  strict nécessaire. Seule la fonction `notifier` (service_role) et la
--  tâche planifiée y touchent.
-- ═══════════════════════════════════════════════════════════════════
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- La paire VAPID : la publique part chez les téléphones, la privée ne
-- quitte jamais le serveur (créée par la fonction elle-même).
create table if not exists public.notif_cles(
  id smallint primary key default 1 check (id = 1),
  publique text,
  privee jsonb,
  secret_tournee text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  cree_le timestamptz not null default now()
);
insert into public.notif_cles(id) values (1) on conflict do nothing;

create table if not exists public.notif_abonnements(
  id bigint generated always as identity primary key,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  langue text,
  appareil text,
  mode text,
  cree_le timestamptz not null default now(),
  vu_le timestamptz not null default now(),
  dernier_ok timestamptz,
  actif boolean not null default true,
  echecs integer not null default 0
);
create index if not exists notif_abonnements_user on public.notif_abonnements(user_id) where actif;

create table if not exists public.notif_envois(
  id bigint generated always as identity primary key,
  cree_le timestamptz not null default now(),
  user_id uuid,
  code text,
  type text not null,
  cle text,
  titre text,
  corps text,
  url text,
  jeton uuid not null default gen_random_uuid(),
  nb_appareils integer not null default 0,
  nb_ok integer not null default 0,
  ouvert_le timestamptz,
  detail jsonb
);
create unique index if not exists notif_envois_cle on public.notif_envois(user_id, cle) where cle is not null;
create index if not exists notif_envois_user on public.notif_envois(user_id, cree_le desc);
create unique index if not exists notif_envois_jeton on public.notif_envois(jeton);

alter table public.notif_cles enable row level security;
alter table public.notif_abonnements enable row level security;
alter table public.notif_envois enable row level security;
revoke all on public.notif_cles, public.notif_abonnements, public.notif_envois from anon, authenticated;

-- ── La clé publique : tout le monde peut la lire, c'est son rôle ──
create or replace function public.notif_cle_publique()
returns text language sql stable security definer set search_path = '' as $$
  select publique from public.notif_cles where id = 1
$$;

-- ── Le téléphone d'un patron connecté s'inscrit ──
-- ⚠️ L'adresse doit être celle d'un VRAI service de push : la fonction
-- d'envoi y poste des requêtes, elle ne doit jamais devenir un moyen
-- de frapper une adresse quelconque.
create or replace function public.notif_abonner(
  p_endpoint text, p_p256dh text, p_auth text,
  p_langue text default null, p_appareil text default null, p_mode text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'non-connecte' using errcode = '42501'; end if;
  if p_endpoint is null or length(p_endpoint) > 1024
     or p_endpoint !~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^\s]+$'
  then raise exception 'adresse-refusee' using errcode = '22023'; end if;
  if p_p256dh !~ '^[A-Za-z0-9_-]{86,88}$' or p_auth !~ '^[A-Za-z0-9_-]{21,24}$'
  then raise exception 'cles-invalides' using errcode = '22023'; end if;

  insert into public.notif_abonnements(endpoint, p256dh, auth, user_id, langue, appareil, mode)
  values (p_endpoint, p_p256dh, p_auth, uid, left(p_langue, 5), left(p_appareil, 80), left(p_mode, 12))
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth, user_id = excluded.user_id,
        langue = excluded.langue, appareil = excluded.appareil, mode = excluded.mode,
        vu_le = now(), actif = true, echecs = 0;

  -- Au plus 10 téléphones actifs par compte : les plus anciens s'éteignent.
  update public.notif_abonnements set actif = false
   where user_id = uid and actif and id not in (
     select id from public.notif_abonnements where user_id = uid and actif
      order by vu_le desc limit 10);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.notif_desabonner(p_endpoint text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if auth.uid() is null then return false; end if;
  delete from public.notif_abonnements where endpoint = p_endpoint and user_id = auth.uid();
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- ── Le patron a touché la notification (pour savoir ce qui sert) ──
create or replace function public.notif_ouvert(p_jeton uuid)
returns void language sql security definer set search_path = '' as $$
  update public.notif_envois set ouvert_le = now() where jeton = p_jeton and ouvert_le is null
$$;

-- ── La tournée du matin : QUI reçoit QUOI aujourd'hui ──
-- Une seule notification automatique par compte et par jour, la plus
-- utile d'abord. Jamais la boutique d'exemple.
create or replace function public.notif_tournee_candidats()
returns table(user_id uuid, code text, nom text, langue text, type text, cle text, jours integer)
language sql stable security definer set search_path = '' as $$
  with b as (
    select b.owner_id as uid, b.code,
           coalesce(nullif(trim(b.data->'cfg'->>'nom'), ''), nullif(trim(b.nom), ''), 'MyBoutiQ') as nom,
           case when coalesce(b.langue, b.data->'cfg'->>'lang', 'fr') = 'en' then 'en' else 'fr' end as langue,
           b.created_at, b.updated_at, b.abonne_jusqu,
           case when jsonb_typeof(b.data->'articles') = 'array' then jsonb_array_length(b.data->'articles') else 0 end as nb_art,
           case when jsonb_typeof(b.data->'ventes') = 'array' then jsonb_array_length(b.data->'ventes') else 0 end as nb_ventes,
           (b.data ? 'arch' and b.data->'arch' <> '{}'::jsonb) as archive
      from public.boutiques b
     where b.owner_id is not null
       and coalesce(b.actif, true)
       and coalesce(b.data->'cfg'->>'demo', '') <> 'true'
       and exists (select 1 from public.notif_abonnements a where a.user_id = b.owner_id and a.actif)
  ),
  deja as (
    select e.user_id, e.type, count(*) as n, max(e.cree_le) as dernier
      from public.notif_envois e group by e.user_id, e.type
  ),
  c as (
    select uid, code, nom, langue, 'abonnement'::text as type,
           'abonnement:' || code || ':' || abonne_jusqu as cle, 1 as prio,
           (abonne_jusqu - current_date)::integer as jours
      from b where abonne_jusqu is not null and abonne_jusqu - current_date between 0 and 3
    union all
    select uid, code, nom, langue, 'vide', 'vide:' || current_date, 2, 0
      from b where nb_art = 0 and created_at < now() - interval '20 hours' and created_at > now() - interval '14 days'
    union all
    select uid, code, nom, langue, 'premiere', 'premiere:' || current_date, 3, 0
      from b where nb_art > 0 and nb_ventes = 0 and not archive
       and created_at < now() - interval '2 days' and created_at > now() - interval '30 days'
    union all
    select uid, code, nom, langue, 'absent', 'absent:' || current_date, 4, 0
      from b where nb_ventes > 0 and updated_at < now() - interval '7 days' and updated_at > now() - interval '60 days'
  )
  select distinct on (c.uid) c.uid, c.code, c.nom, c.langue, c.type, c.cle, c.jours
    from c left join deja d on d.user_id = c.uid and d.type = c.type
   where not exists (select 1 from public.notif_envois e
                      where e.user_id = c.uid and e.cree_le > now() - interval '20 hours'
                        and e.type in ('abonnement', 'vide', 'premiere', 'absent'))
     and case c.type
           when 'abonnement' then not exists (select 1 from public.notif_envois e where e.user_id = c.uid and e.cle = c.cle)
           when 'vide'       then coalesce(d.n, 0) < 2 and coalesce(d.dernier, '-infinity') < now() - interval '3 days'
           when 'premiere'   then coalesce(d.n, 0) < 2 and coalesce(d.dernier, '-infinity') < now() - interval '3 days'
           when 'absent'     then coalesce(d.dernier, '-infinity') < now() - interval '14 days'
         end
   order by c.uid, c.prio, c.code
$$;

-- ── Pour l'admin : combien de téléphones, combien d'envois, d'ouvertures ──
create or replace function public.notif_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.admin_est() then raise exception 'reserve-admin' using errcode = '42501'; end if;
  return jsonb_build_object(
    'telephones', (select count(*) from public.notif_abonnements where actif),
    'comptes', (select count(distinct user_id) from public.notif_abonnements where actif),
    'envois_7j', (select count(*) from public.notif_envois where cree_le > now() - interval '7 days' and type <> 'essai'),
    'recus_7j', (select count(*) from public.notif_envois where cree_le > now() - interval '7 days' and type <> 'essai' and nb_ok > 0),
    'ouverts_7j', (select count(*) from public.notif_envois where cree_le > now() - interval '7 days' and type <> 'essai' and ouvert_le is not null)
  );
end $$;

revoke all on function public.notif_cle_publique() from public;
revoke all on function public.notif_abonner(text, text, text, text, text, text) from public;
revoke all on function public.notif_desabonner(text) from public;
revoke all on function public.notif_ouvert(uuid) from public;
revoke all on function public.notif_tournee_candidats() from public;
revoke all on function public.notif_stats() from public;
grant execute on function public.notif_cle_publique() to anon, authenticated;
grant execute on function public.notif_abonner(text, text, text, text, text, text) to authenticated;
grant execute on function public.notif_desabonner(text) to authenticated;
grant execute on function public.notif_ouvert(uuid) to anon, authenticated;
grant execute on function public.notif_stats() to authenticated;
grant execute on function public.notif_tournee_candidats() to service_role;
