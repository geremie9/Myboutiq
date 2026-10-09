-- ═══════════════════════════════════════════════════════════════════
--  Photos partagées : une adresse qui ne peut pas devenir du code (22.94)
--
--  La file des photos proposées est ouverte à tous, même sans compte
--  (politique « proposer une photo »). L'adresse n'était contrôlée que par
--  son début (https://…supabase.co/storage/%) : la suite pouvait contenir
--  un guillemet, et dans <img src="…"> le texte sorti de l'attribut
--  devenait un « onerror » — exécuté chez l'administrateur à l'ouverture
--  de la modération, puis chez toutes les boutiques une fois la photo
--  publiée. L'app échappe désormais ces valeurs (escH, srcSure) ; la base
--  les refuse à l'entrée. Les 4 photos existantes ont été vérifiées
--  conformes avant la pose.
-- ═══════════════════════════════════════════════════════════════════
alter table public.photos_partagees
  add constraint photos_partagees_url_sure
    check (url ~ '^https://bbncilovxzkcvlxvoqtg\.supabase\.co/storage/v1/object/public/APP/[^"''<>\\`]+$'),
  add constraint photos_partagees_nm_sans_balise
    check (article_nm !~ '[<>]');
