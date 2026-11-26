// t314 — LE CARTON AU PRIX D'UNE BOUTEILLE (23.98).
// Trouvé le 22/11/2026 dans la boutique du patron, en vérifiant une analyse
// qu'on lui avait envoyée : « Mayor — carton de 14 » à 1 450 F, la bouteille
// à 1 100 F. Le champ veut le prix d'UN carton ; il y avait mis celui d'une
// bouteille. Toucher la pastille vendait 14 bouteilles pour 1 450 F.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t314');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
d.articles.push({ id: 105, nm: 'Huile', e: '', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, rt: true,
  vr: [{ id: 2, nm: 'Mayor', px: 1100, pa: 900, stk0: 60, qBase: 1, umSac: 14, umCont: 'carton', pxGros: 1450, rt: true },
       { id: 3, nm: 'Palmida', px: 1000, pa: 800, stk0: 60, qBase: 1, umSac: 12, umCont: 'carton', pxGros: 11000, rt: true }] });
d.articles.push({ id: 117, nm: 'Diamaor', e: '', cat: 'Alimentation', px: 1500, pa: 1250, stk0: 60, al: 0, rt: true, umSac: 15, umCont: 'carton', pxGros: 1400 });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
// 24.15 — la boutique relue répare seule ces deux cartons (t332). La question
// reste pour un prix TAPÉ maintenant : on les remet, comme s'il venait de les saisir.
await p.evaluate(() => { DB.articles.find(x => x.id === 105).vr[0].pxGros = 1450; DB.articles.find(x => x.id === 117).pxGros = 1400; });
const A = id => `DB.articles.find(x => x.id === ${id})`;
const feuille = () => p.evaluate(() => { const o = document.getElementById('ov-grospiege'); return o && o.classList.contains('show') ? o.innerText.replace(/\s+/g, ' ') : ''; });
const total = () => p.evaluate(() => calcTotal());

// ── 1. À la caisse : le carton de Mayor ne part pas sans question ──
await p.evaluate(`viderPanier(); varQtys = {}; _ajouterLotVariante(${A(105)}, ${A(105)}.vr[0], 14, 'carton')`);
let f = await feuille();
t(/paraît faux/.test(f) && /1 carton = 14/.test(f) && /104/.test(f), `toucher le carton de Mayor : la question avant la vente — « ${f.slice(0, 120)}… »`);
t(await p.evaluate(() => !Object.keys(panier).length && !Object.keys(varQtys || {}).some(k => varQtys[k] > 0)), 'rien n\'est vendu tant qu\'il n\'a pas répondu');
t(/20\s?300/.test(f), 'la réparation est proposée : « le carton à 20 300 F »');
// Il répond : c'était le prix d'une bouteille.
await p.evaluate(() => _grosPiegeRepondre(1));
const r1 = await p.evaluate(`({ pg: ${A(105)}.vr[0].pxGros, journal: JSON.stringify(DB.journal || DB.journalModifs || '').includes('20') })`);
t(r1.pg === 20300, `corrigé d'une touche : le carton de Mayor à ${r1.pg} F`);
await p.waitForTimeout(200);
const tt = await total();
t(tt === 20300, `et la vente continue toute seule, au bon prix : ${tt} F au panier (avant : 1 450 F pour 14 bouteilles)`);
t(!(await feuille()), 'la feuille est fermée');

// ── 2. Un carton à un vrai prix de gros : aucune question ──
await p.evaluate(`viderPanier(); varQtys = {}; _ajouterLotVariante(${A(105)}, ${A(105)}.vr[1], 12, 'carton')`);
t(!(await feuille()) && await total() === 11000, 'Palmida : carton de 12 à 11 000 F (1 000 F au détail) — une vraie remise, vendu sans question');

// ── 3. « Non, c'est bien le prix » : gardé, plus jamais redemandé (tant que le prix ne bouge pas) ──
// 24.15 — l'enregistrement d'avant a réparé ce carton (la formule) : il retape 1 400.
await p.evaluate(`${A(117)}.pxGros = 1400`);
await p.evaluate(`viderPanier(); _ajouterLot(${A(117)}, 15, 'carton')`);
t(/paraît faux/.test(await feuille()), 'Diamaor hors famille : la même question');
await p.evaluate(() => _grosPiegeRepondre(2));
await p.waitForTimeout(200);
t(await total() === 1400, `il confirme 1 400 F le carton : vendu à ce prix (${await total()} F)`);
await p.evaluate(`viderPanier(); _ajouterLot(${A(117)}, 15, 'carton')`);
t(!(await feuille()) && await total() === 1400, 'le carton suivant : plus de question');
// 24.15 — et la formule respecte sa réponse : relire la boutique ne remet pas 21 000.
t(await p.evaluate(`(function(){ DB = migrateDBData(DB); return ${A(117)}.pxGros; })()`) === 1400, 'il a dit « c\'est bien le prix » : la réparation automatique n\'y touche plus');
await p.evaluate(`${A(117)}.pxGros = 1300; viderPanier(); _ajouterLot(${A(117)}, 15, 'carton')`);
t(/paraît faux/.test(await feuille()), 'le prix change (1 300 F) : il redemande');
await p.evaluate(() => _grosPiegeFermer());
t(await total() === 0, 'fermer la feuille : rien n\'est vendu');

// ── 4. À la saisie : la question vient dès qu'il pose le prix ──
await p.evaluate(`${A(117)}.grosVu = undefined`);
await p.evaluate(`(function(){ const a = ${A(117)}; a.pxGros = 900; a.grosVu = undefined; _grosPiegeOuvrir(a, null, null); })()`);
t(/paraît faux/.test(await feuille()), 'saisir 900 F pour un carton de 15 à 1 500 F l\'unité : la question tout de suite');
await p.evaluate(() => _grosPiegeFermer());

// ── 5. Le vendeur : il ne touche pas aux prix ──
await p.evaluate(`role = 'vendeur'; ${A(117)}.pxGros = 1400; ${A(117)}.grosVu = undefined; viderPanier(); _ajouterLot(${A(117)}, 15, 'carton')`);
f = await feuille();
t(/Dis-le au patron/.test(f) && !/prix d'UNE seule/.test(f) && /Vendre quand même/.test(f), `le vendeur : « Dis-le au patron », pas de réparation des prix — « ${f.slice(0, 90)}… »`);
await p.evaluate(() => _grosPiegeRepondre(3));
await p.waitForTimeout(200);
t(await total() === 1400 && await p.evaluate(`${A(117)}.pxGros`) === 1400, 'il peut vendre quand même, le prix n\'est pas touché');
await p.evaluate(() => { role = 'patron'; });
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
