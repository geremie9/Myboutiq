---
name: publier-version
description: Publie une nouvelle version de MyBoutiQ (ou de MyBar) en production sur myboutiq.online — numéro de version et cache du service worker montés ensemble, banc complet deux fois, message de commit à la manière du projet, fusion de main, envoi sur main et sur la branche de travail, puis vérification du déploiement Vercel. Utilise-la dès qu'un changement de index.html, sw.js ou bar/ est prêt à partir, et chaque fois que le patron dit « publie », « mets en ligne », « envoie », « déploie », « sors la version », « release », « push en prod », même sans parler de version. Pour un changement qui ne touche que les bancs, la doc ou la CI, elle dit aussi quoi NE PAS faire (pas de numéro de version).
---

# Publier une version de MyBoutiQ

Une version, c'est ce que des commerçants vont recevoir sur le téléphone avec
lequel ils encaissent. Le rituel existe parce que chacune de ses étapes a déjà
manqué une fois : un cache oublié (les téléphones gardaient l'ancienne app), un
banc lancé une seule fois (un test instable passé inaperçu), une branche
poussée sans `main` (rien en ligne).

## 0. Est-ce une version ?

- **Oui** si `index.html`, `sw.js` ou `bar/` changent : tout ce qui arrive sur
  le téléphone.
- **Non** si seuls `tests/`, `CLAUDE.md`, `.claude/`, `.github/`, `base-de-donnees/`,
  `supabase/` ou la doc changent. Commit et envoi normaux (étapes 3 à 5), sans
  toucher au numéro : le monter ferait croire aux commerçants qu'il y a du neuf.

## 1. Monter la version — les deux endroits ensemble

```bash
bash .claude/skills/publier-version/scripts/bump.sh          # 22.93 → 22.94, myboutiq-v293 → v294
bash .claude/skills/publier-version/scripts/bump.sh --bar    # MyBar : BUILD et mybar-vN
bash .claude/skills/publier-version/scripts/bump.sh 23.00    # version imposée (après 22.99)
```

Le script change `APP_BUILD` (le numéro dans Réglages) **et** `CACHE_NAME` dans
`sw.js`. Sans le second, le service worker installé continue de servir
l'ancienne coquille et les commerçants ne voient jamais le bandeau « Recharger ».
Une version par envoi : si une version déjà poussée doit être corrigée, c'est la
suivante, on ne réutilise pas un numéro.

## 2. Le banc, deux fois

```bash
node tests/myboutiq/run.mjs     # ~2 min 30 — deux fois de suite, les deux doivent être propres
cd tests/mybar && node run.js   # en plus, si bar/ a changé
```

Deux passages, parce qu'un test qui passe une fois sur deux est un vrai défaut
(ordre, horloge, course) et pas du bruit. Un ❌ ou un 💥 : on corrige, on ne
publie pas. Si la correction ajoute un comportement, elle a son banc
(`tests/myboutiq/tNNN-….test.mjs`, voir CLAUDE.md) — et on vérifie qu'il
échoue sans la correction.

La CI GitHub ne tourne pas sur ce compte (les jobs meurent en 3 s, sans
machine) : n'attends pas son verdict, le banc local fait foi.

## 3. Le message de commit, à la manière du projet

En français, pour le patron qui le relira. Le titre dit ce qui change **pour
le commerçant**, pas dans le code. Puis l'histoire : ses mots s'il a signalé le
problème, ce qui se passait, mesuré. Puis les changements en puces, ce qui a
été trouvé en route, et le banc.

```
22.94 — <ce qui change pour le commerçant, en une ligne>

« <la remarque du patron, mot pour mot, s'il y en a une> »

<Ce qui se passait, concrètement : qui voyait quoi, combien, mesuré au banc.>

- <changement 1>
- <changement 2>

Trouvé en route, corrigé :
- <défaut voisin découvert et réparé>

Banc : t209 (24). 18 bancs, 312 vérifications.

<les deux lignes d'attribution demandées par le rappel système de la session>
```

Exemple réel de titre : `22.93 — le remboursement d'un crédit entre dans le
tiroir, et le comptable lit juste`. Jamais d'identifiant de modèle dans le
message.

```bash
git add <les fichiers, nommés un par un> && git commit -F <fichier du message>
```

Pas de `git add -A` : `.gitignore` protège la clé Android, mais un fichier
inattendu (scratch, sortie de test) n'a rien à faire dans l'historique.

## 4. Fusionner main, puis envoyer aux deux endroits

```bash
git fetch origin main && git merge origin/main     # fusion, jamais rebase ni force
# si la fusion a apporté du code : relancer le banc
git push -u origin HEAD:main
git push -u origin HEAD:<branche de travail de la session>
```

`main` est ce que Vercel met en ligne ; la branche de travail est celle que la
session doit garder à jour. Échec réseau : réessayer jusqu'à 4 fois (2 s, 4 s,
8 s, 16 s). Un refus (non fast-forward) : refaire le fetch/merge, jamais `--force`.

## 5. Vérifier que c'est en ligne

Le conteneur de travail ne peut pas joindre myboutiq.online directement (le
proxy refuse) : passe par les outils Vercel.

1. `list_deployments` avec `projectId: "myboutiq-paqs"`, `target: "production"` :
   le plus récent doit porter `githubCommitSha` = `git rev-parse HEAD` et
   l'état `READY` (environ une minute ; `BUILDING`/`QUEUED` = patienter).
2. `web_fetch_vercel_url` sur `https://myboutiq.online/sw.js` : la première
   ligne doit montrer le nouveau `CACHE_NAME`.
3. Si `.vercelignore` a changé : vérifier qu'un fichier exclu répond 404
   (`/base-de-donnees/…`) **et** que `/.well-known/assetlinks.json` répond 200
   — sans lui, l'app Android perd son lien avec le site.

Le projet Vercel `myboutiq` (sans `-paqs`) échoue à chaque envoi : c'est un
doublon sans effet sur le site, ne t'en occupe pas.

## 6. Le dire au patron

Court, en français, sans jargon. Il travaille par commandes brèves et n'aime
pas les longues lectures :

- la version et ce qui change pour ses commerçants (une phrase par point) ;
- le banc : « N bancs, M vérifications, deux fois sans erreur » ;
- « en ligne » (déploiement vérifié) — les téléphones l'auront au prochain
  « Recharger ».
- ce qui a été trouvé et pas corrigé, s'il y en a, avec une recommandation.
