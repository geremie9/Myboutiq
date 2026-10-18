# Base de données de MyBar

⚠️ **Rien de ce dossier ne s'applique au projet Supabase de MyBoutiQ** (`bbncilovxzkcvlxvoqtg`).
C'est la production d'une autre application, sans environnement de test, et la règle du dépôt
est que chaque écriture y va en production. MyBar a son **propre projet** : si un jour ces
fichiers atterrissent ailleurs que dans lui, c'est une erreur.

## Fichiers

| Fichier | Rôle |
|---|---|
| `2026-10-18-sauvegarde-en-ligne.sql` | Table `bar_sauvegardes` + fonctions `bar_ecrire`, `bar_lire`, `bar_effacer`. |

## Ce que fait le serveur

Il range un texte qu'il ne peut pas lire (la base du bar, chiffrée sur le téléphone) sous un
**hachage** d'identifiant. Pas de compte, pas de politique RLS : la table n'est atteinte que par
trois fonctions `security definer`, appelables par `anon` (la clé publique de l'application).
Chaque écriture porte la révision attendue ; une révision périmée renvoie `conflit` sans rien écraser.

## Appliquer (sur le projet de MyBar, jamais ailleurs)

1. Créer le projet Supabase de MyBar (plan gratuit : 2 projets actifs par organisation — voir `bar/README.md`).
2. Appliquer le fichier SQL (éditeur SQL ou migration).
3. **Vérifier les droits** : le fichier fait lui-même les `revoke … from public, anon, authenticated`
   puis `grant execute … to anon` sur les trois fonctions seulement (Supabase accorde l'exécution à
   tout le monde par défaut). Contrôle : `select has_table_privilege('anon','public.bar_sauvegardes','select')`
   doit rendre `false`.
4. Mettre l'URL et la clé publique (`sb_publishable_…`) dans `SUPA_CFG` en tête du module « sauvegarde en
   ligne » de `bar/index.html`, monter la version (`bump.sh --bar`), déployer.

## Tester sans toucher à rien

```bash
# PostgreSQL local jetable (ne se connecte à aucun projet Supabase) :
PGHOST=… PGPORT=… PGUSER=postgres tests/mybar/sql/run.sh
```

`run.sh` crée sa propre base, y simule les rôles Supabase (`00-supabase-simule.sql`), applique la migration,
joue `10-sauvegarde.test.sql` puis une course entre deux sessions, et supprime la base.
Pour rejouer le banc du navigateur contre ce vrai PostgreSQL : voir `bar/README.md`, « Comment c'est vérifié ».
