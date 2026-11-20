// ═══════════════════════════════════════════════════════════════════
//  Comparateur des services de voix (23.80) — choisir le fournisseur sur
//  de VRAIES phrases de commerçants, pas sur un comparatif américain.
//
//  1. Mettre les enregistrements dans outils/voix-banc/sons/ : 01.webm,
//     02.m4a… (le numéro de phrases.tsv ; tout format audio courant).
//  2. Lancer avec les clés des services à comparer, par exemple :
//       VOIX_CLE_GROQ=… VOIX_CLE_OPENAI=… VOIX_CLE_ASSEMBLYAI=… \
//       node outils/voix-banc/comparer.mjs
//  3. Lire outils/voix-banc/RAPPORT.md : pour chaque service, les noms
//     d'articles et les montants bien reconnus, et le temps de réponse.
//  Utilise EXACTEMENT le code de la fonction serveur (fournisseurs.js).
//  Ce dossier n'est pas publié sur le site (.vercelignore : /outils).
// ═══════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { transcrire } from '../../supabase/functions/voix/fournisseurs.js';
const ICI = path.dirname(new URL(import.meta.url).pathname);
const lignes = fs.readFileSync(path.join(ICI, 'phrases.tsv'), 'utf8').split('\n').filter(l => l && !l.startsWith('#'));
const phrases = lignes.map(l => { const [f, dite, arts, mt] = l.split('\t'); return { f: f.trim(), dite, arts: (arts || '').split(';').map(x => x.trim()).filter(Boolean), mt: Number(mt) || 0 }; });
const sons = fs.existsSync(path.join(ICI, 'sons')) ? fs.readdirSync(path.join(ICI, 'sons')) : [];
const MOTS = ['Mützig 65 cl', 'Coca-Cola', 'Fanta', 'Eau Tangui', 'Pain chargé', 'Riz', 'Tasty Tom', 'Sardines Titus', 'Huile Mayor', 'Maggi', 'Lait Peak', 'Guinness', 'Indomie', 'Savon Protex', 'Top Ananas', 'Beaufort', 'Milo', 'Colgate', 'Nescafé', 'Tartina', 'Malta Guinness', 'Djino', 'Supermont', 'Castel'];
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
// « deux mille cinq cents » → 2500 ; « 2 500 » → 2500
const UN = { zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 };
function montant(t) {
  const c = norm(t).replace(/(\d) (?=\d{3}\b)/g, '$1');
  const m = c.match(/\b\d{2,7}\b/); if (m) return Number(m[0]);
  let total = 0, cur = 0, vu = false;
  for (const w of c.split(/[ -]/)) {
    if (w in UN) { cur += UN[w]; vu = true; } else if (w === 'cent' || w === 'cents') { cur = (cur || 1) * 100; vu = true; } else if (w === 'mille') { total += (cur || 1) * 1000; cur = 0; vu = true; } else if (w === 'et') continue;
  }
  return vu ? total + cur : 0;
}
const SERVICES = ['groq', 'openai', 'assemblyai'].filter(n => process.env['VOIX_CLE_' + n.toUpperCase()]);
if (!SERVICES.length) { console.log('Aucune clé : mets VOIX_CLE_GROQ, VOIX_CLE_OPENAI ou VOIX_CLE_ASSEMBLYAI.'); process.exit(1); }
const res = {};
for (const n of SERVICES) {
  res[n] = { arts: 0, artsTot: 0, mts: 0, mtsTot: 0, ms: [], lignes: [] };
  for (const p of phrases) {
    const fic = sons.find(x => x.replace(/\.[^.]+$/, '') === p.f); if (!fic) continue;
    const son = new Blob([fs.readFileSync(path.join(ICI, 'sons', fic))]);
    const t0 = Date.now(); let texte = '', err = '';
    try { texte = (await transcrire(n, process.env['VOIX_CLE_' + n.toUpperCase()], son, fic, MOTS, { delai: 20000 })).texte; } catch (e) { err = e.message; }
    const ms = Date.now() - t0; res[n].ms.push(ms);
    const okArts = p.arts.filter(a => norm(texte).includes(norm(a)));
    res[n].arts += okArts.length; res[n].artsTot += p.arts.length;
    let okMt = null; if (p.mt) { okMt = montant(texte) === p.mt; res[n].mtsTot++; if (okMt) res[n].mts++; }
    res[n].lignes.push(`| ${p.f} | ${p.dite} | ${err ? '⚠️ ' + err : texte} | ${p.arts.length ? okArts.length + '/' + p.arts.length : ''}${okMt === null ? '' : (okMt ? ' ✅' : ' ❌')} | ${ms} ms |`);
    console.log(n, p.f, err || texte);
  }
}
let md = `# Comparaison des services de voix\n\nPhrases : ${phrases.length} prévues, ${sons.length} enregistrées. Date : ${new Date().toLocaleDateString('fr-FR')}.\n\n| Service | Articles reconnus | Montants justes | Temps médian |\n|---|---|---|---|\n`;
for (const n of SERVICES) { const r = res[n], m = r.ms.slice().sort((a, b) => a - b)[Math.floor(r.ms.length / 2)] || 0; md += `| ${n} | ${r.arts}/${r.artsTot} | ${r.mts}/${r.mtsTot} | ${m} ms |\n`; }
for (const n of SERVICES) md += `\n## ${n}\n\n| N° | Dit | Compris | Bon | Temps |\n|---|---|---|---|---|\n` + res[n].lignes.join('\n') + '\n';
fs.writeFileSync(path.join(ICI, 'RAPPORT.md'), md);
console.log('\n' + md.split('\n## ')[0]);
