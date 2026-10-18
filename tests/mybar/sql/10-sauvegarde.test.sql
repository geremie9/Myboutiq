-- La sauvegarde en ligne, rejouée sur un vrai PostgreSQL : droits, confidentialité,
-- révisions, limites. Les identifiants :id1/:id2/:inconnu (43 caractères) viennent de run.sh.
\set ON_ERROR_STOP on
set client_min_messages = notice;

create schema if not exists t;
create or replace function t.ok(c boolean, label text) returns void language plpgsql as $$
begin
  if c is true then raise notice 'OK  %', label; else raise exception 'KO  %', label; end if;
end $$;
grant usage on schema t to anon;  grant execute on function t.ok(boolean, text) to anon;

-- ── 1. Droits (vus par le propriétaire) ──────────────────────────────────
select t.ok(not has_table_privilege('anon','public.bar_sauvegardes','select')
        and not has_table_privilege('anon','public.bar_sauvegardes','insert')
        and not has_table_privilege('anon','public.bar_sauvegardes','update')
        and not has_table_privilege('anon','public.bar_sauvegardes','delete'),
  'anon ne touche pas à la table');
select t.ok(not has_table_privilege('authenticated','public.bar_sauvegardes','select')
        and not has_table_privilege('authenticated','public.bar_sauvegardes','insert'),
  'authenticated non plus');
select t.ok((select relrowsecurity from pg_class where oid='public.bar_sauvegardes'::regclass),
  'la RLS est active (et sans aucune règle)');
select t.ok((select count(*) from pg_policies where tablename='bar_sauvegardes') = 0,
  'aucune règle RLS : rien n''est ouvert par erreur');
select t.ok(has_function_privilege('anon','public.bar_ecrire(text,bigint,text,text,text)','execute')
        and has_function_privilege('anon','public.bar_lire(text)','execute')
        and has_function_privilege('anon','public.bar_effacer(text)','execute'),
  'anon peut appeler les trois fonctions');
select t.ok(not has_function_privilege('authenticated','public.bar_ecrire(text,bigint,text,text,text)','execute')
        and not has_function_privilege('authenticated','public.bar_lire(text)','execute'),
  'authenticated n''a pas hérité de l''exécution par défaut');
select t.ok((select bool_and(prosecdef and proconfig::text like '%search_path=public, extensions%')
               from pg_proc where proname in ('bar_ecrire','bar_lire','bar_effacer') and pronamespace='public'::regnamespace),
  'security definer, avec un search_path figé');

-- ── 2. Ce que voit un appareil anonyme ────────────────────────────────────
set role anon;

do $$ begin
  perform count(*) from public.bar_sauvegardes;
  raise exception 'KO  anon a pu lire la table';
exception when insufficient_privilege then
  raise notice 'OK  anon ne peut pas lire la table directement';
end $$;
do $$ begin
  insert into public.bar_sauvegardes(id_hash,data,octets) values (repeat('a',64),repeat('x',20),20);
  raise exception 'KO  anon a pu écrire dans la table';
exception when insufficient_privilege then
  raise notice 'OK  anon ne peut pas y écrire';
end $$;

select t.ok((public.bar_ecrire(:'id1', 0, repeat('A',100), 'tel-comptoir', '2.0') ->> 'ok')::boolean
        and (public.bar_ecrire(:'id1', 0, repeat('B',100)) ->> 'erreur') = 'conflit',
  'première écriture : révision 1 ; une 2e « première fois » sur la même clé est un conflit');
select t.ok((public.bar_ecrire(:'id1', 1, repeat('C',100)) ->> 'rev')::int = 2,
  'écrire en connaissant la révision 1 → révision 2');
select t.ok((public.bar_ecrire(:'id1', 1, repeat('D',100)) ->> 'erreur') = 'conflit'
        and (public.bar_ecrire(:'id1', 1, repeat('D',100)) ->> 'rev')::int = 2,
  'écrire avec une révision périmée : refusé, et le serveur dit la bonne');
select t.ok((public.bar_lire(:'id1') ->> 'data') = repeat('C',100)
        and (public.bar_lire(:'id1') ->> 'rev')::int = 2,
  'lire rend la dernière version écrite, pas celle d''un écrasement refusé');
select t.ok((public.bar_lire(:'inconnu') ->> 'erreur') = 'absent',
  'une clé inconnue : « absent »');
select t.ok((public.bar_lire('trop-court') ->> 'erreur') = 'identifiant'
        and (public.bar_ecrire('trop-court', 0, repeat('A',100)) ->> 'erreur') = 'identifiant'
        and (public.bar_effacer('trop-court') ->> 'erreur') = 'identifiant',
  'un identifiant mal formé est refusé par les trois fonctions');
select t.ok((public.bar_ecrire(:'id2', 0, 'court') ->> 'erreur') = 'donnees',
  'des données trop courtes sont refusées');
select t.ok((public.bar_ecrire(:'id2', 0, repeat('x',4000001)) ->> 'erreur') = 'trop_gros',
  'au-delà de 4 Mo : refusé');
select t.ok((public.bar_ecrire(:'id2', 0, repeat('E',100), repeat('n',90), repeat('v',50)) ->> 'ok')::boolean,
  'un second bar est indépendant du premier');
select t.ok((public.bar_lire(:'id1') ->> 'data') = repeat('C',100),
  'et n''a pas touché au premier');

reset role;

-- ── 3. Ce que le serveur sait de nous ─────────────────────────────────────
select t.ok((select count(*) from public.bar_sauvegardes where id_hash in (:'id1', :'id2')) = 0,
  'l''identifiant en clair n''est stocké nulle part');
select t.ok((select count(*) from public.bar_sauvegardes
              where id_hash = encode(extensions.digest(:'id1','sha256'),'hex')) = 1,
  'seul son hachage SHA-256 est rangé');
select t.ok((select max(length(appareil)) from public.bar_sauvegardes) = 40
        and (select max(length(build)) from public.bar_sauvegardes) = 20,
  'le nom de l''appareil et la version sont tronqués (40 et 20)');

-- ── 4. Effacer ────────────────────────────────────────────────────────────
set role anon;
select t.ok((public.bar_effacer(:'id1') ->> 'effacees')::int = 1
        and (public.bar_lire(:'id1') ->> 'erreur') = 'absent'
        and (public.bar_effacer(:'id1') ->> 'effacees')::int = 0,
  'effacer retire la copie, et recommencer ne casse rien');
select t.ok((public.bar_ecrire(:'id1', 7, repeat('F',100)) ->> 'rev')::int = 1,
  'écrire sur une clé effacée la recrée, quelle que soit la révision que croyait le téléphone');
reset role;
