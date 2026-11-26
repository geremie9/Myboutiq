// La syntaxe d'abord : un seul caractère de travers dans un bloc <script> et
// la caisse entière ne démarre plus. Chaque page du site, le service worker
// et le code de la fonction des notifications sont relus ici.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { RACINE, compteur } from './lib.mjs';
const { t, fin } = compteur('syntaxe');

const pages = ['index.html', 'join.html', 'politique-confidentialite.html']
  .concat(fs.readdirSync(path.join(RACINE, 'conseils')).filter(f => f.endsWith('.html')).map(f => 'conseils/' + f));
for (const f of pages) {
  const h = fs.readFileSync(path.join(RACINE, f), 'utf8');
  let n = 0; const fautes = [];
  // Les blocs de données (JSON-LD) ne sont pas du JavaScript : ils doivent
  // seulement être du JSON valide, sinon Google les ignore.
  // ⚠️ `(?![^>]*src)` et pas `src=` : un commentaire HTML de index.html
  // contient « <script src … » en toutes lettres, sans « = ».
  for (const m of h.matchAll(/<script(?![^>]*src)([^>]*)>([\s\S]*?)<\/script>/g)) {
    n++;
    try {
      if (/application\/ld\+json/.test(m[1])) JSON.parse(m[2]);
      else new vm.Script(m[2], { filename: f + ' bloc ' + n });
    } catch (e) { fautes.push('bloc ' + n + ' : ' + e.message); }
  }
  t(fautes.length === 0, `${f} — ${n} bloc${n > 1 ? 's' : ''}` + (fautes.length ? ' : ' + fautes.join(' | ') : ''));
}
// Le script commun des guides (23.07) : chargé par chaque page conseils.
for (const f of ['conseils/commun/guides.js']) {
  let err = '';
  try { new vm.Script(fs.readFileSync(path.join(RACINE, f), 'utf8'), { filename: f }); } catch (e) { err = e.message; }
  t(!err, f + (err ? ' : ' + err : ''));
}
// Les fonctions serveur en TypeScript (Deno) : les types retirés, le reste
// doit se lire comme du JavaScript. Une faute de frappe ne se voyait
// qu'au déploiement — ou pire, au premier appel.
{
  const mod = await import('node:module');
  const dir = path.join(RACINE, 'supabase', 'functions');
  const ts = [];
  const parcourir = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const q = path.join(d, e.name); if (e.isDirectory()) parcourir(q); else if (e.name.endsWith('.ts')) ts.push(q); } };
  if (fs.existsSync(dir)) parcourir(dir);
  for (const f of ts) {
    let ok = true, err = '';
    try {
      const js = mod.stripTypeScriptTypes(fs.readFileSync(f, 'utf8'))
        .replace(/^\s*import[\s\S]*?from\s+['"][^'"]+['"];?/gm, '').replace(/^export\s+/gm, '');
      new Function('return async function(){' + js + '}');
    } catch (e) { ok = false; err = String(e.message).split('\n')[0]; }
    t(ok, path.relative(RACINE, f) + ' : TypeScript lisible' + (err ? ' : ' + err : ''));
  }
}
for (const f of ['sw.js', 'supabase/functions/notifier/webpush.js', 'supabase/functions/voix/fournisseurs.js']) {
  const r = spawnSync(process.execPath, ['--check', path.join(RACINE, f)], { encoding: 'utf8' });
  t(r.status === 0, f + (r.status ? ' : ' + (r.stderr || '').split('\n').slice(0, 4).join(' ') : ''));
}
// Un .claude/settings.json cassé éteindrait le hook de démarrage sans rien dire.
for (const f of ['manifest.json', 'vercel.json', 'catalogue-600.json', 'photos-catalogue.json', '.well-known/assetlinks.json', '.claude/settings.json']) {
  let ok = true, err = '';
  try { JSON.parse(fs.readFileSync(path.join(RACINE, f), 'utf8')); } catch (e) { ok = false; err = e.message; }
  t(ok, f + ' est du JSON valide' + (err ? ' : ' + err : ''));
}
// Les scripts de la session (hook de démarrage, skills du projet) : un
// script cassé ne se voit qu'au moment où on en a besoin.
{
  const scripts = [path.join(RACINE, '.claude/hooks/session-start.sh')];
  const sk = path.join(RACINE, '.claude/skills');
  if (fs.existsSync(sk)) for (const d of fs.readdirSync(sk)) {
    const sd = path.join(sk, d, 'scripts');
    if (fs.existsSync(sd)) for (const f of fs.readdirSync(sd)) if (f.endsWith('.sh')) scripts.push(path.join(sd, f));
  }
  for (const f of scripts) {
    const r = spawnSync('bash', ['-n', f], { encoding: 'utf8' });
    t(r.status === 0, path.relative(RACINE, f) + ' : syntaxe bash' + (r.status ? ' : ' + (r.stderr || '').trim() : ''));
  }
}
// ── DEUX SESSIONS SUR LE MÊME DÉPÔT (26/11) ─────────────────────────────
// Deux sessions ont publié sur main en même temps : deux « 24.18 », deux
// « t335 ». Et la 24.09 avait déjà repris deux noms existants
// (`_offreCarton`, `_dernierTouche`) : dans ce fichier sans modules, une
// seconde déclaration écrase la première EN SILENCE (vu au banc en 24.13 :
// le panier ne proposait plus le carton, l'ordre des articles s'oubliait).
{
  const h = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
  const vus = {}, doubles = [];
  const compte = n => { vus[n] = (vus[n] || 0) + 1; if (vus[n] === 2) doubles.push(n); };
  for (const m of h.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) compte(m[1]);
  // `var a={},b={},c=0;` : TOUS les noms de la ligne (c'est le second qui avait
  // été repris en 24.09). On efface ce qui est entre (), [], {} et les chaînes,
  // puis on lit les noms séparés par des virgules.
  for (const m of h.matchAll(/^var\s+([^\n]*)/gm)) {
    let x = m[1].replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, '""'), avant;
    do { avant = x; x = x.replace(/\([^()]*\)|\[[^\[\]]*\]|\{[^{}]*\}/g, '0'); } while (x !== avant);
    x = x.split(';')[0];
    for (const part of x.split(',')) { const n = (part.match(/^\s*([A-Za-z_$][\w$]*)\s*(?:=|$)/) || [])[1]; if (n) compte(n); }
  }
  // Les redéfinitions voulues s'écrivent `x=function(){…}` (voir CLAUDE.md) : elles ne comptent pas ici.
  // Connu et inoffensif : `durSel` (abonnement), déclaré deux fois avec la même valeur 'm'.
  const connus = new Set(['durSel']), nouveaux = doubles.filter(n => !connus.has(n));
  t(nouveaux.length === 0, 'index.html : aucun nom global déclaré deux fois' + (nouveaux.length ? ' : ' + nouveaux.join(', ') : ''));
  // La version et le cache vont ensemble : 24.20 ↔ myboutiq-v420. Une fusion qui garde
  // l'un d'un côté et l'autre de l'autre publierait une app que les téléphones ne recevraient pas.
  const v = (h.match(/var APP_BUILD='(\d+)\.(\d+)'/) || []), c = (fs.readFileSync(path.join(RACINE, 'sw.js'), 'utf8').match(/CACHE_NAME='myboutiq-v(\d+)'/) || []);
  const attendu = v[1] ? (Number(v[1]) - 20) * 100 + Number(v[2]) : NaN;
  t(Number(c[1]) === attendu, `APP_BUILD ${v[1]}.${v[2]} et CACHE_NAME myboutiq-v${c[1]} vont ensemble (attendu v${attendu})`);
  // Un numéro de banc par banc. t153, t235, t292 : doublons anciens, connus.
  const anciens = new Set(['t153', 't235', 't292']), par = {};
  for (const f of fs.readdirSync(path.join(RACINE, 'tests', 'myboutiq'))) { const m = f.match(/^(t\d+)-/); if (m) (par[m[1]] = par[m[1]] || []).push(f); }
  const dup = Object.keys(par).filter(k => par[k].length > 1 && !anciens.has(k));
  t(dup.length === 0, 'tests/myboutiq : un numéro par banc' + (dup.length ? ' : ' + dup.map(k => par[k].join(' + ')).join(' ; ') : ''));
}
fin();
