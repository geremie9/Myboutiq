// t362 — « UN NON-LETTRÉ SE PERDRAIT ICI » (24.45).
// Le patron, 28/11, sur « Tout configurer › Prix du carton » : cinq cases
// par article, des titres répétés, « en vrac ». La porte d'abord : « Un
// article à la fois, en grand » ouvre « Ranger » (le pavé, un article par
// écran), qui sait maintenant aussi le prix du CARTON vendu.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t362');
const { s, port } = await serveur();
const b = await chromium.launch();
const A = (id, nm, px, x) => Object.assign({ id, nm, e: '', cat: 'Divers', px, pa: 0, stk0: 0, al: 0, vd: 0, vr: [], rt: true }, x || {});
const db = nouvelleBoutique(); db.cfg.facon = 'detail';
db.articles = [A(1, 'Allumettes', 100, { umSac: 10, umCont: 'carton', stk0: 48 }), A(2, 'Agrafeuse', 40, { umSac: 100, umCont: 'carton' }), A(3, 'Bonbon', 25)];
const { p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
const tap = async sel => { await p.locator(sel).first().tap(); await p.waitForTimeout(100); };
const taper = async n => { for (const c of String(n)) await tap(`#rg .rg-pave button:text-is("${c}")`); };

await p.evaluate(() => ouvrirGrilleConfig('gros')); await p.waitForTimeout(300);
const porte = await p.evaluate(() => { const b = document.getElementById('gr-unparun'), r = b.getBoundingClientRect(), l = document.getElementById('gr-lst').getBoundingClientRect(); return { txt: b.innerText.replace(/\s+/g, ' '), haut: r.top < l.top, h: Math.round(r.height) }; });
t(/Un article à la fois, en grand/.test(porte.txt) && porte.haut && porte.h >= 56, `la porte est au-dessus du tableau : « ${porte.txt} » (${porte.h} px)`);
await tap('#gr-unparun'); await p.waitForTimeout(300);
const ouv = await p.evaluate(() => ({ grille: document.getElementById('ov-grille').classList.contains('show'), rg: document.getElementById('ov-rgb').classList.contains('show'), ids: _rg.ids.slice(), nom: document.querySelector('.rg-planche').textContent }));
t(!ouv.grille && ouv.rg && JSON.stringify(ouv.ids) === '[1,2]' && ouv.nom === 'Allumettes', `le tableau se ferme, « Ranger » s'ouvre sur les 2 articles à carton (${JSON.stringify(ouv.ids)})`);
await tap('#rg-px');                                          // le prix est déjà là : l'écran s'ouvre sur le stock
const aide = await p.evaluate(() => document.querySelector('.rg-aide').innerText.replace(/\s+/g, ' '));
t(/la pièce/.test(aide) && /1 carton de 10/.test(aide), `sous le prix : « ${aide} »`);
await tap('#rg .rg-aide button:nth-child(2)'); await taper('950');
const box = await p.evaluate(() => document.getElementById('rg-px').innerText.replace(/\s+/g, ' '));
t(/Tu vends 1 carton/.test(box) && /950/.test(box), `« ${box} »`);
await tap('#rg .rg-aide button:nth-child(1)');
const box2 = await p.evaluate(() => document.getElementById('rg-px').innerText.replace(/\s+/g, ' '));
t(/100/.test(box2) && /1 carton : 950/.test(box2), `retour à la pièce : le carton reste écrit dessous (« ${box2} »)`);
await tap('#rg-pa'); await taper('600'); await tap('#rg-suiv'); await taper('5'); await tap('#rg-suiv'); await p.waitForTimeout(200);
const a1 = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 1); return { px: a.px, pxG: a.pxGros, pa: a.pa, paG: a.paGros, stk: getStk(a) }; });
t(a1.px === 100 && a1.pxG === 950 && a1.pa === 60 && a1.paG === 600 && a1.stk === 50, `Allumettes : pièce 100, carton 950, achat 600 le carton = 60, 5 cartons = 50 (${JSON.stringify(a1)})`);
t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
