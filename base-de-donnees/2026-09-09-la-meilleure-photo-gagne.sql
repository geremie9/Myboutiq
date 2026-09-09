-- ═══════════════════════════════════════════════════════════════════
--  UNE SEULE PHOTO PAR PRODUIT : LA MEILLEURE          (app 21.57)
--
--  ⚠️ CE FICHIER EST DÉJÀ APPLIQUÉ EN PRODUCTION. Il est ici pour qu'on
--  puisse LIRE, dans le dépôt, la moitié de cette règle qui vit sur le
--  serveur — le reste est dans index.html (_meilleuresPhotos, _avisPhoto).
--
--  Le problème : quand plusieurs commerçants avaient offert une photo du
--  même produit, celle servie à toutes les boutiques était la dernière
--  ligne renvoyée par la base — c'est-à-dire au hasard. Et une photo
--  publiée une fois l'était pour toujours, même mauvaise.
--
--  Le principe : le serveur ne stocke que des FAITS (combien de boutiques
--  l'ont gardée, combien l'ont signalée) ; c'est l'application qui choisit,
--  avec la même règle partout, donc toutes voient la même photo.
-- ═══════════════════════════════════════════════════════════════════

alter table public.photos_partagees
  add column if not exists nb_garde   integer not null default 0,
  add column if not exists nb_signale integer not null default 0;

-- ⚠️ UNE BOUTIQUE = UNE VOIX PAR PHOTO (clé primaire photo_id+code_source).
-- Sans cela une seule boutique pourrait, à elle seule, faire disparaître une
-- photo chez mille autres.
create table if not exists public.photos_avis(
  photo_id    uuid        not null references public.photos_partagees(id) on delete cascade,
  code_source text        not null check (length(code_source) between 1 and 40),
  avis        text        not null check (avis in ('garde','signale')),
  cree_le     timestamptz not null default now(),
  primary key (photo_id, code_source)
);

create index if not exists photos_avis_photo_idx on public.photos_avis(photo_id);
create index if not exists photos_partagees_etat_slug_idx on public.photos_partagees(etat, slug);

alter table public.photos_avis enable row level security;

-- Seul le patron lit les avis : cette table contient le CODE de chaque
-- boutique. On ne publie pas la liste des codes pour compter des pouces.
create policy "les admins lisent les avis" on public.photos_avis
  for select to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

create policy "les admins effacent les avis" on public.photos_avis
  for delete to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

-- Les compteurs sont RECALCULÉS, jamais incrémentés : un compteur qui
-- s'incrémente dérive au premier incident, un compteur qui se recompte est
-- toujours juste.
create or replace function public.maj_compteurs_photo()
returns trigger language plpgsql security definer set search_path = public as $$
declare cible uuid;
begin
  cible := coalesce(new.photo_id, old.photo_id);
  update public.photos_partagees p set
    nb_garde   = (select count(*) from public.photos_avis a where a.photo_id = p.id and a.avis = 'garde'),
    nb_signale = (select count(*) from public.photos_avis a where a.photo_id = p.id and a.avis = 'signale')
  where p.id = cible;
  return null;
end $$;

-- Fonction de déclencheur : elle n'a rien à faire dans l'API publique.
revoke all on function public.maj_compteurs_photo() from public, anon, authenticated;

drop trigger if exists trg_photos_avis_compteurs on public.photos_avis;
create trigger trg_photos_avis_compteurs
  after insert or update or delete on public.photos_avis
  for each row execute function public.maj_compteurs_photo();

-- ── L'avis passe par une porte, pas par la table ────────────────────
-- Écrire dans photos_avis directement obligerait à ouvrir la LECTURE de
-- cette table aux boutiques (Postgres doit relire la ligne pour la
-- modifier). Tout passe donc par cette fonction : elle n'écrit que sur le
-- couple (photo, boutique) qu'on lui donne, ne renvoie rien, et porte la
-- règle — ⚠️ le premier avis d'une boutique reste, SAUF pour aller vers un
-- signalement. On peut toujours dire « en fait elle est fausse » ; on ne
-- peut jamais effacer le signalement d'une autre boutique.
create or replace function public.donner_avis_photo(p_photo uuid, p_code text, p_avis text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_avis is null or p_avis not in ('garde','signale') then return; end if;
  if p_code is null or length(p_code) < 1 or length(p_code) > 40 then return; end if;
  if not exists (select 1 from public.photos_partagees p
                 where p.id = p_photo and p.etat = 'approuvee') then return; end if;

  insert into public.photos_avis(photo_id, code_source, avis)
  values (p_photo, p_code, p_avis)
  on conflict (photo_id, code_source) do update
    set avis = 'signale', cree_le = now()
    where excluded.avis = 'signale' and public.photos_avis.avis <> 'signale';
end $$;

revoke all on function public.donner_avis_photo(uuid, text, text) from public;
grant execute on function public.donner_avis_photo(uuid, text, text) to anon, authenticated;
