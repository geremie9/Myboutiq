-- ═══════════════════════════════════════════════════════════════════
--  Le temps réel sans les codes des boutiques — étape 2 (base seule, après la 23.93)
--
--  L'étape 1 (2026-10-10-canal-signal.sql) a donné à chaque boutique un
--  canal secret et l'a écrit À CÔTÉ du code dans boutique_signal, pour que
--  les vieilles versions de l'app continuent d'écouter par code.
--
--  Mesuré le 20/11/2026 avant cette étape :
--    · boutique_signal : 161 lignes, chacune avec le CODE d'une boutique,
--      lisibles par tout le monde (politique sig_anon_read, anon compris).
--      Le code, c'est la moitié de l'entrée (code + PIN) ;
--    · les 29 boutiques qui ont écrit depuis le 10/10 ont toutes leur canal
--      (13 actives cette semaine) ; les 45 autres dorment depuis le 10/10 —
--      elles recevront leur canal à leur prochaine écriture (trg_canal_signal).
--    · l'app lit le signal par canal depuis la 22.96 (subscribeRealtime :
--      « canal=eq.… »).
--
--  Étape 2 : la clé de la ligne devient le CANAL (32 caractères hexadécimaux),
--  jamais le code. Une boutique sans canal valable n'écrit pas de signal (le
--  déclencheur trg_canal_signal, AVANT, lui en donne un à chaque écriture,
--  donc ça n'arrive pas en pratique). Les lignes portant un vrai code sont
--  effacées.
--  Un téléphone resté avant la 22.96 perd le temps réel ; il garde la
--  relecture toutes les 45 s (reconnecterTempsReel).
-- ═══════════════════════════════════════════════════════════════════
create or replace function public._bump_boutique_signal() returns trigger
language plpgsql security definer set search_path = public as $$
declare v text := new.data->'cfg'->>'canal';
begin
  if v is null or v !~ '^[0-9a-f]{32}$' then return new; end if;
  insert into public.boutique_signal(code, canal, updated_at)
  values (v, v, now())
  on conflict (code) do update set updated_at = now(), canal = excluded.canal;
  return new;
end;$$;

revoke execute on function public._bump_boutique_signal() from public, anon, authenticated;

-- Plus aucun code de boutique dans la table lisible par tous.
delete from public.boutique_signal where code !~ '^[0-9a-f]{32}$';
