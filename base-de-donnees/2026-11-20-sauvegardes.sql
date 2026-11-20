-- ═══════════════════════════════════════════════════════════════════
--  La sauvegarde de chaque nuit (20/11/2026).
--
--  La page du projet Supabase disait « Last backup : No backups » : l'offre
--  gratuite (Nano) ne garde aucune sauvegarde qu'on puisse récupérer. Une
--  fausse manipulation, une synchro qui écrase, une boutique vidée par
--  erreur — et il n'y avait aucun retour possible. Le patron : « Go ».
--
--  Chaque nuit à 2 h 13 (heure de Douala), une COPIE de chaque boutique
--  modifiée depuis sa dernière copie. Mesuré le 20/11 : 83 boutiques,
--  532 Ko en tout — garder 60 jours d'historique ne coûte rien.
--  On garde : 60 jours de copies, et TOUJOURS la dernière de chaque boutique,
--  même plus vieille (une boutique qui dort ne perd pas sa seule copie).
--
--  ⚠️ Table fermée (RLS sans politique, aucun droit pour anon/authenticated) :
--  elle contient les données de toutes les boutiques.
--  ⚠️ Elle vit dans la MÊME base : elle protège des erreurs et des écrasements,
--  pas de la perte du projet entier. Pour ça, une copie hors de Supabase
--  (étape suivante, à décider avec le patron).
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.sauvegardes_boutiques (
  id          bigserial primary key,
  pris_le     timestamptz not null default now(),
  code        text        not null,
  nom         text,
  owner_id    uuid,
  actif       boolean,
  plan        text,
  abonne_jusqu date,
  maj_boutique timestamptz,        -- updated_at de la boutique au moment de la copie
  data        jsonb
);
create index if not exists sauvegardes_boutiques_code on public.sauvegardes_boutiques (code, pris_le desc);
alter table public.sauvegardes_boutiques enable row level security;
revoke all on public.sauvegardes_boutiques from anon, authenticated;

-- Copie les boutiques modifiées depuis leur dernière copie ; rend le nombre copié.
create or replace function public.sauvegarder_boutiques()
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare n int;
begin
  insert into public.sauvegardes_boutiques (code, nom, owner_id, actif, plan, abonne_jusqu, maj_boutique, data)
  select b.code, b.nom, b.owner_id, b.actif, b.plan, b.abonne_jusqu, b.updated_at, b.data
    from public.boutiques b
   where b.code is not null
     and not exists (
       select 1 from public.sauvegardes_boutiques s
        where s.code = b.code
          and s.maj_boutique is not distinct from b.updated_at
          and s.data = b.data);
  get diagnostics n = row_count;

  -- Ménage : plus de 60 jours, SAUF la dernière copie de chaque boutique.
  delete from public.sauvegardes_boutiques s
   where s.pris_le < now() - interval '60 days'
     and s.id <> (select max(s2.id) from public.sauvegardes_boutiques s2 where s2.code = s.code);
  return n;
end;
$$;
revoke execute on function public.sauvegarder_boutiques() from public, anon, authenticated;

-- Chaque nuit à 2 h 13 à Douala = 1 h 13 UTC.
select cron.unschedule('sauvegarde-boutiques') where exists (select 1 from cron.job where jobname = 'sauvegarde-boutiques');
select cron.schedule('sauvegarde-boutiques', '13 1 * * *', $$select public.sauvegarder_boutiques()$$);

-- ── Restaurer une boutique (à la main, par l'admin, dans l'éditeur SQL) ──
-- 1. Voir ses copies :
--      select id, pris_le, maj_boutique, pg_column_size(data) from public.sauvegardes_boutiques
--       where code = '64972 08757' order by pris_le desc;
-- 2. Remettre la copie choisie (l'état actuel est d'abord copié, pour pouvoir revenir) :
--      select public.sauvegarder_boutiques();
--      update public.boutiques b set data = s.data, updated_at = now()
--        from public.sauvegardes_boutiques s where s.id = <id> and b.code = s.code;
