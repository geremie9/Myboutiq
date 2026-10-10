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
for (const f of ['sw.js', 'supabase/functions/notifier/webpush.js']) {
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
fin();
