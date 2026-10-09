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
{
  const r = spawnSync('bash', ['-n', path.join(RACINE, '.claude/hooks/session-start.sh')], { encoding: 'utf8' });
  t(r.status === 0, '.claude/hooks/session-start.sh : syntaxe bash' + (r.status ? ' : ' + (r.stderr || '').trim() : ''));
}
fin();
