-- ═══════════════════════════════════════════════════════════════════
--  La voix du patron dans les annonces (23.27)
--
--  « Contourne pour afficher les notifications, car il y a d'autres
--  commerçants qui ne savent pas lire. » Une annonce écrite ne leur dit
--  rien ; une voix, si — et dans la langue qu'il choisit (français,
--  pidgin, ewondo…), ce que la synthèse du téléphone ne sait pas faire.
--
--  · annonces.audio : l'adresse du message enregistré, ou rien. La
--    contrainte n'accepte QUE notre propre seau : une adresse ailleurs
--    ferait jouer, chez tous les commerçants, un son choisi par un tiers.
--  · Le seau `annonces-voix` : public en lecture (les téléphones jouent le
--    son sans compte), sons seulement, 1 Mo au plus (30 s de voix pèsent
--    environ 100 Ko). Séparé de APP, qui n'accepte que des JPEG et que
--    l'app remplit avec la clé publique : rien ici ne s'ouvre à elle.
--  · Écriture : un administrateur (app_admins), et lui seul. Ni
--    remplacement ni suppression par l'app : chaque annonce a son fichier.
-- ═══════════════════════════════════════════════════════════════════
alter table public.annonces add column if not exists audio text;

alter table public.annonces drop constraint if exists annonces_audio_notre_seau;
alter table public.annonces add constraint annonces_audio_notre_seau check (
  audio is null
  or audio ~ '^https://bbncilovxzkcvlxvoqtg\.supabase\.co/storage/v1/object/public/annonces-voix/[A-Za-z0-9_-]+\.(webm|ogg|m4a|mp4)$'
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('annonces-voix', 'annonces-voix', true, 1048576,
        array['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/aac'])
on conflict (id) do update
  set public = true, file_size_limit = 1048576,
      allowed_mime_types = array['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/aac'];

drop policy if exists annonces_voix_admin_depose on storage.objects;
create policy annonces_voix_admin_depose on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'annonces-voix'
    and exists (select 1 from public.app_admins a where a.user_id = auth.uid())
  );
