-- 24.33 — LA FORMULE D'UNE BOUTIQUE (gratuit / pro / grossiste / fondateur)
-- Le patron (27/11) : Pro 900 F/semaine ou 3 000 F/mois ; Grossiste 1 500 F/semaine
-- ou 5 000 F/mois, 3 boutiques puis 1 000 F par boutique ; offre fondateurs.
-- Même modèle qu'admin_abonnement : SECURITY DEFINER, l'appelant doit être dans
-- app_admins (admin_est), et SEULE la colonne `plan` bouge — jamais `data`.
create or replace function public.admin_formule(p_code text, p_plan text)
returns table(code text, nom text, plan text, abonne_jusqu date)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare n text; f text;
begin
  if not public.admin_est() then raise exception 'non autorise'; end if;
  n := regexp_replace(coalesce(p_code,''), '\D', '', 'g');
  if length(n) < 4 then raise exception 'code invalide'; end if;
  f := lower(coalesce(p_plan,''));
  if f not in ('gratuit','pro','grossiste','fondateur') then raise exception 'formule inconnue'; end if;
  update boutiques b set plan = f where regexp_replace(b.code, '\D', '', 'g') = n;
  return query
    select b.code, b.nom, b.plan, b.abonne_jusqu from boutiques b
     where regexp_replace(b.code, '\D', '', 'g') = n;
end $function$;

-- Supabase donne EXECUTE à tout le monde par défaut : on le reprend, puis on ne
-- le rend qu'aux comptes connectés (la fonction vérifie elle-même app_admins).
revoke execute on function public.admin_formule(text, text) from public, anon, authenticated;
grant execute on function public.admin_formule(text, text) to authenticated;
