# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

MyBoutiQ is an offline-first PWA used by small shopkeepers in Cameroon and French-speaking Africa. It handles the till, stock, customer credit and daily reports. It runs at https://myboutiq.online and is also shipped as an Android TWA (`online.myboutiq.app`). Everything is static: there is no build step, no bundler and no root `package.json`.

- `index.html` (~2 MB, ~30k lines) **is** the app. It also holds the public showcase site ("vitrine"), onboarding and admin. `sw.js` is its service worker.
- `bar/` is MyBar, a separate single-file app for bars. It has its own `sw.js` (`CACHE_NAME='mybar-vN'`), its own `var BUILD`, its tests in `tests/mybar/`, and `bar/README.md`.
- `join.html` is the seller invitation page (`/join/CODE?n=Prénom`). `conseils/` holds the SEO guide pages, listed in `sitemap.xml`. Routing lives in `vercel.json` (rewrites `/join/*`, `/conseils/:slug`).
- `supabase/functions/notifier/` is the Web Push edge function (Deno). `base-de-donnees/` holds SQL migrations, applied by hand to the production database.
- `play/`, `twa-manifest.json` and `.well-known/assetlinks.json` cover Android and Play Store. `.vercelignore` keeps `tests/`, `base-de-donnees/`, `supabase/`, `.claude/`, `.github/` and `play/` off the public site. Never add `.well-known/` to it: the Android app link depends on it.

## Commands

The test bench is Playwright and needs Node ≥ 22. It runs the real app in Chromium against a local server that copies the `vercel.json` routing.

```bash
node tests/myboutiq/run.mjs                           # every bench (~2.5 min); one ✅/❌ line per check, exit 1 on any failure
node tests/myboutiq/run.mjs t208                      # only the files whose name contains "t208"
node tests/myboutiq/t208-remboursement.test.mjs       # one file directly, full output
node tests/myboutiq/run.mjs syntaxe                   # the "lint": all inline <script> blocks, sw.js, webpush.js, JSON files, the hook
cd tests/mybar && node run.js                         # MyBar bench (CommonJS)
```

- Playwright is resolved in this order: `tests/myboutiq/node_modules`, then `$PLAYWRIGHT_PATH`, then the global `/opt/node22/lib/node_modules/playwright`. Chromium falls back to `/opt/pw-browsers`. The SessionStart hook `.claude/hooks/session-start.sh` sets this up in cloud sessions.
- GitHub Actions (`.github/workflows/myboutiq-ci.yml`: syntax job + `banc` job). Since at least September 2026, jobs on this account never start: they fail in about 3 s with no runner and no logs. This is an account or billing problem, not the code. Run the bench locally before pushing.

## Writing bench tests (`tests/myboutiq/`)

- Tests call the **real** app functions in a real page. Never build sales by hand in `DB`, otherwise the bench checks itself instead of the till. The exception is simulating legacy data, and the test must say so. `caisse.mjs` provides:
  - `nouvelleBoutique(overrides)`: the "Ets Marie" fixture shop, PIN `123456`, items 1–7 including a carton item (id 6) and an item with no purchase price (id 7).
  - `ouvrirCaisse(browser, port, db, {vendeur})`: opens the app offline with that DB.
  - `vendre(p, {lignes, lots, mode, client, avance, split, remise, consigne, recu})`: goes through `addPanier → procederPmt → selPmntVente → encaisser`.
  - `stock`, `nombre`, `ligneRapport`.
- Each check is `t(condition, label)` and `fin()` prints the total. `run.mjs` counts the ✅/❌ lines and treats a non-zero exit without ❌ as a crash.
- The browser is launched with `--host-resolver-rules` so that no domain resolves, and pages also abort every request that is not to 127.0.0.1. The bench can never reach the production Supabase project.
- Amounts in the DOM contain narrow no-break spaces. Parse them with `nombre()`, and use `/regex/i` on labels because CSS uppercases some text.
- To prove a test catches the bug: put the old code back, see ❌, restore it, and check `git diff`.

## Architecture of `index.html`

- Several inline `<script>` blocks. The main app is ~lines 5450–28050 and a second large block follows it. Everything is a global `function` or `var` (ES5 style, no modules), so it runs on old Android WebViews.
- **Late redefinitions:** about 17 functions are defined twice: `function x(){…}` early in the file and `x=function(){…}` much later, for example `save`, `encaisser`, `enregPmt`, `ouvrirDetCli`, `confirmerAnnulVente`, `renderClients`, `saveCli`, `viderPanier`, `navTo`, `loadDB`, `subscribeRealtime` and `calcTotal`. **The later assignment is the one that runs.** List them with `grep -nE "^[A-Za-z_$][A-Za-z0-9_$]*=function" index.html` before editing any of these functions.
- **State:** one global `DB` object (the shop), stored as JSON in `localStorage['myboutiq_v6']`.
  - `save()` runs `DB=migrateDBData(DB)` then `persistDB()`. `persistDB()` writes to localStorage (on `QuotaExceededError` it calls `_telephonePlein()`) and then schedules `syncToSupa()` after 800 ms. Sales use `sauverEtEnvoyerVite()` and go out at once.
  - `migrateDBData(d)` runs on load, after every merge and on every save. It must stay idempotent, and data repairs belong in it.
  - Stock is never stored as the truth: `recomputeStock()` computes `stk0` + appros − sales, using `qBase` for cartons and variants. To change stock, record an event (sale or appro); never set `p.stk`.
  - Ids come from `genVenteId()` (`deviceId_timestamp_rand`). `_epochEvt(o)` reads the time back out of the id for archive and reset cutoffs.
- **Sync** (Supabase project `bbncilovxzkcvlxvoqtg`, table `boutiques`, RPCs such as `boutique_lire`): `_applyRemoteDB(data)` runs `DB=migrateDBData(mergeDB(data, DB))`. What `mergeDB(base, other)` does:
  - It refuses to merge two different shops (`_memeBoutique`).
  - Sales, appros and `encaissements` are unioned by id. `annulee` and `cloturee` are sticky, and events older than `arch.upTo` are dropped.
  - Expenses are unioned by id.
  - Customers merge as a whole object (the locally modified copy wins). Afterwards `_reconcilierEncaissements` puts back any repayment missing from a customer's history.
  - **Any new collection needs a rule here.** Without one, another phone's sync will drop it or bring it back.
- **The day's cash:**
  - `getCaisseSales()` returns today's sales that are not `cloturee`.
  - `caisseAttendue()` = opening cash + cash sales (including credit advances) + cash credit repayments − expenses paid from the till.
  - The Rapports "Espèces en caisse (à compter)" line and the evening closing (`ouvrirClot`, `calcEcart`, `validerClot`) must always show the same figure.
  - `validerClot()` marks today's sales, expenses and encaissements `cloturee`; it never deletes them.
- **Payments:** a sale's `paiement.mode` is one of `especes | orange | mtn | moov | credit | mixte`. Debts live in `client.credit` and `client.hist`. Since 22.93 every repayment is also a record in `DB.encaissements` with its mode, which is what the till and the merge rely on.
- **Roles:** `role` is `'patron'` or `'vendeur'` (with `nomVendeur`). Permissions go through `hasPerm(k)`; sellers get `{vente:true}` by default. The demo shop (`entrerDemo`/`quitterDemo`, `estDemo()`) must never sync.
- **Site or till, same file:**
  - The site: `/` reached from a search engine or a site page; `?site` always forces it.
  - The till: `/index.html` (the installed icon), a typed address, or "Ouvrir ma caisse".
  - `sessionStorage.mb_site` keeps the choice across reloads.
- **i18n:** `lang` is `'fr'` or `'en'`. Use `t(key)` with the `TR` table, or inline `lang==='fr'?…:…`. French UI text uses "tu". Format money with `fmt(n)`.
- **Service worker:** the app shell is served from cache first and refreshed in the background. A new version waits for the user to tap the "Recharger" banner (no automatic `skipWaiting`). The worker also shows push notifications and reports clicks (`notif_ouvert`).
- **Push:** the `notifier` edge function runs with `verify_jwt` off, so each action checks its caller itself:
  - `init`/`tournee`: the `x-tournee` header secret.
  - `essai`: the user's JWT.
  - `diffuser`: an admin listed in `app_admins`.

  A pg_cron job runs `tournee` daily at 08:00 UTC (9:00 in Douala). The `notif_*` tables are locked by RLS and reached only through RPCs. The bench tests `webpush.js` directly and runs `index.ts` against a fake Supabase (`tests/myboutiq/notifier/`).

## Releasing a version

1. For any change to the app, bump `var APP_BUILD='22.NN'` in `index.html` **and** `CACHE_NAME='myboutiq-v2NN'` in `sw.js`. Without the cache bump, installed phones keep the old version. Changes to tests, docs or CI need no bump.
2. Run the full bench twice. Both runs must be clean.
3. Write the commit message in French. Title: `22.NN — <what changes for the shopkeeper>`. Then the story (the owner's words, the bug as measured), bullet points, a "Trouvé en route, corrigé" section, and `Banc : tNNN (n)`.
4. Run `git fetch origin main && git merge origin/main`, then push the same commit to `main` and to the working branch. Vercel project `myboutiq-paqs` deploys `main` to myboutiq.online in about a minute. The other Vercel project, `myboutiq`, fails on every deploy; it is a harmless duplicate.

## Conventions

- Comments are in French and explain **why**, usually with the incident behind the code ("⚠️ … mesuré au banc : …"). Keep this style, and do not delete these stories when refactoring.
- The app has no dependencies. supabase-js is loaded from jsDelivr and cached by the service worker, and the app must keep working when it is missing (offline).

## Owner's hard rules

- The Android signing keystore lives only on the owner's Windows PC. Never create, request, handle or invent a keystore or a certificate fingerprint. `.gitignore` blocks key files.
- Every Supabase write (SQL, migrations, function deploys) goes to **production** (`bbncilovxzkcvlxvoqtg`); there is no staging. After creating SQL functions, run `revoke execute … from anon, authenticated` explicitly, because Supabase grants it by default.
- The `photos_avis` table is admin-read-only because it contains every shop's code.
- The owner's email is for git attribution only. Never send it to a service: the VAPID `sub` is `https://myboutiq.online`.
