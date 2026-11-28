// t351 — « RANGER MA BOUTIQUE » : LE PRIX D'ACHAT, LE STOCK EN CARTONS, LA PHOTO (24.30).
// Le patron, 27/11, sur sa capture de « Ranger ma boutique » : « qu'est-ce
// qui manque ici pour bien ranger ? » — le prix d'achat (sans lui ni
// bénéfice ni valeur du stock), le stock en cartons (« Tu en as 2 » : 2
// bouteilles ou 2 cartons ?), et la photo.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t351');
const { s, port } = await serveur();
const b = await chromium.launch();
const A = (id, nm, px, x) => Object.assign({ id, nm, e: '📦', cat: 'Sucreries', px, pa: 0, stk0: 0, al: 0, vd: 0, vr: [], rt: true }, x || {});
const db = nouvelleBoutique(); db.cfg.facon = 'detail';
db.articles = [A(1, 'Énergisant', 0, { umSac: 12, umCont: 'carton' }), A(2, 'Canette', 0, { umSac: 24, umCont: 'carton' }), A(3, 'Bonbon', 0)];
const { p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
const tap = async sel => { await p.locator(sel).first().tap(); await p.waitForTimeout(100); };
const taper = async n => { for (const c of String(n)) await tap(`#rg .rg-pave button:text-is("${c}")`); };
const lire = () => p.evaluate(() => ({ nom: document.querySelector('.rg-planche').textContent, champ: _rg.champ, aide: document.querySelector('.rg-aide').innerText.replace(/\s+/g, ' '), stk: document.getElementById('rg-stk').innerText.replace(/\s+/g, ' '), pa: document.getElementById('rg-pa').innerText.replace(/\s+/g, ' '), photo: !!document.querySelector('.rg-mur .rg-photo') }));

await p.evaluate(() => ouvrirRangerBoutique()); await p.waitForTimeout(300);
let e = await lire();
t(e.nom === 'Énergisant' && /Tu l.achètes/.test(e.pa) && e.photo, `trois cases (vends, achètes, en as) et un bouton photo sur la planche`);
await taper('700'); await tap('#rg-suiv');
e = await lire();
t(e.champ === 'stkC' && /cartons/.test(e.aide) && /pièces/.test(e.aide), `après le prix : on compte en cartons d'abord (« ${e.aide} »)`);
await taper('2'); await tap('#rg .rg-aide button:nth-child(2)'); await taper('5');
e = await lire();
t(/2 cartons \+ 5/.test(e.stk) && /29/.test(e.stk) && /= 29/.test(e.aide), `« 2 cartons + 5 » = 29 (« ${e.stk} » · « ${e.aide} »)`);
// le prix d'achat, pour le carton entier
// 24.44 — l'achat se tape d'abord pour le carton (« tout achat est en gros, en majeure »)
await tap('#rg-pa'); await taper('6000');
e = await lire();
t(/pour 1 carton de 12/.test(e.aide) && /500.*la pièce.*tu gagnes 200/.test(e.aide), `achat 6 000 « pour 1 carton de 12 » : « ${e.aide} »`);
await tap('#rg-suiv'); await p.waitForTimeout(200);
const a1 = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 1); return { px: a.px, pa: a.pa, stk: getStk(a) }; });
t(a1.px === 700 && a1.pa === 500 && a1.stk === 29, `Énergisant enregistré : vendu 700, acheté 500 la pièce, 29 en stock (${JSON.stringify(a1)})`);
// l'achat tapé une fois : il entre dans l'enchaînement pour la suite
await taper('500'); await tap('#rg-suiv');
e = await lire();
t(e.nom === 'Canette' && e.champ === 'pa', `article suivant : du prix, le bouton vert passe à l'achat (il le tape d'habitude)`);
await taper('9600'); await tap('#rg-suiv');                   // 1 carton de 24 à 9 600 = 400 la pièce
e = await lire();
t(e.champ === 'stkC', `puis au stock en cartons`);
await taper('1'); await tap('#rg-suiv'); await p.waitForTimeout(200);
const a2 = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 2); return { px: a.px, pa: a.pa, stk: getStk(a) }; });
t(a2.px === 500 && a2.pa === 400 && a2.stk === 24, `Canette : 500 / carton de 24 à 9 600 = 400 / 1 carton = 24 (${JSON.stringify(a2)})`);
// un article à la pièce sans carton : la quantité simple
e = await lire();
t(e.nom === 'Bonbon', `troisième article : Bonbon`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
