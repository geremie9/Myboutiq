-- ═══════════════════════════════════════════════════════════════════
--  Le temps réel sans les codes des boutiques — étape 1 (compatible)
--
--  boutique_signal(code, updated_at) est lisible par tous (sig_anon_read)
--  et chaque téléphone écoute TOUTES ses lignes, puis trie lui-même par
--  code : la liste de tous les codes de boutique part donc chez tout le
--  monde. Or le code, c'est la moitié de l'entrée (code + PIN) — la même
--  raison pour laquelle photos_avis est réservée à l'admin.
--
--  Les vendeurs n'ont pas d'identité côté serveur (code + PIN seulement) :
--  une RLS « membres seulement » leur couperait le temps réel. À la place,
--  chaque boutique reçoit un CANAL secret (32 caractères hexadécimaux, tiré
--  au hasard par le serveur) rangé dans data.cfg.canal : seuls ceux qui
--  lisent la boutique (code + PIN, ou le patron connecté) le connaissent.
--  L'app (22.96) écoute « canal=eq.… » : le filtre est appliqué par le
--  serveur, plus rien d'autre n'arrive au téléphone.
--
--  Étape 1 (ici) : le canal est créé et écrit À CÔTÉ du code ; les anciennes
--  versions de l'app continuent d'écouter par code.
--  Étape 2 (quand les téléphones sont à jour) : ne plus écrire le code dans
--  boutique_signal. Les retardataires gardent la relecture toutes les 45 s.
-- ═══════════════════════════════════════════════════════════════════
alter table public.boutique_signal add column if not exists canal text;

-- Le canal : celui que le téléphone renvoie s'il est valable, sinon celui
-- déjà en base (une vieille version qui écrit sans le connaître ne doit pas
-- le changer), sinon un nouveau.
create or replace function public._canal_signal() returns trigger
language plpgsql set search_path = public, extensions as $$
declare v text;
begin
  if new.data is null or jsonb_typeof(new.data->'cfg') is distinct from 'object' then
    return new;
  end if;
  v := new.data->'cfg'->>'canal';
  if v is null or v !~ '^[0-9a-f]{32}$' then
    v := null;
    if tg_op = 'UPDATE' then
      v := old.data->'cfg'->>'canal';
      if v is null or v !~ '^[0-9a-f]{32}$' then v := null; end if;
    end if;
    if v is null then v := encode(extensions.gen_random_bytes(16), 'hex'); end if;
    new.data := jsonb_set(new.data, '{cfg,canal}', to_jsonb(v), true);
  end if;
  return new;
end $$;

create trigger trg_canal_signal before insert or update on public.boutiques
  for each row execute function public._canal_signal();

create or replace function public._bump_boutique_signal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.boutique_signal(code, canal, updated_at)
  values (new.code, nullif(new.data->'cfg'->>'canal', ''), now())
  on conflict (code) do update set updated_at = now(), canal = excluded.canal;
  return new;
end;$$;
