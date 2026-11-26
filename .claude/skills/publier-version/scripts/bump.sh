#!/bin/bash
# Monte la version de MyBoutiQ — ou de MyBar avec --bar — en touchant
# TOUJOURS les deux endroits ensemble :
#   · le numéro affiché dans Réglages (APP_BUILD, ou BUILD pour MyBar) ;
#   · le cache du service worker (CACHE_NAME).
# Oublier le second, c'est publier une version que les téléphones déjà
# installés ne recevront jamais : ils continuent de servir l'ancienne coquille.
#
#   bump.sh            22.93 → 22.94   et myboutiq-v293 → myboutiq-v294
#   bump.sh 23.00      version imposée (le cache, lui, avance toujours de 1)
#   bump.sh --bar      MyBar : 1.8 → 1.9 et mybar-v8 → mybar-v9
set -euo pipefail
RACINE="$(git rev-parse --show-toplevel)"
BAR=0; IMPOSEE=""
for a in "$@"; do
  case "$a" in
    --bar) BAR=1 ;;
    [0-9]*.[0-9]*) IMPOSEE="$a" ;;
    *) echo "argument inconnu : $a" >&2; exit 2 ;;
  esac
done
if [ $BAR = 1 ]; then
  F="$RACINE/bar/index.html"; S="$RACINE/bar/sw.js"; VAR="BUILD"; PREF="mybar-v"
else
  F="$RACINE/index.html"; S="$RACINE/sw.js"; VAR="APP_BUILD"; PREF="myboutiq-v"
fi
ANC=$(grep -oE "var $VAR='[0-9]+\.[0-9]+'" "$F" | head -1 | grep -oE "[0-9]+\.[0-9]+" || true)
[ -n "$ANC" ] || { echo "var $VAR='…' introuvable dans $F" >&2; exit 1; }
# Deux sessions sur le même dépôt (26/11 : deux « 24.18 » publiées le même
# jour) : on part du plus grand des deux numéros, le sien et celui de main.
# Sans réseau, on garde le sien et on le dit.
BASE="$ANC"; CBASE=""
REL="${F#"$RACINE"/}"; RELS="${S#"$RACINE"/}"
if git -C "$RACINE" fetch -q origin main 2>/dev/null; then
  AMAIN=$(git -C "$RACINE" show "origin/main:$REL" 2>/dev/null | grep -oE "var $VAR='[0-9]+\.[0-9]+'" | head -1 | grep -oE "[0-9]+\.[0-9]+" || true)
  CBASE=$(git -C "$RACINE" show "origin/main:$RELS" 2>/dev/null | grep -oE "CACHE_NAME='$PREF[0-9]+'" | head -1 | grep -oE "[0-9]+'" | tr -d "'" || true)
  num(){ local M=${1%%.*} m=${1#*.}; echo $((10#$M * 1000 + 10#$m)); }
  if [ -n "$AMAIN" ] && [ "$(num "$AMAIN")" -gt "$(num "$ANC")" ]; then
    echo "main est déjà en $AMAIN (ici : $ANC) : on part de main." >&2; BASE="$AMAIN"
  fi
else
  echo "main injoignable : on part du numéro local ($ANC) — vérifie avant d'envoyer." >&2
fi
if [ -n "$IMPOSEE" ]; then
  NOUV="$IMPOSEE"
else
  MAJ=${BASE%%.*}; MIN=${BASE#*.}; L=${#MIN}
  N=$((10#$MIN + 1))
  if [ ${#N} -gt "$L" ] && [ "$L" -ge 2 ]; then
    echo "$ANC → ? Le numéro déborde : donne la version voulue (bump.sh $((MAJ+1)).00)." >&2; exit 1
  fi
  NOUV="$MAJ.$(printf "%0${L}d" "$N")"
fi
CANC=$(grep -oE "CACHE_NAME='$PREF[0-9]+'" "$S" | head -1 | grep -oE "[0-9]+'" | tr -d "'" || true)
[ -n "$CANC" ] || { echo "CACHE_NAME='$PREF…' introuvable dans $S" >&2; exit 1; }
CMAX=$CANC; if [ -n "$CBASE" ] && [ "$CBASE" -gt "$CANC" ]; then CMAX=$CBASE; fi
CNOUV=$((CMAX + 1))
sed -i "s/var $VAR='$ANC'/var $VAR='$NOUV'/" "$F"
sed -i "s/CACHE_NAME='$PREF$CANC'/CACHE_NAME='$PREF$CNOUV'/" "$S"
grep -q "var $VAR='$NOUV'" "$F" && grep -q "CACHE_NAME='$PREF$CNOUV'" "$S" \
  || { echo "le remplacement a échoué : vérifie $F et $S" >&2; exit 1; }
echo "$VAR $ANC → $NOUV · CACHE_NAME $PREF$CANC → $PREF$CNOUV"
