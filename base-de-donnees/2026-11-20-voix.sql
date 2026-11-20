-- ═══════════════════════════════════════════════════════════════════
--  La voix payante (23.80) — abonnement et compteur de minutes.
--
--  Le patron, le 20/11/2026 : « la voix avec des API payantes à faible
--  coût — ceux qui sont prêts à payer ont souvent du wifi et du solaire ».
--  La fonction serveur `voix` transcrit une courte phrase chez un service
--  payant (Groq, OpenAI ou AssemblyAI). La clé du service ne quitte jamais
--  le serveur ; ces tables disent QUI y a droit et COMBIEN il a utilisé.
--
--  ⚠️ Tables fermées : RLS sans aucune politique, et aucun droit pour
--  anon/authenticated. Seule la fonction serveur (rôle service) y touche.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.voix_abonnes (
  code          text primary key,              -- le code de la boutique
  actif         boolean not null default true,
  minutes_mois  int     not null default 600,  -- l'usage raisonnable du mois
  jusqu         date,                          -- null = sans fin (pilote)
  note          text,
  cree_le       timestamptz not null default now()
);

create table if not exists public.voix_usage (
  code      text    not null,
  mois      text    not null,                  -- 'AAAA-MM', heure de Douala
  secondes  numeric not null default 0,
  requetes  int     not null default 0,
  maj_le    timestamptz not null default now(),
  primary key (code, mois)
);

alter table public.voix_abonnes enable row level security;
alter table public.voix_usage   enable row level security;
revoke all on public.voix_abonnes from anon, authenticated;
revoke all on public.voix_usage   from anon, authenticated;

-- Le téléphone a-t-il le droit de transcrire ?
--  · le patron connecté (son compte possède la boutique), ou
--  · un téléphone qui connaît un PIN de la boutique (patron ou équipe) —
--    avec le MÊME frein aux essais que boutique_lire (_pin_attente…).
-- Puis : un abonnement actif, et des minutes restantes ce mois-ci.
create or replace function public.voix_autoriser(p_code text, p_pin text, p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row  public.boutiques%rowtype;
  v_role text;
  v_wait int;
  v_ab   public.voix_abonnes%rowtype;
  v_mois text := to_char(now() at time zone 'Africa/Douala', 'YYYY-MM');
  v_util numeric := 0;
begin
  select * into v_row from public.boutiques where code = p_code and actif = true limit 1;
  if v_row.id is not null and p_user is not null and v_row.owner_id = p_user then
    v_role := 'patron';
  else
    v_wait := public._pin_attente(p_code);
    if v_wait > 0 then
      return jsonb_build_object('ok', false, 'motif', 'bloque', 'attente', v_wait);
    end if;
    if v_row.id is null then
      perform public._pin_echec(p_code);           -- un code inventé compte aussi
      return jsonb_build_object('ok', false, 'motif', 'acces');
    end if;
    v_role := public._boutique_role_du_pin(v_row, coalesce(p_pin, ''));
    if v_role is null then
      perform public._pin_echec(p_code);
      return jsonb_build_object('ok', false, 'motif', 'acces');
    end if;
    perform public._pin_succes(p_code);
  end if;

  select * into v_ab from public.voix_abonnes
   where code = p_code and actif and (jusqu is null or jusqu >= current_date);
  if v_ab.code is null then
    return jsonb_build_object('ok', false, 'motif', 'abonnement', 'role', v_role);
  end if;

  select coalesce(secondes, 0) into v_util from public.voix_usage where code = p_code and mois = v_mois;
  v_util := coalesce(v_util, 0);
  if v_util >= v_ab.minutes_mois * 60 then
    return jsonb_build_object('ok', false, 'motif', 'quota', 'role', v_role);
  end if;
  return jsonb_build_object('ok', true, 'role', v_role, 'reste', v_ab.minutes_mois * 60 - v_util);
end;
$$;

-- Ajoute la durée d'une phrase transcrite au compteur du mois.
create or replace function public.voix_compter(p_code text, p_secondes numeric)
returns void
language sql
security definer
set search_path to 'public'
as $$
  insert into public.voix_usage (code, mois, secondes, requetes, maj_le)
  values (p_code, to_char(now() at time zone 'Africa/Douala', 'YYYY-MM'), greatest(p_secondes, 1), 1, now())
  on conflict (code, mois) do update
    set secondes = public.voix_usage.secondes + greatest(excluded.secondes, 1),
        requetes = public.voix_usage.requetes + 1,
        maj_le   = now();
$$;

-- ⚠️ Supabase donne EXECUTE à tout le monde par défaut : on le retire.
revoke execute on function public.voix_autoriser(text, text, uuid) from public, anon, authenticated;
revoke execute on function public.voix_compter(text, numeric)      from public, anon, authenticated;

-- Pour ouvrir le pilote à une boutique (à faire à la main, par le patron) :
--   insert into public.voix_abonnes (code, note) values ('CODE1234', 'pilote novembre');
