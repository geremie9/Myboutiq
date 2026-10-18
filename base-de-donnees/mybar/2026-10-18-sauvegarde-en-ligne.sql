-- ═══════════════════════════════════════════════════════════════════════════
--  MyBar — la sauvegarde en ligne
--
--  ⚠️ CE FICHIER NE S'APPLIQUE PAS AU PROJET SUPABASE DE MYBOUTIQ
--  (bbncilovxzkcvlxvoqtg) : celui-là est la production d'une autre application,
--  sans environnement de test. MyBar a son PROPRE projet. Voir README.md.
--
--  Ce que le serveur sait : RIEN. Le téléphone chiffre sa base de bout en bout
--  (AES-GCM, clé dérivée d'une clé de sauvegarde que le patron note sur papier)
--  avant de l'envoyer. Le serveur reçoit un texte illisible et un identifiant
--  dérivé de la même clé, qu'il range sous forme de HACHAGE : une fuite de la
--  base ne donne ni les ventes, ni les ardoises, ni de quoi les retrouver.
--
--  Il n'y a pas de comptes : un patron de bar n'a pas toujours d'adresse
--  e-mail, et un SMS de vérification coûte à chaque connexion. La clé de
--  sauvegarde (100 bits) EST l'identité. Perdue, la sauvegarde est
--  irrécupérable — c'est le prix d'un serveur qui ne peut rien lire, et
--  l'application le dit avant d'activer quoi que ce soit.
--
--  Accès : uniquement par ces fonctions. La table n'est lisible ni modifiable
--  directement, par personne (RLS sans aucune règle, droits retirés).
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.bar_sauvegardes (
  id_hash  text primary key check (id_hash ~ '^[0-9a-f]{64}$'),
  rev      bigint  not null default 1 check (rev >= 1),
  data     text    not null check (length(data) between 16 and 4000000),
  octets   integer not null,
  appareil text    check (appareil is null or length(appareil) <= 40),
  build    text    check (build is null or length(build) <= 20),
  cree     timestamptz not null default now(),
  maj      timestamptz not null default now()
);

alter table public.bar_sauvegardes enable row level security;
-- Aucune règle (policy) : ni lecture ni écriture directes. Les fonctions
-- ci-dessous tournent avec les droits de leur propriétaire (security definer),
-- qui n'est pas soumis à la RLS.
revoke all on public.bar_sauvegardes from public, anon, authenticated;

-- ── Écrire ────────────────────────────────────────────────────────────────
-- p_rev = la révision que CE téléphone croit être en ligne (0 : première fois).
-- Si quelqu'un d'autre a écrit depuis, on ne l'écrase PAS : on le dit.
create or replace function public.bar_ecrire(
  p_id text, p_rev bigint, p_data text,
  p_appareil text default null, p_build text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash text;
  v_ligne public.bar_sauvegardes%rowtype;
begin
  if p_id is null or p_id !~ '^[A-Za-z0-9_-]{43}$' then
    return jsonb_build_object('ok', false, 'erreur', 'identifiant');
  end if;
  if p_data is null or length(p_data) < 16 then
    return jsonb_build_object('ok', false, 'erreur', 'donnees');
  end if;
  if length(p_data) > 4000000 then
    return jsonb_build_object('ok', false, 'erreur', 'trop_gros');
  end if;
  v_hash := encode(digest(p_id, 'sha256'), 'hex');

  select * into v_ligne from public.bar_sauvegardes where id_hash = v_hash for update;

  if not found then
    -- Plafond : un script hostile ne doit pas pouvoir remplir la base d'un
    -- plan gratuit (500 Mo) au détriment de tous les bars.
    if pg_total_relation_size('public.bar_sauvegardes') > 300 * 1024 * 1024 then
      return jsonb_build_object('ok', false, 'erreur', 'plein');
    end if;
    begin
      insert into public.bar_sauvegardes(id_hash, rev, data, octets, appareil, build)
      values (v_hash, 1, p_data, length(p_data), left(p_appareil, 40), left(p_build, 20));
    exception when unique_violation then
      -- deux téléphones créent le même bar au même instant : le second perd
      select * into v_ligne from public.bar_sauvegardes where id_hash = v_hash;
      return jsonb_build_object('ok', false, 'erreur', 'conflit', 'rev', v_ligne.rev,
                                'maj', v_ligne.maj, 'appareil', v_ligne.appareil);
    end;
    return jsonb_build_object('ok', true, 'rev', 1);
  end if;

  if v_ligne.rev <> coalesce(p_rev, 0) then
    return jsonb_build_object('ok', false, 'erreur', 'conflit', 'rev', v_ligne.rev,
                              'maj', v_ligne.maj, 'appareil', v_ligne.appareil);
  end if;

  update public.bar_sauvegardes
     set rev = rev + 1, data = p_data, octets = length(p_data),
         appareil = left(p_appareil, 40), build = left(p_build, 20), maj = now()
   where id_hash = v_hash
   returning rev into v_ligne.rev;
  return jsonb_build_object('ok', true, 'rev', v_ligne.rev);
end $$;

-- ── Lire ──────────────────────────────────────────────────────────────────
create or replace function public.bar_lire(p_id text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_ligne public.bar_sauvegardes%rowtype;
begin
  if p_id is null or p_id !~ '^[A-Za-z0-9_-]{43}$' then
    return jsonb_build_object('ok', false, 'erreur', 'identifiant');
  end if;
  select * into v_ligne from public.bar_sauvegardes
   where id_hash = encode(digest(p_id, 'sha256'), 'hex');
  if not found then
    -- même réponse qu'une clé fausse : on ne dit pas « cette clé a existé »
    return jsonb_build_object('ok', false, 'erreur', 'absent');
  end if;
  return jsonb_build_object('ok', true, 'rev', v_ligne.rev, 'data', v_ligne.data,
    'octets', v_ligne.octets, 'maj', v_ligne.maj, 'appareil', v_ligne.appareil, 'build', v_ligne.build);
end $$;

-- ── Effacer (le droit de reprendre ses données… et de les retirer) ────────
create or replace function public.bar_effacer(p_id text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_n integer;
begin
  if p_id is null or p_id !~ '^[A-Za-z0-9_-]{43}$' then
    return jsonb_build_object('ok', false, 'erreur', 'identifiant');
  end if;
  delete from public.bar_sauvegardes where id_hash = encode(digest(p_id, 'sha256'), 'hex');
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'effacees', v_n);
end $$;

-- ── Droits : retirés partout, puis rendus à « anon » pour ces trois seulement.
-- Supabase accorde l'exécution à tout le monde par défaut : sans ces lignes,
-- chaque fonction serait appelable par n'importe quel rôle, y compris les
-- fonctions futures.
revoke all on function public.bar_ecrire(text, bigint, text, text, text) from public, anon, authenticated;
revoke all on function public.bar_lire(text)    from public, anon, authenticated;
revoke all on function public.bar_effacer(text) from public, anon, authenticated;
grant execute on function public.bar_ecrire(text, bigint, text, text, text) to anon;
grant execute on function public.bar_lire(text)    to anon;
grant execute on function public.bar_effacer(text) to anon;
