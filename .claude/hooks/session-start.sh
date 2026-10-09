#!/bin/bash
# Au démarrage d'une session Claude Code dans le cloud : le banc de
# MyBoutiQ (tests/myboutiq) doit pouvoir tourner tout de suite.
#   node tests/myboutiq/run.mjs          → tous les bancs
#   node tests/myboutiq/run.mjs t207     → un seul
# Le 9 octobre, le banc vivait dans un dossier temporaire et le recyclage du
# conteneur l'a effacé. Il est dans le dépôt maintenant ; ce script s'assure
# seulement que Playwright et Chromium sont trouvables.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

RACINE="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
BANC="$RACINE/tests/myboutiq"

# 1) Playwright : celui de l'image s'il existe, sinon une installation locale.
PW=""
for d in /opt/node22/lib/node_modules/playwright "$(npm root -g 2>/dev/null)/playwright"; do
  if [ -n "$d" ] && [ -f "$d/package.json" ]; then PW="$d"; break; fi
done
if [ -z "$PW" ] && [ ! -d "$BANC/node_modules/playwright" ]; then
  echo "Playwright absent : installation dans tests/myboutiq…"
  (cd "$BANC" && npm install --no-audit --no-fund --no-update-notifier --loglevel=error) || echo "⚠️ npm install a échoué : le banc de syntaxe tourne quand même."
fi

# 2) Le chemin pour toute la session (lib.mjs le lit si node_modules manque).
if [ -n "$PW" ] && [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  if ! grep -qs "PLAYWRIGHT_PATH=" "$CLAUDE_ENV_FILE"; then
    echo "export PLAYWRIGHT_PATH=\"$PW\"" >> "$CLAUDE_ENV_FILE"
  fi
fi

# 3) Chromium : préinstallé dans /opt/pw-browsers sur ces conteneurs.
if ! ls -d "${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"/chromium-* >/dev/null 2>&1; then
  echo "⚠️ Chromium introuvable : seuls les bancs sans navigateur (syntaxe, chiffrement) tourneront."
fi

echo "Banc MyBoutiQ prêt : node tests/myboutiq/run.mjs"
