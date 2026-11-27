// t348 — LA DICTÉE DES COMMANDES, EN PHASE DE TEST (24.27).
// Le patron, 27/11 : « coupe le vocal à tout le monde sauf moi — c'est en
// phase test — la dictée des commandes seulement ». Le micro « Parle » et le
// micro de la barre de la caisse ne se montrent qu'aux administrateurs ; la
// dictée d'un nom dans un formulaire et la voix de la monnaie restent.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t348');
const { s, port } = await serveur();
const b = await chromium.launch();

const lire = p => p.evaluate(() => ({
  pouce: getComputedStyle(document.getElementById('mic-pouce')).display,
  barre: getComputedStyle(document.getElementById('btn-mic')).display,
  cli: !!document.querySelector('[onclick*="dicterDans(\'cli-nm\'"]'),
}));

// Un commerçant ordinaire
let o = await ouvrirCaisse(b, port, nouvelleBoutique(), { testeur: false });
let r = await lire(o.p);
t(r.pouce === 'none' && r.barre === 'none', `commerçant : ni le micro « Parle » ni celui de la barre (${r.pouce}, ${r.barre})`);
const ecoute = await o.p.evaluate(() => { let n = 0; const SR = window.SpeechRecognition || window.webkitSpeechRecognition; window.webkitSpeechRecognition = window.SpeechRecognition = function () { n++; return { start() {}, stop() {}, abort() {} }; }; micPouce(); micTape(); voiceSearch(); return n; });
t(ecoute === 0, `même appelée, la dictée des commandes n'écoute pas (${ecoute} écoute)`);
t(r.cli, `la dictée d'un nom dans la fiche client reste`);
t(o.errs.length === 0, `aucune erreur JS ${o.errs.slice(0, 2).join(' | ')}`);
await o.ctx.close();

// L'administrateur (le patron de MyBoutiQ)
o = await ouvrirCaisse(b, port, nouvelleBoutique(), { testeur: true });
r = await lire(o.p);
t(r.pouce !== 'none' && r.barre !== 'none', `administrateur : les deux micros sont là (${r.pouce}, ${r.barre})`);
await o.ctx.close();

await b.close(); s.close();
fin();
