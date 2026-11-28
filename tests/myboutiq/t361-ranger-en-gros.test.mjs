// t361 — RANGER : L'ACHAT EN GROS D'ABORD (24.44).
// Le patron, 28/11, sur « Ranger ma boutique » (capture du pain) : « en
// rangeant, il faudrait aussi en gros : tout achat ou approvisionnement est
// en gros en majeure ». L'achat se tape pour le contenant dès qu'il existe,
// et s'il n'existe pas, il se pose ici même, en deux touches et un nombre.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t361');
const { s, port } = await serveur();
const b = await chromium.launch();
const A = (id, nm, px, x) => Object.assign({ id, nm, e: '', cat: 'Alimentation', px, pa: 0, stk0: 0, al: 0, vd: 0, vr: [], rt: true }, x || {});
const db = nouvelleBoutique(); db.cfg.facon = 'detail';
db.articles = [A(1, 'Bonbon', 25), A(2, 'Riz', 600, { um: 'kg', umSac: 50, umCont: 'sac' })];
const { p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
const tap = async sel => { await p.locator(sel).first().tap(); await p.waitForTimeout(100); };
const taper = async n => { for (const c of String(n)) await tap(`#rg .rg-pave button:text-is("${c}")`); };
const lire = () => p.evaluate(() => ({ nom: document.querySelector('.rg-planche').textContent, champ: _rg.champ, aide: document.querySelector('.rg-aide').innerText.replace(/\s+/g, ' '), pa: document.getElementById('rg-pa').innerText.replace(/\s+/g, ' ') }));

await p.evaluate(() => ouvrirRangerBoutique()); await p.waitForTimeout(300);
let e = await lire();
await tap('#rg-pa'); e = await lire();
t(e.nom === 'Bonbon' && /J.achète par carton, sac/.test(e.aide), `Bonbon sans contenant : « ${e.aide} »`);
await tap('#rg .rg-aide .rg-gros'); e = await lire();
t(e.champ === 'defN' && /carton.*paquet.*sac/.test(e.aide) && /1 carton de/.test(e.pa), `les mots d'un toucher, le nombre au pavé (« ${e.pa} »)`);
await tap('#rg .rg-aide button:text-is("paquet")'); await taper('50'); e = await lire();
t(/1 paquet de 50/.test(e.pa.replace(/\s+/g, ' ')), `« ${e.pa} »`);
await tap('#rg .rg-aide .rg-def-ok'); e = await lire();
t(e.champ === 'pa' && /pour 1 paquet de 50/.test(e.aide), `retour à l'achat, « pour 1 paquet de 50 » allumé (« ${e.aide} »)`);
await taper('1000'); e = await lire();
t(/20.*la pièce.*tu gagnes 5/.test(e.aide), `1 000 le paquet de 50 = 20 la pièce, tu gagnes 5 (« ${e.aide} »)`);
await tap('#rg-suiv'); await p.waitForTimeout(150);
e = await lire();
t(e.champ === 'stkC' && /paquets/.test(e.aide), `le stock se compte maintenant en paquets (« ${e.aide} »)`);
await taper('3'); await tap('#rg-suiv'); await p.waitForTimeout(200);
const a1 = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 1); return { pa: a.pa, n: a.umSac, mot: a.umCont, stk: getStk(a) }; });
t(a1.pa === 20 && a1.n === 50 && a1.mot === 'paquet' && a1.stk === 150, `Bonbon enregistré : 20 la pièce, paquet de 50, 3 paquets = 150 (${JSON.stringify(a1)})`);
// Le riz au kilo, en sac de 50 kg : l'achat se tape pour le sac
e = await lire();
t(e.nom === 'Riz', `article suivant : Riz`);
await tap('#rg-pa'); e = await lire();
t(/pour 1 sac de 50 kg/.test(e.aide) && /1 sac/.test(e.pa), `« pour 1 sac de 50 kg » d'abord (« ${e.aide} »)`);
await taper('22500'); e = await lire();
t(/450.*tu gagnes 150/.test(e.aide), `22 500 le sac de 50 kg = 450 le kilo, tu gagnes 150 (« ${e.aide} »)`);
await tap('#rg-suiv'); await taper('100'); await tap('#rg-suiv'); await p.waitForTimeout(200);
const a2 = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 2); return { pa: a.pa, stk: getStk(a) }; });
t(a2.pa === 450, `Riz : 450 le kilo (${JSON.stringify(a2)})`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
