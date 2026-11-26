#!/bin/bash
# À lancer JUSTE AVANT `git push origin HEAD:main`. Deux sessions travaillent
# sur ce dépôt (26/11 : deux « 24.18 » et deux « t335 » publiés le même jour,
# et la 24.09 avait repris deux noms de fonctions existants). Il refuse
# l'envoi tant que :
#   · main a avancé depuis la dernière fusion (il faut fusionner, relancer) ;
#   · l'app a changé mais sa version ne dépasse pas celle de main
#     (ou l'inverse : seulement la doc ou les bancs, et la version a bougé) ;
#   · des changements ne sont pas enregistrés ;
#   · le banc « syntaxe » échoue (noms en double, version ≠ cache, numéros
#     de bancs en double, syntaxe).
# Le banc complet deux fois reste à faire AVANT, comme toujours.
set -uo pipefail
RACINE="$(git rev-parse --show-toplevel)"; cd "$RACINE"
ok=1
non(){ echo "❌ $1"; ok=0; }
oui(){ echo "✅ $1"; }

git fetch -q origin main 2>/dev/null || { echo "❌ main injoignable : impossible de vérifier, n'envoie pas."; exit 1; }

if git merge-base --is-ancestor origin/main HEAD; then oui "main est inclus dans ta branche"
else non "main a avancé ($(git log --oneline -1 origin/main | cut -c1-70)…) : git merge origin/main, résous, relance les bancs"; fi

if [ -z "$(git status --porcelain --untracked-files=no)" ]; then oui "rien d'inenregistré"
else non "des changements ne sont pas enregistrés (git status)"; fi

ver(){ grep -oE "var APP_BUILD='[0-9]+\.[0-9]+'" | head -1 | grep -oE "[0-9]+\.[0-9]+"; }
cache(){ grep -oE "CACHE_NAME='myboutiq-v[0-9]+'" | head -1 | grep -oE "[0-9]+" ; }
num(){ local M=${1%%.*} m=${1#*.}; echo $((10#$M * 1000 + 10#$m)); }
VM=$(git show origin/main:index.html | ver); VH=$(ver < index.html)
CM=$(git show origin/main:sw.js | cache); CH=$(cache < sw.js)
if git diff --quiet origin/main HEAD -- index.html sw.js bar/; then
  if [ "$VH" = "$VM" ]; then oui "pas de changement de l'app : la version reste $VH (normal)"
  else non "l'app n'a pas changé mais la version a bougé ($VM → $VH)"; fi
else
  if [ "$(num "$VH")" -gt "$(num "$VM")" ] && [ "$CH" -gt "$CM" ]; then oui "version $VM → $VH, cache v$CM → v$CH"
  else non "l'app a changé : la version ($VH, v$CH) doit dépasser celle de main ($VM, v$CM) — bump.sh"; fi
fi

if node tests/myboutiq/syntaxe.test.mjs > /tmp/avant-envoi-syntaxe.txt 2>&1; then oui "banc syntaxe (noms en double, version et cache, numéros de bancs)"
else non "banc syntaxe : $(grep '❌' /tmp/avant-envoi-syntaxe.txt | head -3 | tr '\n' ' ')"; fi

if [ $ok = 1 ]; then echo "→ prêt : git push origin HEAD:main (puis vérifier le déploiement)"; exit 0; fi
echo "→ PAS D'ENVOI tant que ces points ne sont pas réglés."; exit 1
