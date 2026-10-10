-- ═══════════════════════════════════════════════════════════════════
--  Stockage APP : un compte n'écrase plus les photos des autres
--
--  Deux règles laissaient n'importe quel compte (un compte se crée en une
--  minute) écrire PARTOUT dans le seau public APP :
--    · auth_upload_app  : déposer n'importe quel fichier (une page .html,
--      un .svg…), n'importe où ;
--    · auth_update_app  : remplacer n'importe quel fichier existant — y
--      compris les 600 photos du catalogue, affichées par TOUTES les
--      boutiques.
--  L'app n'en a pas besoin : elle envoie ses photos avec la clé publique
--  (anon_upload_products : products/*.jpg, en POST, jamais en remplacement),
--  et les photos du catalogue sont posées par l'outil serveur, qui passe
--  outre ces règles. Vérifié le 10 octobre 2026 : 742 objets, tous sans
--  propriétaire (aucun n'a été envoyé par un compte connecté).
--
--  Les deux règles sont MODIFIÉES (pas supprimées) : un compte connecté
--  peut déposer ce que l'app dépose (products/*.jpg) ; seul un
--  administrateur écrit ou remplace ailleurs.
--  Vérifié après la pose, dans une transaction annulée, avec un compte
--  ordinaire simulé : catalogue/… refusé, products/page.html refusé,
--  products/x.jpg accepté.
-- ═══════════════════════════════════════════════════════════════════
alter policy auth_upload_app on storage.objects
  with check (
    bucket_id = 'APP' and (
      ((storage.foldername(name))[1] = 'products' and storage.extension(name) = 'jpg')
      or exists (select 1 from public.app_admins a where a.user_id = auth.uid())
    )
  );

alter policy auth_update_app on storage.objects
  using (bucket_id = 'APP' and exists (select 1 from public.app_admins a where a.user_id = auth.uid()))
  with check (bucket_id = 'APP' and exists (select 1 from public.app_admins a where a.user_id = auth.uid()));
