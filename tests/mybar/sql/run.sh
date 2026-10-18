#!/usr/bin/env bash
# Rejoue le SQL de la sauvegarde en ligne sur un PostgreSQL JETABLE.
#   PGHOST=… PGPORT=… PGUSER=postgres ./run.sh
# Ne se connecte jamais à un projet Supabase : il crée puis supprime sa propre base.
set -euo pipefail
cd "$(dirname "$0")"
BASE=mybar_test_$$
id()      { printf '%s' "$1" | head -c 43; }           # 43 caractères, comme un HKDF de 256 bits en base64url
ID1=$(id "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
ID2=$(id "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")
ID3=$(id "cccccccccccccccccccccccccccccccccccccccccccccc")
INCONNU=$(id "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz")
export PGOPTIONS='--client-min-messages=notice'
psql -qAt -d postgres -c "drop database if exists $BASE" -c "create database $BASE" >/dev/null
trap 'psql -qAt -d postgres -c "drop database if exists $BASE with (force)" >/dev/null 2>&1' EXIT
P="psql -q -d $BASE -v ON_ERROR_STOP=1 -v id1=$ID1 -v id2=$ID2 -v id3=$ID3 -v inconnu=$INCONNU"
$P -f 00-supabase-simule.sql
$P -f "${MIGRATION:-../../../base-de-donnees/mybar/2026-10-18-sauvegarde-en-ligne.sql}"
$P -f 10-sauvegarde.test.sql 2>&1 | grep -E '^(NOTICE|psql|ERROR)' | sed 's/^NOTICE:  //'

# ── 5. Deux téléphones créent le même bar au même instant ──
echo "--- course : deux créations simultanées ---"
( $P -c "begin; set local role anon; select public.bar_ecrire('$ID3',0,repeat('A',100),'A','1');" -c "select pg_sleep(2);" -c "commit;" >/dev/null ) &
sleep 0.8
B=$($P -At -c "set role anon; select public.bar_ecrire('$ID3',0,repeat('B',100),'B','1');" | tail -1)
wait
L=$($P -At -c "set role anon; select public.bar_lire('$ID3')" | tail -1)
echo "B a reçu : $B"
echo "$B" | grep -q '"erreur": "conflit"' && echo "$L" | grep -q '"appareil": "A"' \
  && echo "OK  le second créateur perd proprement (conflit), le premier est intact" \
  || { echo "KO  course : B=$B / lecture=$L"; exit 1; }
echo "═══ SQL : tout est passé"
