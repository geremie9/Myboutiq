# MyBarQ — gestion de bar, buvette, snack et cave

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

## Données

Tout est dans `localStorage` (clé `mybarq_v1`) : rien ne part sur
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
