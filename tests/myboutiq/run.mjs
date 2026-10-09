/* Lance tous les bancs de MyBoutiQ l'un après l'autre et dit, à la fin,
   combien de vérifications ont réussi, échoué, et combien de bancs ont planté.
   Usage : node run.mjs [filtre]   — ex. node run.mjs vente
   ⚠️ Un banc qui PLANTE ne dit ni ✅ ni ❌ : il disparaîtrait du total sans
   bruit. Son code de sortie fait donc partie du résultat. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ICI } from './lib.mjs';

const filtre = process.argv[2] || '';
const ordre = f => (f.startsWith('syntaxe') ? '0' : '1') + f;
const fichiers = fs.readdirSync(ICI).filter(f => f.endsWith('.test.mjs') && f.includes(filtre)).sort((a, b) => ordre(a).localeCompare(ordre(b), 'fr', { numeric: true }));

function lancer(f) {
  return new Promise(ok => {
    const debut = Date.now();
    const e = spawn(process.execPath, [path.join(ICI, f)], { cwd: ICI, env: process.env });
    let sortie = '';
    e.stdout.on('data', d => sortie += d); e.stderr.on('data', d => sortie += d);
    const garde = setTimeout(() => e.kill('SIGKILL'), 10 * 60 * 1000);
    e.on('close', code => { clearTimeout(garde); ok({ code, sortie, s: Math.round((Date.now() - debut) / 1000) }); });
  });
}
let ok = 0, ko = 0, plantes = 0;
const bruit = /agent-proxy|connect_rejected|For details|oldest \d+ not shown|__agentproxy/;
for (const f of fichiers) {
  const { code, sortie, s } = await lancer(f);
  const o = (sortie.match(/^✅/gm) || []).length, k = (sortie.match(/^❌/gm) || []).length;
  ok += o; ko += k;
  console.log(`${k || code ? '✗' : '✓'} ${f.padEnd(34)} ${String(o).padStart(4)} ✅  ${k ? k + ' ❌' : ''}  ${s} s`);
  if (k) console.log(sortie.split('\n').filter(l => /^❌/.test(l)).map(l => '    ' + l).join('\n'));
  if (code !== 0 && !k) {
    plantes++;
    console.log('    💥 le banc a planté (code ' + code + ')');
    console.log(sortie.split('\n').filter(l => l && !bruit.test(l)).slice(-12).map(l => '    ' + l).join('\n'));
  }
}
console.log(`\n═══ ${fichiers.length} bancs · ${ok} ✅ · ${ko} ❌ · ${plantes} 💥`);
process.exit(ko || plantes || !ok ? 1 : 0);
