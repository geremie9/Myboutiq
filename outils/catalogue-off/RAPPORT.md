# Photos du catalogue — Open Food Facts

Généré par `construire.py` le 16/11/2026. Source unique : Open Food Facts (licence CC BY-SA 3.0, à créditer). Rien n'est importé dans l'app : c'est au patron de décider.

## Bilan

- Produits de la liste : **222**
- Avec une photo OFF : **76** (67 photos différentes, plusieurs produits partagent la même)
  - dont douteuses : **19** (liste plus bas)
- Sans photo : **146**
  - cherchés sur OFF, rien de bon : 31
  - recherche incomplète (OFF a répondu 503 trois fois de suite) : 8
  - pas encore cherchés (la recherche a été coupée au bout de 2 h, voir plus bas) : 54
  - pas cherchés exprès (vrac, frais, service, objet sans code-barres) : 53

## Pourquoi tout n'a pas été cherché

La recherche d'OFF (`/cgi/search.pl`) est limitée à environ 10 requêtes par minute et a répondu « 503 Service Temporarily Unavailable » à peu près une fois sur deux le 16/11/2026, même à une requête toutes les 6,5 s. La recherche a tourné 2 h (la limite d'une tâche de fond dans cette session) et s'est arrêtée au produit « Détergent Madar ». `chercher.py` reprend là où il s'est arrêté : le relancer complète `candidats.json`, puis il faut ajouter les choix dans `choix.tsv` et relancer `construire.py`.

## Photos retenues

produit → produit OFF retenu (code)

- Huile Mayor 1 L → Mayor (mayor, 1 litre) (6171100000017) — `photos/huile-mayor-1l.jpg`
- Huile Mayor 5 L → Mayor (mayor, 1 litre) (6171100000017) — `photos/huile-mayor-1l.jpg` ⚠️
- Huile Diamaor → DIAMAOR Huile De Graine De Coton (DIAMAOR, 1L) (6171003000008) — `photos/huile-diamaor-1l.jpg`
- Spaghetti Panzani → Spaghetti (Panzani) (6181100094909) — `photos/spaghetti-panzani-500g.jpg` ⚠️
- Macaroni Panzani → Macaroni (Panzani, 500g) (6181100094992) — `photos/macaroni-panzani-500g.jpg` ⚠️
- Indomie poulet → Instant Noodles Chicken (indomie, 40 x 70 g) (0089686130010) — `photos/indomie-poulet-70g.jpg`
- Indomie oignon → Onion Instant Noodles medium (indomie, 120 g) (6034000390124) — `photos/indomie-oignon-120g.jpg` ⚠️
- Semoule de maïs → Semoule de maïs moyenne (7611631143078) — `photos/semoule-de-mais.jpg`
- Maggi crevette → Maggi crevette (Maggi) (6181002001265) — `photos/maggi-crevette.jpg`
- Cube Jumbo → Cube de bouillon de poulet (JUMBO, 10g/cube) (6133320000017) — `photos/cube-jumbo-poulet.jpg` ⚠️
- Knorr → Knorr Chicken Cubes (كنور) (6111005120243) — `photos/cube-knorr-poulet.jpg` ⚠️
- Poivre blanc → NINE'EPICES Poivre Blanc De Penja En Grain (NINE'EPICES, 250 Gram) (6177000014277) — `photos/poivre-blanc-de-penja-250g.jpg`
- Tomate Tasty Tom → Tasty Tom small size (Tasty Tom) (6033000300140) — `photos/tomate-tasty-tom.jpg`
- Sardines Titus → Titus Sardines, Vegetable Oil (TITUS, 125 g) (6111239500026) — `photos/sardines-titus-125g.jpg`
- Sardines du Maroc → Sardine à l’huile végétale (Omega Fruits de mer, 125 gr) (6111255761494) — `photos/sardines-omega-125g.jpg`
- Corned beef → Corned Beef Princes (Princes, 340 g) (5000232414700) — `photos/corned-beef-princes-340g.jpg` ⚠️
- Mayonnaise → Mayonnaise (Calvé, Unilever, 450 ml) (6181001998061) — `photos/mayonnaise-calve-450ml.jpg`
- Margarine Blue Band → Blue Band (Blue Band, 450g) (6034000482072) — `photos/margarine-blue-band-450g.jpg`
- Petits pois → Petits Pois 1/2 (Cassegrain, 280 g) (3083681094282) — `photos/petits-pois-boite.jpg` ⚠️
- Lait Nido → Nido forticroissance (Nestlé) (6171100031325) — `photos/lait-nido-sachet.jpg`
- Lait Bonnet Rouge → Lait concentré sucré (Bonnet Rouge, 1000g) (8716200674904) — `photos/lait-bonnet-rouge-boite.jpg`
- Lait Gloria → Gloria Lait entier concentré non sucré (Nestlé, Gloria, 410g) (6033000082107) — `photos/lait-gloria-410g.jpg`
- Lait Peak → Lait peak (Peak, 900 g) (8716200449250) — `photos/lait-peak-boite.jpg`
- Milo → Milo (Nestlé, 400 g) (6033000089199) — `photos/milo-400g.jpg`
- Nescafé → Nescafé Classic (Nescafé, 45 g (25 dh)) (6111018903161) — `photos/nescafe-classic.jpg`
- Thé Lipton → Yellow Label Tea (Lipton, 25×2.0g) (6221048700705) — `photos/the-lipton-yellow-label.jpg`
- Tartina → TARTINA (CHOCOCAM) (6171100014526) — `photos/tartina.jpg`
- Mambo → Mambo Chocolat Au Riz (Beacon, 25g) (6171100013819) — `photos/mambo-25g.jpg`
- Cerelac → Cerelac (Nestlé, 250g) (6221007032540) — `photos/cerelac-250g.jpg`
- Quaker (flocons d'avoine) → Quaker White Oats (Quaker, 500g) (5000108478119) — `photos/quaker-white-oats-500g.jpg`
- Biscuits Biskrem → Biskrem (Ülker, 40 g) (8690504114154) — `photos/biscuits-biskrem.jpg`
- Biscuits Parle-G → Biscuits Parle-G (Gluco biscuits, 40.5 g) (8901719101014) — `photos/biscuits-parle-g.jpg`
- Mentos → Mentos fruit (Mentos, 38g) (87108026) — `photos/mentos-rouleau.jpg` ⚠️
- Chewing-gum → Chewing gum (Mentos, 57g) (8935001723516) — `photos/chewing-gum-mentos.jpg` ⚠️
- Chips de plantain → Chips de plantain HELOGAN (CRAQ, 200 g) (6177000003790) — `photos/chips-de-plantain-200g.jpg`
- Pringles → Original (Pringles, 165 g) (5053990127726) — `photos/pringles-original-165g.jpg`
- Coca-Cola → Coca-Cola Original Taste (Coca-Cola, 1 L) (5449000054227) — `photos/coca-cola-1l.jpg`
- Fanta → Fanta orange (COCA-COLA SERVICES SA/NV, 330 ml) (5449000011527) — `photos/fanta-orange-33cl.jpg`
- Sprite → Sprite (Coca-Cola) (5449000006295) — `photos/sprite-1l.jpg`
- Top Ananas → Top Ananas (Top, 1 l) (6174000001573) — `photos/top-ananas-1l.jpg`
- Top Pamplemousse → Top Pamplemousse Drink (Top, 1 l) (6174000001566) — `photos/top-pamplemousse-1l.jpg`
- Djino → Djino oranga (9501100006608) — `photos/djino-orange.jpg`
- Vimto → Vimto Canette (Vimto, 330 ml) (5010438007187) — `photos/vimto-33cl.jpg`
- Orangina → ORANGINA et sa pulpe (Orangina, 1 L) (8435185961914) — `photos/orangina-1l.jpg`
- Malta Guinness → Malta guinness (Guinness) (5000213021828) — `photos/malta-guinness.jpg`
- Eau Supermont 1,5 L → Eau Supermont (Source du Pays, Supermont, 1.5 l) (0853148003002) — `photos/eau-supermont-1-5l.jpg`
- Eau Supermont 0,5 L → Supermont (Supermont, 0,5 l) (0853148003019) — `photos/eau-supermont-0-5l.jpg`
- Eau Vitale → Eau vitale (9501100000958) — `photos/eau-vitale.jpg`
- Jus Don Simon → Don Simón Néctar De Mango (Don Simon, 1.5l) (8410261657820) — `photos/jus-don-simon-1-5l.jpg` ⚠️
- 33 Export → 33 Export, (33cle) (3184520001284) — `photos/biere-33-export.jpg` ⚠️
- Castel Beer → boisson alcoolisée (Castel Beer, 65 cl) (9501100002181) — `photos/biere-castel-65cl.jpg` ⚠️
- Mützig → Mützig (Brasseries du Cameroun, Mützig, 65 cl) (6176000000136) — `photos/biere-mutzig-65cl.jpg`
- Beaufort → bière blonde (Beaufort Lager, 65 cl) (9501100003072) — `photos/biere-beaufort-65cl.jpg`
- Guinness → Guinness foreign extra stout (Guinness, 65 cl) (5000213013007) — `photos/guinness-65cl.jpg`
- Smirnoff Ice → Smirnoff Ice Bottle 275ML (Smirnoff) (5410316992060) — `photos/smirnoff-ice-275ml.jpg`
- Kadji Beer → KADJI (KADJI, .33l) (6176000001072) — `photos/biere-kadji-33cl.jpg` ⚠️
- K44 → k44 (K44, 0.33l) (6176000000990) — `photos/biere-k44-33cl.jpg`
- Johnnie Walker Red → Red Label (Johnnie Walker, 75 cl) (5000267014005) — `photos/whisky-johnnie-walker-red-75cl.jpg`
- Jameson → Jameson Whiskey (Jameson, Jameson, 1000 g) (5011007003227) — `photos/whisky-jameson.jpg`
- Pastis 51 → Pastis 51,Pernod Ricard (Pastis 51, Pernod Ricard, 0.7l) (3047100000247) — `photos/pastis-51-70cl.jpg`
- Savon Palmolive → Palmolive Naturals Moisture Care olive & milk (Palmolive, 6 * 90g) (8714789702926) — `photos/savon-palmolive.jpg` ⚠️
- Savon Protex → deep clean (protex, 175g) (8718951697980) — `photos/savon-protex.jpg`
- Dentifrice Colgate → colgate (colgate, 100 ml (154 g)) (6920354812521) — `photos/dentifrice-colgate.jpg`
- Dentifrice Signal → Signal (unilever, Signal) (6221048407796) — `photos/dentifrice-signal.jpg`
- Brosses à dents → Brosse à dents (Signal) (8720181236341) — `photos/brosses-a-dents.jpg` ⚠️
- Vaseline → ? (unilever, vaseline, 100ml) (6001085120946) — `photos/vaseline-100ml.jpg`
- Nivea → Nivea Creme (Nivea, 150 ml) (4005800001192) — `photos/nivea-creme-150ml.jpg`
- Déodorant Rexona → ReXona (Unilever, rexona) (8714100019733) — `photos/deodorant-rexona.jpg`
- Huile Diamaor 1 L → DIAMAOR Huile De Graine De Coton (DIAMAOR, 1L) (6171003000008) — `photos/huile-diamaor-1l.jpg`
- Huile Diamaor 5 L → DIAMAOR Huile De Graine De Coton (DIAMAOR, 1L) (6171003000008) — `photos/huile-diamaor-1l.jpg` ⚠️
- Bidon Diamaor 20 L → DIAMAOR Huile De Graine De Coton (DIAMAOR, 1L) (6171003000008) — `photos/huile-diamaor-1l.jpg` ⚠️
- Huile Mayor → Mayor (mayor, 1 litre) (6171100000017) — `photos/huile-mayor-1l.jpg`
- Indomie → Instant Noodles Chicken (indomie, 40 x 70 g) (0089686130010) — `photos/indomie-poulet-70g.jpg`
- Lipton en boîte → Yellow Label Tea (Lipton, 25×2.0g) (6221048700705) — `photos/the-lipton-yellow-label.jpg`
- Lipton en sachets → Yellow Label Tea (Lipton, 25×2.0g) (6221048700705) — `photos/the-lipton-yellow-label.jpg` ⚠️
- Eau Supermont → Eau Supermont (Source du Pays, Supermont, 1.5 l) (0853148003002) — `photos/eau-supermont-1-5l.jpg`

## Correspondances douteuses

La photo est vraie, mais pas exactement le produit de la liste. À regarder avant d'importer.

- **Huile Mayor 5 L** (6171100000017) : photo de la bouteille de 1 L
- **Spaghetti Panzani** (6181100094909) : Panzani vendu au Sénégal (même emballage « Or »)
- **Macaroni Panzani** (6181100094992) : Panzani vendu au Sénégal
- **Indomie oignon** (6034000390124) : sachet de 120 g (Ghana), le 70 g n'a pas de photo
- **Cube Jumbo** (6133320000017) : Jumbo poulet du Maroc, pas forcément l'emballage vendu au Cameroun
- **Knorr** (6111005120243) : Knorr poulet, emballage arabe (Maroc)
- **Corned beef** (5000232414700) : marque Princes : la marque du quartier peut être autre
- **Petits pois** (3083681094282) : marque française Cassegrain, pas celle du quartier
- **Mentos** (87108026) : parfum fruits ; le rouleau menthe existe aussi
- **Chewing-gum** (8935001723516) : boîte de Mentos Pure Fresh ; la tablette de rue n'a pas de photo
- **Jus Don Simon** (8410261657820) : parfum mangue ; les autres parfums ont la même bouteille
- **33 Export** (3184520001284) : canette vendue en France ; au Cameroun c'est surtout la bouteille 65 cl
- **Castel Beer** (9501100002181) : bouteille du Burkina, même étiquette
- **Kadji Beer** (6176000001072) : bouteille 33 cl ; la 65 cl n'a pas de photo nette
- **Savon Palmolive** (8714789702926) : photo du paquet de 6 pains
- **Brosses à dents** (8720181236341) : marque Signal par défaut, paquet de 4
- **Huile Diamaor 5 L** (6171003000008) : photo de la bouteille de 1 L
- **Bidon Diamaor 20 L** (6171003000008) : photo de la bouteille de 1 L
- **Lipton en sachets** (6221048700705) : photo de la boîte, pas du sachet seul

## Sans photo — à photographier en boutique


### Cherchés sur OFF, aucune photo convenable (31)

- Huile Azur — Huiles — NORD/SUD
- Huile Azur Gold — Huiles — SUD
- Huile Soyor — Huiles — NORD/SUD
- Huile Neima — Huiles — NORD/SUD
- Huile Net Oil — Huiles — SUD
- Riz parfumé 5 kg — Riz, pâtes, farine — SUD
- Riz parfumé 25 kg — Riz, pâtes, farine — NORD/SUD
- Farine de blé — Riz, pâtes, farine — NORD/SUD
- Spaghetti importés — Riz, pâtes, farine — SUD
- Sucre Sosucam en morceaux — Sucre, sel, assaisonnements — NORD/SUD
- Sucre Sosucam en poudre — Sucre, sel, assaisonnements — SUD
- Sel fin — Sucre, sel, assaisonnements — SUD
- Gros sel — Sucre, sel, assaisonnements — SUD
- Maggi tablette — Sucre, sel, assaisonnements — SUD
- Ajinomoto — Sucre, sel, assaisonnements — NORD/SUD
- Tomate Gino — Conserves, tartinables — NORD/SUD
- Bonbons Tom Tom — Biscuits, confiseries — NORD/SUD
- Arachides grillées — Biscuits, confiseries — SUD
- Beaufort Light — Bières — SUD
- Isenbeck — Bières — SUD
- Booster — Bières — NORD/SUD
- Vin Baron de Valls — Vins, alcools — SUD
- Whisky Lion d'Or — Vins, alcools — SUD
- Savon Lux — Hygiène du corps — NORD/SUD
- Savon Dettol — Hygiène du corps — NORD/SUD
- Dentifrice Close-Up — Hygiène du corps — NORD/SUD
- Caro White — Hygiène du corps — SUD
- Lames Gillette — Hygiène du corps — SUD
- Savon Azur — Entretien de la maison — NORD/SUD
- Détergent Omo — Entretien de la maison — NORD/SUD
- Maggi — Assaisonnements — NORD

### Recherche incomplète (503 répétés) (8)

- Planet — Sucreries, eaux — SUD
- Eau Tangui — Sucreries, eaux — NORD/SUD
- Harp — Bières — SUD
- Vin Don Simon — Vins, alcools — SUD
- King Arthur — Vins, alcools — SUD
- Gin Gordon's — Vins, alcools — SUD
- Coton-tiges — Hygiène du corps — SUD
- Savon Sanet — Entretien de la maison — NORD/SUD

### Pas encore cherchés (recherche coupée) (54)

- Détergent Madar — Entretien de la maison — NORD/SUD
- Détergent Ariel — Entretien de la maison — NORD/SUD
- Eau de javel — Entretien de la maison — NORD/SUD
- Insecticide Baygon — Entretien de la maison — NORD/SUD
- Spirales Rambo — Entretien de la maison — SUD
- Insecticide Raid — Entretien de la maison — SUD
- Couches Pampers — Bébé et femme — NORD/SUD
- Couches Molfix — Bébé et femme — NORD/SUD
- Lingettes — Bébé et femme — SUD
- Serviettes Always — Bébé et femme — NORD/SUD
- Lait bébé Nan — Bébé et femme — NORD/SUD
- Piles Tiger Head — Divers — NORD/SUD
- Piles Duracell — Divers — SUD
- Vache qui rit — Vrac et frais — NORD/SUD
- Yaourt — Vrac et frais — SUD
- Gari — Vrac et frais — SUD
- Tapioca — Vrac et frais — SUD
- Couscous de manioc — Vrac et frais — SUD
- Power Oil / King's Oil (Nigeria) — Huiles — NORD
- Riz brisé — Céréales, pâtes — NORD
- Riz de Yagoua (Semry) — Céréales, pâtes — NORD
- Farine de maïs — Céréales, pâtes — NORD
- Couscous — Céréales, pâtes — NORD
- Spaghetti Dangote — Céréales, pâtes — NORD
- Spaghetti Golden Penny — Céréales, pâtes — NORD
- Macaroni — Céréales, pâtes — NORD
- Semoule Golden Penny — Céréales, pâtes — NORD
- Sucre Dangote — Sucre, thé, café — NORD
- Thé vert de Chine « gunpowder » – marque 1 — Sucre, thé, café — NORD
- Thé vert de Chine « gunpowder » – marque 2 — Sucre, thé, café — NORD
- Thé vert de Chine « gunpowder » – marque 3 — Sucre, thé, café — NORD
- Bournvita — Sucre, thé, café — NORD
- Ovaltine — Sucre, thé, café — NORD
- Lait Dano — Laits — NORD
- Lait Three Crowns — Laits — NORD
- Lait Cowbell — Laits — NORD
- Maggi Star — Assaisonnements — NORD
- Sel — Assaisonnements — NORD
- Piment sec — Assaisonnements — NORD
- Soumbala (daddawa) — Assaisonnements — NORD
- Poivre — Assaisonnements — NORD
- Curry — Assaisonnements — NORD
- Margarine — Conserves, tartinables — NORD
- Biscuits Cabin (Nigeria) — Biscuits, confiseries — NORD
- Dattes — Biscuits, confiseries — NORD
- Arachides — Biscuits, confiseries — NORD
- Bonbons à la menthe — Biscuits, confiseries — NORD
- Jus Chivita — Boissons sans alcool — NORD
- Bigi — Boissons sans alcool — NORD
- Bissap — Boissons sans alcool — NORD
- Insecticide Rambo — Maison — NORD
- Niébé — Vrac et frais — NORD
- Gombo sec — Vrac et frais — NORD
- Sésame — Vrac et frais — NORD

### Pas cherchés exprès : vrac, frais, service ou objet sans code-barres (53)

- Huile rouge (vrac) — Huiles — SUD
- Riz brisé (vrac) — Riz, pâtes, farine — SUD
- Pain — Petit-déjeuner — NORD/SUD
- Foléré (bissap) local — Sucreries, eaux — SUD
- Éponges — Entretien de la maison — SUD
- Serviettes hygiéniques locales — Bébé et femme — SUD
- Bougies — Divers — NORD/SUD
- Allumettes — Divers — NORD/SUD
- Briquets — Divers — NORD/SUD
- Ampoules — Divers — SUD
- Crédit MTN — Divers — NORD/SUD
- Crédit Orange — Divers — NORD/SUD
- Crédit Camtel — Divers — NORD/SUD
- Cigarettes Marlboro — Divers — NORD/SUD
- Cigarettes Benson & Hedges — Divers — NORD/SUD
- Recharge de gaz — Divers — NORD/SUD
- Stylos Bic — Divers — NORD/SUD
- Papier toilette — Divers — NORD/SUD
- Œufs — Vrac et frais — NORD/SUD
- Glaçons — Vrac et frais — SUD
- Arachides crues — Vrac et frais — SUD
- Haricots — Vrac et frais — SUD
- Crevettes séchées — Vrac et frais — SUD
- Poisson fumé — Vrac et frais — SUD
- Oignons — Vrac et frais — NORD/SUD
- Ail — Vrac et frais — NORD/SUD
- Huile d'arachide locale — Huiles — NORD
- Mil (vrac) — Céréales, pâtes — NORD
- Sorgho (vrac) — Céréales, pâtes — NORD
- Maïs (vrac) — Céréales, pâtes — NORD
- Sucre en vrac — Sucre, thé, café — NORD
- Gingembre sec — Sucre, thé, café — NORD
- Menthe — Sucre, thé, café — NORD
- Lait caillé local (kossam) — Laits — NORD
- Galettes locales — Biscuits, confiseries — NORD
- Eau en sachet — Boissons sans alcool — NORD
- Henné — Hygiène, lessive — NORD
- Kohl — Hygiène, lessive — NORD
- Parfums (attar) — Religion, tradition — NORD
- Encens (bakhour) — Religion, tradition — NORD
- Chapelets — Religion, tradition — NORD
- Tapis de prière — Religion, tradition — NORD
- Bâtonnets cure-dents (sotiou) — Religion, tradition — NORD
- Noix de cola — Religion, tradition — NORD
- Tabac à priser — Religion, tradition — NORD
- Bouilloires pour ablutions — Religion, tradition — NORD
- Spirales anti-moustiques — Maison — NORD
- Moustiquaires — Maison — NORD
- Lampes torches — Maison — NORD
- Cahiers — Divers — NORD
- Sachets plastique — Divers — NORD
- Poisson séché — Vrac et frais — NORD
- Beignets — Vrac et frais — NORD

## Fichiers

- `produits.tsv` : la liste (nom | catégorie | région | requête OFF).
- `candidats.json` : les réponses brutes d'OFF, par requête (sert de cache à `chercher.py`).
- `choix.tsv` : le choix fait à la main pour chaque produit, avec la note « douteux ».
- `chercher.py`, `photo.py`, `construire.py` : les scripts (Python 3 + Pillow).
- `photos/` : JPEG 600×600, produit entier, fond blanc, < 120 Ko.
- `catalogue-off.json` : prêt à importer, format de `catalogue-600.json` + crédit de licence.
