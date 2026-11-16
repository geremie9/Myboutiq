# Photos du catalogue — Open Food Facts

Généré par `construire.py` le 16/11/2026. Source unique : Open Food Facts (licence CC BY-SA 3.0, à créditer). Rien n'est importé dans l'app : c'est au patron de décider.

## Bilan

- Produits de la liste : **222**
- Avec une photo OFF : **110** (101 photos différentes, plusieurs produits partagent la même)
  - dont douteuses : **43** (liste plus bas)
- Sans photo : **112**
  - cherchés sur OFF, rien de bon : 58
  - recherche incomplète (OFF a répondu 503 à chaque essai, plusieurs passes) : 1
  - pas encore cherchés : 0
  - pas cherchés exprès (vrac, frais, service, objet sans code-barres) : 53

## Comment la recherche s'est faite

La recherche d'OFF (`/cgi/search.pl`) est limitée à environ 10 requêtes par minute et a répondu « 503 Service Temporarily Unavailable » plus d'une fois sur deux le 16/11/2026, même à une requête toutes les 6,5 s. Une 1re session s'est arrêtée au produit « Détergent Madar » au bout de 2 h ; une 2e session a repris avec `chercher.py` le même jour (environ 4 h de recherche, toujours à une requête toutes les 6,5 s, 30 à 90 s d'attente après chaque 503) et a refait les requêtes qui avaient échoué. `chercher.py` ne redemande plus que la moitié manquante d'une requête, et un 503 n'efface plus une réponse déjà reçue (« orangina » avait perdu ses candidats Cameroun de cette façon).

Chaque photo a été choisie à l'œil sur une planche contact : produit entier (bouteille, boîte ou paquet complet, rien de coupé), le bon produit ou, à défaut, un emballage très proche signalé « douteux ». Quand aucune photo n'était entière (Rambo, Raid, Harp, Semovita Golden Penny, gombo séché), le produit est laissé sans photo plutôt qu'avec une photo coupée.

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
- Eau Tangui → Source Tangui (6174000003010) — `photos/eau-tangui.jpg` ⚠️
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
- Vin Don Simon → Vino blanco (Don Simon, 3 x 187 ml) (8410261273402) — `photos/vin-don-simon.jpg` ⚠️
- Johnnie Walker Red → Red Label (Johnnie Walker, 75 cl) (5000267014005) — `photos/whisky-johnnie-walker-red-75cl.jpg`
- Jameson → Jameson Whiskey (Jameson, Jameson, 1000 g) (5011007003227) — `photos/whisky-jameson.jpg`
- Gin Gordon's → Gin Gordon's (Gordon's, 1l) (5000289925433) — `photos/gin-gordons-1l.jpg` ⚠️
- Pastis 51 → Pastis 51,Pernod Ricard (Pastis 51, Pernod Ricard, 0.7l) (3047100000247) — `photos/pastis-51-70cl.jpg`
- Savon Palmolive → Palmolive Naturals Moisture Care olive & milk (Palmolive, 6 * 90g) (8714789702926) — `photos/savon-palmolive.jpg` ⚠️
- Savon Protex → deep clean (protex, 175g) (8718951697980) — `photos/savon-protex.jpg`
- Dentifrice Colgate → colgate (colgate, 100 ml (154 g)) (6920354812521) — `photos/dentifrice-colgate.jpg`
- Dentifrice Signal → Signal (unilever, Signal) (6221048407796) — `photos/dentifrice-signal.jpg`
- Brosses à dents → Brosse à dents (Signal) (8720181236341) — `photos/brosses-a-dents.jpg` ⚠️
- Vaseline → ? (unilever, vaseline, 100ml) (6001085120946) — `photos/vaseline-100ml.jpg`
- Nivea → Nivea Creme (Nivea, 150 ml) (4005800001192) — `photos/nivea-creme-150ml.jpg`
- Déodorant Rexona → ReXona (Unilever, rexona) (8714100019733) — `photos/deodorant-rexona.jpg`
- Coton-tiges → Coty'lys Family batonnets ouatés (Coty'lys, 200 pièces) (6130552001034) — `photos/coton-tiges.jpg` ⚠️
- Détergent Ariel → Ariel (P&G) (8700216604062) — `photos/lessive-ariel.jpg` ⚠️
- Eau de javel → EAU DE JAVEL BREF (1 L) (6130430005413) — `photos/eau-de-javel-bref.jpg` ⚠️
- Insecticide Baygon → Baygon Crawling Insect killer (6001298899752) — `photos/insecticide-baygon.jpg` ⚠️
- Couches Pampers → Bleier klasse 1 (2-5 kg) (Pampers, 24 pcs) (8700216664448) — `photos/couches-pampers.jpg` ⚠️
- Lingettes → Lingettes Natural Care with Aloe Vera (Huggies, 56 pcs) (5029053550152) — `photos/lingettes-huggies.jpg` ⚠️
- Serviettes Always → Ultra normal (always, 14 pcs) (8006540822340) — `photos/serviettes-always.jpg`
- Lait bébé Nan → Nan Optipro 1 (Nestlé, 400g) (7613035502727) — `photos/lait-bebe-nan-400g.jpg`
- Piles Duracell → Duracell AA (Duracell) (5000394176027) — `photos/piles-duracell-aa.jpg`
- Vache qui rit → La Vache qui rit légère 16 portions (La Vache qui rit, Bel, 267 g) (3073781175011) — `photos/vache-qui-rit.jpg` ⚠️
- Yaourt → yaourt (Dolait, 200g) (6500220585430) — `photos/yaourt-dolait.jpg`
- Tapioca → tapioca (Priméal, 250 g) (3380380021619) — `photos/tapioca-sachet.jpg` ⚠️
- Couscous de manioc → Attiéké (Fatou, 500 g) (6186000019021) — `photos/couscous-de-manioc-attieke.jpg` ⚠️
- Huile Diamaor 1 L → DIAMAOR Huile De Graine De Coton (DIAMAOR, 1L) (6171003000008) — `photos/huile-diamaor-1l.jpg`
- Huile Diamaor 5 L → DIAMAOR Huile De Graine De Coton (DIAMAOR, 1L) (6171003000008) — `photos/huile-diamaor-1l.jpg` ⚠️
- Bidon Diamaor 20 L → DIAMAOR Huile De Graine De Coton (DIAMAOR, 1L) (6171003000008) — `photos/huile-diamaor-1l.jpg` ⚠️
- Huile Mayor → Mayor (mayor, 1 litre) (6171100000017) — `photos/huile-mayor-1l.jpg`
- Riz brisé → Riz Thaï Brisé Parfumé Golden Phoenix 4,5 KG (8858306001618) — `photos/riz-brise-golden-phoenix.jpg` ⚠️
- Spaghetti Golden Penny → Spaghetti (Golden Penny, 500g) (6156000032207) — `photos/spaghetti-golden-penny-500g.jpg`
- Macaroni → la pasta gold (Panzani, 500g) (3760277891073) — `photos/macaroni-panzani-gold.jpg` ⚠️
- Indomie → Instant Noodles Chicken (indomie, 40 x 70 g) (0089686130010) — `photos/indomie-poulet-70g.jpg`
- Sucre Dangote → Sugar (Dangote, 500 g) (6156000061016) — `photos/sucre-dangote-500g.jpg` ⚠️
- Thé vert de Chine « gunpowder » – marque 1 → China green tea special gunpowder (Marwan, 200 g) (3683080232157) — `photos/the-vert-marwan.jpg` ⚠️
- Thé vert de Chine « gunpowder » – marque 2 → Temple of heaven, special gunpowder china green tea (Temple Du Ciel, Temple Of Heaven, 500 g) (6931708306030) — `photos/the-vert-temple-du-ciel.jpg` ⚠️
- Thé vert de Chine « gunpowder » – marque 3 → Dahmiss (Dahmiss) (6111175000772) — `photos/the-vert-dahmiss.jpg` ⚠️
- Lipton en boîte → Yellow Label Tea (Lipton, 25×2.0g) (6221048700705) — `photos/the-lipton-yellow-label.jpg`
- Lipton en sachets → Yellow Label Tea (Lipton, 25×2.0g) (6221048700705) — `photos/the-lipton-yellow-label.jpg` ⚠️
- Bournvita → BournVita (Cadbury) (7622201679187) — `photos/bournvita.jpg`
- Ovaltine → Olvatine (Ovaltine, 800g) (7612100062760) — `photos/ovaltine-800g.jpg` ⚠️
- Lait Dano → Dano lait entier en poudre (arla dano, 400 g) (6044000141053) — `photos/lait-dano-poudre-400g.jpg`
- Lait Three Crowns → Filled Evaporated Milk (Three Crowns) (04443544) — `photos/lait-three-crowns-boite.jpg` ⚠️
- Lait Cowbell → Cowbell lait (PROMASIDOR, 12g) (6008155009330) — `photos/lait-cowbell-sachet.jpg`
- Sel → Sel de table iodé (Star, 400g) (6111184001562) — `photos/sel-de-table-star.jpg` ⚠️
- Soumbala (daddawa) → Soumbala en Poudre (3123456789217) — `photos/soumbala-poudre.jpg` ⚠️
- Poivre → Poivre noir moulu (Ducros, 38g) (3166296203116) — `photos/poivre-noir-ducros.jpg` ⚠️
- Arachides → Arachide grillé (Mafor, 50gi) (6780201501301) — `photos/arachides-grillees-mafor.jpg`
- Eau Supermont → Eau Supermont (Source du Pays, Supermont, 1.5 l) (0853148003002) — `photos/eau-supermont-1-5l.jpg`
- Jus Chivita → Orange Juice Blend 100% Fruit Juice (Chivita, 1 l) (6151100050014) — `photos/jus-chivita-1l.jpg`
- Bissap → Thé De Bissap (KOPACRE, 35g) (6176000113102) — `photos/bissap-kopacre.jpg` ⚠️

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
- **Eau Tangui** (6174000003010) : le bas de la bouteille est coupé sur la photo d'origine
- **Jus Don Simon** (8410261657820) : parfum mangue ; les autres parfums ont la même bouteille
- **33 Export** (3184520001284) : canette vendue en France ; au Cameroun c'est surtout la bouteille 65 cl
- **Castel Beer** (9501100002181) : bouteille du Burkina, même étiquette
- **Kadji Beer** (6176000001072) : bouteille 33 cl ; la 65 cl n'a pas de photo nette
- **Vin Don Simon** (8410261273402) : briques de vin blanc 187 ml ; le vin rouge en brique de 1 L n'a pas de photo
- **Gin Gordon's** (5000289925433) : le bouchon touche le bord de la photo d'origine
- **Savon Palmolive** (8714789702926) : photo du paquet de 6 pains
- **Brosses à dents** (8720181236341) : marque Signal par défaut, paquet de 4
- **Coton-tiges** (6130552001034) : marque algérienne Coty'lys : la marque du quartier peut être autre
- **Détergent Ariel** (8700216604062) : bouteille de lessive liquide (France) ; au quartier c'est le sachet de poudre (le carton de poudre n'avait pas de photo entière)
- **Eau de javel** (6130430005413) : marque algérienne Bref : la marque du quartier peut être autre
- **Insecticide Baygon** (6001298899752) : bombe vendue au Qatar, même bombe verte
- **Couches Pampers** (8700216664448) : paquet vendu en Norvège, même emballage
- **Lingettes** (5029053550152) : marque Huggies par défaut
- **Vache qui rit** (3073781175011) : boîte « légère » de 16 portions (France) ; au quartier la portion se vend à l'unité
- **Tapioca** (3380380021619) : tapioca en sachet bio (France) ; le tapioca du quartier est en vrac ou en sachet local
- **Couscous de manioc** (6186000019021) : attiéké en boîte (marque Fatou) ; le couscous de manioc du quartier est en sachet
- **Huile Diamaor 5 L** (6171003000008) : photo de la bouteille de 1 L
- **Bidon Diamaor 20 L** (6171003000008) : photo de la bouteille de 1 L
- **Riz brisé** (8858306001618) : sac de riz thaï brisé 4,5 kg ; au Nord le riz brisé se vend souvent au sac de 25 ou 50 kg
- **Macaroni** (3760277891073) : pâtes Panzani « Gold » vendues au Cameroun ; la forme (coudes ou penne) est à vérifier
- **Sucre Dangote** (6156000061016) : sachet photographié en main
- **Thé vert de Chine « gunpowder » – marque 1** (3683080232157) : marque au hasard : la marque vendue au Nord n'est pas connue
- **Thé vert de Chine « gunpowder » – marque 2** (6931708306030) : marque au hasard : la marque vendue au Nord n'est pas connue
- **Thé vert de Chine « gunpowder » – marque 3** (6111175000772) : marque marocaine au hasard : la marque vendue au Nord n'est pas connue
- **Lipton en sachets** (6221048700705) : photo de la boîte, pas du sachet seul
- **Ovaltine** (7612100062760) : le couvercle est un peu coupé sur la photo d'origine
- **Lait Three Crowns** (04443544) : boîte de lait concentré ; le sachet de poudre n'a pas de photo entière
- **Sel** (6111184001562) : sel de table Star en flacon (Maroc) ; au Nord le sel se vend en sachet
- **Soumbala (daddawa)** (3123456789217) : pot de soumbala en poudre (France) ; au marché il se vend en boules
- **Poivre** (3166296203116) : flacon Ducros (France) ; au Nord le poivre se vend en vrac ou en sachet
- **Bissap** (6176000113102) : boîte de bissap séché (Cameroun) ; le jus en sachet n'a pas de photo

## Sans photo — à photographier en boutique


### Cherchés sur OFF, aucune photo convenable (58)

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
- Planet — Sucreries, eaux — SUD
- Beaufort Light — Bières — SUD
- Isenbeck — Bières — SUD
- Booster — Bières — NORD/SUD
- Harp — Bières — SUD
- Vin Baron de Valls — Vins, alcools — SUD
- Whisky Lion d'Or — Vins, alcools — SUD
- King Arthur — Vins, alcools — SUD
- Savon Lux — Hygiène du corps — NORD/SUD
- Savon Dettol — Hygiène du corps — NORD/SUD
- Dentifrice Close-Up — Hygiène du corps — NORD/SUD
- Caro White — Hygiène du corps — SUD
- Lames Gillette — Hygiène du corps — SUD
- Savon Azur — Entretien de la maison — NORD/SUD
- Savon Sanet — Entretien de la maison — NORD/SUD
- Détergent Omo — Entretien de la maison — NORD/SUD
- Détergent Madar — Entretien de la maison — NORD/SUD
- Spirales Rambo — Entretien de la maison — SUD
- Insecticide Raid — Entretien de la maison — SUD
- Couches Molfix — Bébé et femme — NORD/SUD
- Piles Tiger Head — Divers — NORD/SUD
- Gari — Vrac et frais — SUD
- Power Oil / King's Oil (Nigeria) — Huiles — NORD
- Riz de Yagoua (Semry) — Céréales, pâtes — NORD
- Farine de maïs — Céréales, pâtes — NORD
- Couscous — Céréales, pâtes — NORD
- Spaghetti Dangote — Céréales, pâtes — NORD
- Semoule Golden Penny — Céréales, pâtes — NORD
- Maggi — Assaisonnements — NORD
- Maggi Star — Assaisonnements — NORD
- Piment sec — Assaisonnements — NORD
- Curry — Assaisonnements — NORD
- Margarine — Conserves, tartinables — NORD
- Dattes — Biscuits, confiseries — NORD
- Bonbons à la menthe — Biscuits, confiseries — NORD
- Bigi — Boissons sans alcool — NORD
- Insecticide Rambo — Maison — NORD
- Niébé — Vrac et frais — NORD
- Gombo sec — Vrac et frais — NORD
- Sésame — Vrac et frais — NORD

### Recherche incomplète (503 répétés) (1)

- Biscuits Cabin (Nigeria) — Biscuits, confiseries — NORD

### Pas encore cherchés (0)


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

## Pour la session qui importera dans l'app

- Rien de ce dossier n'est encore dans l'app : `catalogue-off.json` et `photos/` sont prêts, la base (`base`) est vide tant que les photos ne sont pas sur le stockage.
- La licence CC BY-SA 3.0 oblige à créditer Open Food Facts (une ligne « Photos de produits : Open Food Facts, licence CC BY-SA 3.0 » suffit) : le crédit a été retiré de l'app avec le revert de 94ec244, à remettre avec l'import.
- Demande du patron le 16/11/2026, à faire dans l'app (pas dans cette session) : « l'objectif de la journée, il faut l'effacer ». Ça touche la barre « Objectif » en haut de la caisse (`#obj-bar`, `updateObjBar`), la ligne 🎯 « Objectif journalier » de Réglages (`ouvrirObj`, feuille `ov-obj`), et la notification « 🎯 Objectif atteint ! » (`DB.objectif`). Garder `DB.objectif` dans les données pour ne rien casser à la synchro.
