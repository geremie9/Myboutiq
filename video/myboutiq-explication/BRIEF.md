---
workflow: general-video
flow: automation
storyboard: yes
message: "Avec MyBoutiQ, ton téléphone tient ta caisse, ton stock et tes crédits — tu sais enfin ce que ta boutique gagne, même sans réseau."
destination: whatsapp-status-reels-tiktok
aspect: 1080x1920
language: fr
audience: "petits commerçants (boutiques, alimentations, grossistes) au Cameroun et en Afrique francophone"
length: 4-5min
angle: problem-solution, démonstration du début à la fin
voice: ff_siwis
---

## Intent

Demande du patron : « Je veux une vidéo longue qui explique du début jusqu'à la
fin cet outil et convaincante dans la vidéo les boutiquiers. » Vidéo de
présentation complète de MyBoutiQ (myboutiq.online) : créer sa boutique,
ajouter ses articles, vendre à la caisse, gros et détail, crédit client,
dépenses, clôture du soir, rapports, stock, vendeurs, hors ligne, écoute
vocale. Ton direct et chaleureux, en « tu », comme l'app. Elle doit
CONVAINCRE, pas seulement expliquer : chaque partie part d'une douleur du
boutiquier et finit sur ce qu'il y gagne.

## Assets

- ../myboutiq-pub/frame.md — identité visuelle de la pub 30 s (dégradé violet de l'app, orange, polices Outfit/Nunito) : base du design.
- ../myboutiq-pub/assets/fonts — polices de l'app.
- ../myboutiq-pub/assets/img/logo.png — icône de l'app.
- Captures réelles de l'app (version 23.24) à produire au banc Playwright du dépôt.

## Customizations

- Voix off française de synthèse (Kokoro, voix « Siwis ») — remplaçable plus tard par la voix du patron sur le même texte.
- Sous-titres grands à l'écran (beaucoup regardent sans le son).
- Musique de fond douce sous la voix (composée localement, comme pour la pub).

## Notes

- Aucune promesse inventée : seulement ce que l'app fait vraiment (vérifiable au banc).
- « Gratuit » seulement dans les termes du site (« Créer ma boutique — c'est gratuit »).
- Pas de logo Play Store tant que la fiche n'est pas confirmée publique.
- Rien d'important dans les 10 % du haut ni les 15 % du bas (interface WhatsApp/Reels).
- Plan et texte de la voix off validés par le patron avant la fabrication.

## Suite (16/10/2026)

- v1 livrée : voix Kokoro `ff_siwis`, 4 min 08 (renders/myboutiq-explication.mp4, non versionné).
- Retour du patron : « La voix est générique, je veux quelque chose de percutant, la voix d'homme et femme. »
- Texte en dialogue VALIDÉ (« Go ») : SCRIPT-dialogue.md — H = le boutiquier, F = MyBoutiQ.
- Voix choisie : HeyGen (option 2). Bloqué dans la session du 16/10 : api.heygen.com refusé par la
  politique réseau, pas de HEYGEN_API_KEY. Le patron doit autoriser api.heygen.com, app.heygen.com,
  upload.heygen.com et poser la clé dans HEYGEN_API_KEY, puis ouvrir une nouvelle session.
- Prochaine étape : essais de voix HeyGen (homme + femme FR) → choix → voix.py en deux voix → gen.mjs → rendu.
