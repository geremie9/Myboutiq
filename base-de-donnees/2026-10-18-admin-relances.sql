-- ═══════════════════════════════════════════════════════════════════
--  « À relancer » — la liste des boutiques, avec leurs jours de vente
--
--  Mesuré le 18/10 sur 64 boutiques : 26 créées sans aucun article, 9 avec
--  des articles mais aucune vente, 15 qui ont vendu UN SEUL jour puis plus
--  rien. Ce ne sont pas des refus : ce sont des gens qui ont essayé. Un
--  appel ou une note vocale du patron de MyBoutiQ vaut plus qu'un écran.
--
--  admin_boutiques() ne donnait que le nombre de ventes : impossible de
--  distinguer « a vendu un jour et s'est arrêté » de « vend tous les jours ».
--  On ne la modifie pas (changer son type de retour obligerait à la
--  supprimer, et les téléphones en 23.25 l'appellent) : une seconde
--  fonction, mêmes colonnes + trois, que l'app 23.26 essaie d'abord.
--
--  Même garde que les autres fonctions d'admin : admin_est(), et rien
--  d'autre que des totaux et des dates — jamais le contenu des ventes.
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.admin_boutiques2()
returns table(code text, nom text, telephone text, actif boolean, plan text,
              abonne_jusqu date, maj timestamptz, nb_ventes integer, nb_articles integer,
              jours_vente integer, derniere_vente date, cree_le timestamptz)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if not public.admin_est() then raise exception 'non autorise'; end if;
  return query
    select b.code, b.nom, b.telephone, b.actif, b.plan, b.abonne_jusqu, b.updated_at,
           coalesce(jsonb_array_length(b.data->'ventes'),0),
           coalesce(jsonb_array_length(b.data->'articles'),0),
           coalesce(v.jours,0)::integer, v.derniere, b.created_at
    from boutiques b
    left join lateral (
      -- La date d'une vente est écrite par le téléphone en JJ/MM/AAAA
      -- (toLocaleDateString fr-FR) ; une forme inattendue est ignorée,
      -- jamais une erreur qui viderait toute la liste.
      select count(distinct d) as jours, max(d) as derniere
      from (
        select to_date(x->>'date','DD/MM/YYYY') d
        from jsonb_array_elements(case when jsonb_typeof(b.data->'ventes')='array'
                                       then b.data->'ventes' else '[]'::jsonb end) x
        where coalesce(x->>'annulee','false')<>'true'
          and x->>'date' ~ '^(0?[1-9]|[12][0-9]|3[01])/(0?[1-9]|1[0-2])/[0-9]{4}$'
      ) s
    ) v on true
    order by b.updated_at desc nulls last;
end $$;

-- Supabase donne l'exécution à tout le monde par défaut. Les visiteurs
-- (anon) n'ont rien à faire ici ; un compte connecté passe, et la fonction
-- refuse elle-même quiconque n'est pas dans app_admins.
revoke execute on function public.admin_boutiques2() from public, anon;
grant execute on function public.admin_boutiques2() to authenticated;
