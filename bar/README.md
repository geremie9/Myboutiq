# MyBar — gestion de bar, buvette, snack et cave

Le même métier que MyBoutiQ — un commerçant, un téléphone, pas de réseau —
mais pour un bar. Et un bar ne se gère pas comme une boutique.

Ouvrir : **`/bar`** (ou `bar/index.html`). Un seul fichier, aucune
installation, aucun serveur. Tout vit dans le téléphone.

## Ce qui change par rapport à MyBoutiQ

| Boutique | Bar |
|---|---|
| Un panier, payé tout de suite | Une **addition ouverte** par table, payée deux heures plus tard |
| Un stock | **Trois** : casiers fermés, bouteilles entamées, et le **frigo** — seul stock que le client accepte |
| L'emballage est perdu | La **vidange consignée** vaut de l'argent chez le dépositaire |
| On achète et on vend à l'unité | On achète en **casiers**, on vend à la **bouteille** |
| Un vendeur encaisse | Un **serveur** tient ses tables et rend sa caisse à la clôture |
| La journée finit à minuit | Le **service** finit à 2 h du matin, et appartient au soir de la veille |

## Les écrans

- **Service** — le plan de salle. Tables libres / occupées, montant assis
  dehors, durée d'occupation, serveur en charge. Zones (Salle, Terrasse,
  Comptoir, À emporter) et alertes en tête d'écran.
- **Addition** — les lignes d'une table : quantités, prix négocié, lignes
  **offertes** (la tournée du patron, qui sort du stock mais pas de la
  recette), note de table, remise. Transfert, fusion de deux tables,
  division indicative, envoi de l'addition par WhatsApp.
- **La carte** — grille tactile par famille (bières, sucreries, eaux,
  énergisants, vins & spiritueux, cocktails, cuisine, divers). Une tape =
  une bouteille. Le badge dit ce qui reste, et ce qui n'est **pas au frais**.
- **Stock** — valeur du stock, ce qu'il vaut à la vente, consignes
  immobilisées. Bon d'approvisionnement (casiers + vidanges rendues,
  net à payer au dépôt), mise au frais, casse/perte, inventaire.
- **Rapports** — recette, bénéfice, additions, modes de paiement, ce qui
  part le plus, classement des serveurs, **heures qui rapportent**,
  où part l'argent.
- **Clôture** — espèces attendues vs espèces comptées, **écart de caisse**,
  ardoises, pourboires, fond de caisse du lendemain, vidanges à rendre.
- **Équipe & clients** — serveurs avec leur propre code (ils ne voient ni
  prix d'achat, ni marge, ni clôture), ardoises clients et relance WhatsApp.
- **Vente au comptoir** — la carte, sans table à ouvrir : on tape, on
  encaisse, l'écran est déjà prêt pour le client suivant. C'est l'écran
  d'accueil d'une cave, d'un kiosque, ou du téléphone posé au comptoir
  (voir plus bas).

## Un bar n'est pas l'autre — forme et poste

> « Dans certains petits bars, une personne au comptoir, une personne au
> stock, ou même la même personne gère. Il y a autant de réalités. »

L'application partait d'UNE forme : douze tables, des serveurs, des
vidanges, une cuisine. Une cave à boissons devait ouvrir une table avant
de vendre deux bières ; une patronne seule avait un écran « Équipe » pour
elle toute seule ; un bar qui ne vend qu'en canettes comptait des
consignes qui n'existent pas.

Deux choses varient, et **elles ne se rangent pas au même endroit** :

| | Où ça vit | Qui ça concerne |
|---|---|---|
| **La forme du bar** — tables, vidanges, cuisine, plusieurs personnes | `cfg.forme`, dans la base | Tout le bar. Partagé, sauvegardé. |
| **Le poste du téléphone** — tout / comptoir / stock | `localStorage`, clé `mybar_poste` | **Ce téléphone seul.** Jamais dans la sauvegarde. |

C'est cette séparation qui permet au téléphone du comptoir de s'ouvrir sur
la carte pendant que celui de la cave s'ouvre sur le stock — le même bar,
les mêmes chiffres, deux métiers ce soir-là. Mettre le poste dans la base
l'aurait imposé à tout le monde à la première synchronisation ; le
restaurer depuis une sauvegarde aurait changé le métier du téléphone qui
restaure.

**Les onglets du bas ne sont plus écrits en dur.** `onglets()` les
calcule, `majNavs()` les pose sur toutes les barres à la fois :

| Situation | Onglets |
|---|---|
| Bar à tables, poste « tout le bar » | Service · Stock · Rapports · Équipe |
| Bar à tables, poste « comptoir » | Comptoir · Service · Stock · Équipe |
| Bar à tables, poste « stock » | Stock · Service · Rapports · Équipe |
| Sans tables (cave, kiosque) | Comptoir · Stock · Rapports · Équipe |
| Tenu seul | …et *Équipe* devient **Clients** |

**Le comptoir est une table, pas un deuxième circuit de vente.** L'écran
« Vente au comptoir » est la carte, ouverte sur une table dédiée
(`cptr:1`) qu'on vide à chaque encaissement : « ✓ Encaisser » à la place
de « ✓ Terminé », et « ➕ Vente suivante » sur le reçu. Le stock, les
marges, la part du serveur et les rapports continuent de compter
exactement comme pour une table — un circuit parallèle aurait doublé
chaque règle métier, et la deuxième copie aurait fini par mentir.

Une cave à boissons est créée directement sans tables, et un
établissement dont la carte de départ n'a pas de cuisine est créé sans
cuisine : c'est un point de départ, pas une contrainte. Tout se change
dans **Paramètres → Comment marche ton bar** (le bar) et **Ce téléphone
sert à…** (le téléphone).

## Français et anglais

L'application se parle entièrement dans les deux langues : vitrine,
inscription, service, stock, rapports, clôture, messages d'erreur.
Le choix se fait sur la vitrine, à l'inscription, et dans les Paramètres
(le serveur y a droit aussi : c'est lui qui lit l'écran toute la soirée).

La traduction n'est pas une table de clés mais un `L('français','english')`
posé à l'endroit exact où le texte s'affiche — les deux versions se lisent
côte à côte, et une phrase corrigée en français ne peut pas laisser
derrière elle une phrase anglaise qui dit l'inverse. Les textes écrits en
dur dans le HTML portent leurs deux versions sur eux (`data-fr` /
`data-en`) ; une seule boucle les pose à chaque bascule.

**Ce qui se traduit et ce qui ne se traduit pas.** L'application se
traduit ; ce que le patron a écrit, non. Les noms de produits, de tables,
de clients et les contenances sont **figés à la création**, dans la langue
choisie ce jour-là. Les retraduire sous ses yeux parce qu'il a changé de
langue reviendrait à réécrire son ardoise.

**Les zones sont des codes, pas des mots.** `salle`, `terrasse`,
`comptoir`, `emporter` — parce que la règle des vidanges dépend de la
zone (une bouteille emportée ne laisse pas de vide). Écrite « Emporter »
en français et « Takeaway » en anglais, la comparaison aurait été fausse
pour un bar sur deux, et les consignes se seraient accumulées toutes
seules. Une zone inventée par le patron (« VIP », « Jardin ») reste une
chaîne libre, affichée telle qu'il l'a écrite.

## Décisions qui ont coûté cher, et qu'il ne faut pas défaire

1. **On ne bloque jamais une vente pour un stock non saisi.** Un bar qui
   installe l'app à 20 h a un stock à zéro et la salle pleine. La
   bouteille part, le compte passe en découvert, et l'app le dit. (La
   première version refusait de servir : 34 produits sur 42 injouables.)
2. **L'approvisionnement n'est pas une charge du soir.** C'est du stock.
   Le déduire du bénéfice en plus du coût des boissons bues comptait la
   marchandise deux fois : une soirée à 1 000 F de recette affichait
   −16 450 F. La caisse, elle, le déduit — parce que l'argent est parti.
3. **Le service déborde minuit.** `jourService()` rattache tout ce qui est
   encaissé avant 6 h du matin au soir de la veille.
4. **Le frigo n'est pas un stock de plus.** Mettre au frais retire du
   dépôt. C'est ce qui permet de prévenir avant que le client découvre
   qu'il n'y a plus de fraîche.
5. **Une tape ne redessine pas la carte.** Seuls le compteur de la tuile
   touchée et la barre du bas changent : un serveur tape douze fois de
   suite pour une tournée.
6. **Un halo décoratif ne doit jamais manger les touches.** Le cercle doré
   du coin haut-droit est un `::before`, et un pseudo-élément reçoit les
   clics comme n'importe quel élément : le bouton « 🇬🇧 English » de la
   vitrine tombait entièrement dedans et ne répondait pas, sans le moindre
   message. `pointer-events:none` sur tous les halos.

7. **On cherche sans accents.** Le champ disait « Bière, sucrerie,
   brochette… » et ne rendait rien à qui tapait « biere » : personne ne
   pose les accents sur un clavier de téléphone en plein service.
   Vérifié sur la carte de départ : « biere » rendait **0** produit,
   « energisant » **0**. `txtNorm()` met les deux côtés à plat (accents,
   œ/æ, espaces) — 12 et 3 désormais. Ce que le patron a écrit ne
   change pas ; seule la comparaison est aveugle.
8. **Un écran d'accueil doit porter les alertes.** Les alertes — rien au
   frais, un casier à recommander, une ardoise qui traîne — ne vivaient
   que sur le plan de salle. En donnant au comptoir son propre écran
   d'accueil, on lui avait retiré du même geste le seul endroit où l'app
   lui parlait : une cave ou un kiosque n'ouvre jamais le plan de salle.
   Elles s'affichent donc aussi en tête de la carte, **en mode comptoir
   seulement** — la carte ouverte depuis une table reste un outil de
   service, pas un tableau de bord.

## Les deux adresses, et ce que ça coûte

MyBar est servie à deux endroits : la racine de son sous-domaine, et le
sous-dossier `/bar` du site de MyBoutiQ. Le second cas est piégeux et a
déjà coûté un défaut visible :

1. **Le dossier de l'application est calculé à l'exécution.** À
   `myboutiq.online/bar`, l'adresse du document n'a pas de barre finale
   (le site est en `trailingSlash:false`), donc toute adresse relative se
   résout contre la RACINE du domaine. `manifest.json` devenait celui de
   MyBoutiQ, `icon-192.png` l'icône de la boutique, `sw.js` le service
   worker de la boutique — et « Installer l'application » posait
   *MyBoutiQ* sur l'écran d'accueil d'un patron de buvette. Le bloc en
   tête de `index.html` recalcule le dossier et repose les trois liens.
2. **`/bar` est une redirection vers `/bar/index.html`, pas une
   réécriture.** La portée du service worker de MyBar est `/bar/`, et
   `/bar` n'en fait pas partie : la page n'était contrôlée par personne,
   donc pas disponible hors ligne. On ne redirige **pas** vers `/bar/` —
   `trailingSlash:false` renverrait aussitôt sur `/bar`, en boucle.
3. **`/bar` prévient au lieu de rediriger.** Les données d'une
   application vivent **par adresse** : un bar saisi sur
   `myboutiq.online/bar` n'existe pas sur `bar.myboutiq.online`, ce ne
   sont pas les mêmes tiroirs. Rediriger, c'est ouvrir un bar **vide** à
   quelqu'un qui a déjà travaillé ici et lui laisser croire qu'il a tout
   perdu — alors que ses données sont toujours là, derrière une porte
   qu'on vient de fermer. Donc : sur l'ancienne adresse, la vitrine dit
   où aller, un bar déjà ouvert reçoit un bandeau « Déménager »
   (sauvegarde → nouvelle adresse → restauration), et « Installer »
   **disparaît** — poser l'application depuis là installerait la copie
   qu'on retire, et le patron se retrouverait avec deux MyBar sur son
   écran d'accueil, dont une vide, sans rien pour les distinguer.
   `ancienneAdresse()` teste l'hôte, pas le chemin : un banc en local ne
   déclenche rien.
4. **`vercel.json` n'accepte aucun commentaire.** Ni `//`, ni une clé
   `"//"` : le schéma est fermé, et une propriété inconnue fait échouer
   le déploiement *avant* le build, sans un seul log. C'est pour ça que
   ces explications sont ici et pas là-bas.

Ce qui reste vrai dans les deux cas : l'application installée démarre sur
`index.html` de son propre dossier et s'ouvre hors ligne. Seul le lien
court `/bar` ne s'ouvre pas hors ligne — une redirection a besoin du
réseau — ce qui ne concerne pas l'app posée sur l'écran d'accueil.

## Données

Tout est dans `localStorage` (clé `mybar_v1`) : rien ne part sur
Internet. Sauvegarde complète en `.json` et export des ventes en `.csv`
depuis les Paramètres. Vingt pays et monnaies ; les prix de la carte de
départ sont transposés dans la monnaie locale à la création.

## Essayer sans rien saisir

Vitrine → **« Voir une soirée d'exemple »** : une buvette de 12 tables,
14 additions étalées de 17 h à 1 h, deux tables encore occupées, des
vidanges accumulées et des dépenses de glace et de carburant.
Code patron de la démo : `1234`.

## Développement

```bash
npx -y serve -l 8777 .        # depuis la racine du dépôt
# puis http://localhost:8777/bar/index.html
```

Vérification de la syntaxe des blocs `<script>` (même contrôle que la CI
de MyBoutiQ) :

```bash
node -e "const fs=require('fs');const h=fs.readFileSync('bar/index.html','utf8');
const re=/<script>([\s\S]*?)<\/script>/g;let m,i=0;
while((m=re.exec(h))!==null){fs.writeFileSync('t'+i+'.js',m[1]);i++;}"
for f in t*.js; do node --check "$f"; done
```
