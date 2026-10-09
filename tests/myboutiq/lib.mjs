/* Ce que tous les bancs de MyBoutiQ partagent : le navigateur, la racine du
   dépôt, le serveur local, et la façon de compter.

   ⚠️ POURQUOI CES BANCS VIVENT ICI. Pendant des semaines ils vivaient dans le
   dossier temporaire de la session de travail : 156 fichiers, 2 647
   vérifications. Le 9 octobre 2026 la machine a été recyclée et le dossier
   vidé — tout est parti, sauf ce qu'on a pu relire dans le journal. Un banc
   qui n'est pas dans le dépôt n'existe pas.

   Playwright : en CI il est installé ici (`npm install`) ; dans le conteneur
   de travail il vit déjà dans les modules globaux, avec son Chromium. */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { demarrer } from './serveur.mjs';

export const ICI = path.dirname(fileURLToPath(import.meta.url));
export const RACINE = path.resolve(ICI, '..', '..');

function charger() {
  const req = createRequire(import.meta.url);
  const essais = ['playwright', process.env.PLAYWRIGHT_PATH, '/opt/node22/lib/node_modules/playwright'];
  try { essais.push(path.join(execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(), 'playwright')); } catch (_) {}
  for (const e of essais.filter(Boolean)) { try { return req(e); } catch (_) {} }
  throw new Error('playwright introuvable. Lance « npm install » dans tests/myboutiq, ou fixe PLAYWRIGHT_PATH.');
}
// Le Chromium déjà présent sur la machine, si celui de Playwright manque
// (version de Playwright différente de celle des navigateurs installés).
function chromeLocal() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  try {
    const racine = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
    const d = fs.readdirSync(racine).filter(x => /^chromium-\d+$/.test(x)).sort().pop();
    if (d) { const p = path.join(racine, d, 'chrome-linux', 'chrome'); if (fs.existsSync(p)) return p; }
  } catch (_) {}
  return undefined;
}
const pw = charger();
// Le banc ne sort jamais : aucun nom de domaine ne se résout, service worker
// compris (page.route() ne voit pas ses requêtes). Dans le conteneur de
// travail le proxy bloque déjà ; en CI le réseau est ouvert, et sans cette
// règle le banc lirait le Supabase de PRODUCTION.
const SANS_RESEAU = '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1';
export const chromium = {
  async launch(opts = {}) {
    opts = { ...opts, args: [...(opts.args || []), SANS_RESEAU] };
    try { return await pw.chromium.launch(opts); }
    catch (e) {
      const c = chromeLocal();
      if (!c || opts.executablePath || !/Executable doesn't exist|executable/i.test(String(e.message))) throw e;
      return pw.chromium.launch({ ...opts, executablePath: c });
    }
  },
};

// Le dépôt servi comme Vercel le sert, sur un port libre.
export async function serveur() {
  const s = await demarrer(0, RACINE);
  return { s, port: s.address().port };
}

// Le compte : chaque vérification dit ✅ ou ❌ sur sa propre ligne — c'est
// ce que `run.mjs` additionne.
export function compteur(nom) {
  let ok = 0, ko = 0;
  const t = (c, m) => { if (c) { ok++; console.log('✅', m); } else { ko++; console.log('❌', m); } };
  const fin = () => { console.log(ko ? ('ÉCHECS ' + ko) : (nom + ' : ' + ok + ' vérifications')); process.exit(ko ? 1 : 0); };
  return { t, fin, get ok() { return ok; }, get ko() { return ko; } };
}

// Rien ne sort vers Internet : seul le serveur local répond. Une page qui
// attend un CDN ou le serveur de production ne doit pas faire varier un banc.
export async function couperInternet(p, port) {
  await p.route('**', r => r.request().url().includes('127.0.0.1:' + port) ? r.continue() : r.abort());
}
