// t352 — L'INVENTAIRE INTELLIGENT : UN PAR UN, « C'EST JUSTE », CARTONS + PIÈCES (24.31).
// Le patron, 27/11, sur sa capture de l'inventaire : « comment faire
// l'inventaire de façon intelligente et bien faite ? » — il fallait retaper
// le nombre de chaque article même juste, « carton de 12 » était écrit mais
// la case ne prenait que des pièces, et « compté » en gris dans une case vide
// se lisait « déjà compté ».
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t352');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
d.articles = [
  { id: 1, nm: 'Guinness', e: '', cat: 'Boissons', px: 950, pa: 800, stk0: 29, al: 0, vd: 0, vr: [], umSac: 12, umCont: 'carton' },
  { id: 2, nm: 'Malta', e: '', cat: 'Boissons', px: 650, pa: 500, stk0: 10, al: 0, vd: 0, vr: [] },
  { id: 3, nm: 'Sucre', e: '', cat: 'Alimentation', px: 700, pa: 600, stk0: 5, al: 0, vd: 0, vr: [] },
];
const { p, errs } = await ouvrirCaisse(b, port, d);
await p.evaluate(() => { localStorage.removeItem(_invCle()); ouvrirInventaire(); });
await p.waitForTimeout(300);
const l0 = await p.evaluate(() => ({ b: !!document.querySelector('#inv-lst .inv-un-b'), ph: (document.querySelector('#inv-lst .inv-in') || {}).placeholder }));
t(l0.b && l0.ph === '?', `la liste : « Compter un par un » en tête, et « ? » dans les cases (avant : « compté »)`);
await p.evaluate(() => invUnParUn()); await p.waitForTimeout(200);
let c = await p.evaluate(() => ({ nm: document.querySelector('.inv-un-nm').textContent, th: document.querySelector('.inv-un-th').textContent, juste: document.querySelector('.inv-juste').textContent, champs: [...document.querySelectorAll('.inv-un-v button small')].map(x => x.textContent) }));
t(c.nm === 'Guinness' && /29.*2 cartons \+ 5/.test(c.th) && /C'est juste : 29/.test(c.juste), `un par un : « ${c.th} », « ${c.juste} »`);
t(c.champs.length === 2 && /cartons \(12\)/.test(c.champs[0]) && /pièces en plus/.test(c.champs[1]), `Guinness s'achète par 12 : on tape « cartons » puis « pièces » (${c.champs.join(' / ')})`);
// il compte 2 cartons + 2 : 3 manquants, 2 400 F
await p.evaluate(() => { invUnTouche('2'); invUnChamp('p'); invUnTouche('2'); });
const tot = await p.evaluate(() => document.querySelector('.inv-un-tot').textContent);
t(/= 26 · −3 \(2.?400/.test(tot), `2 cartons + 2 = 26 : « ${tot} »`);
await p.evaluate(() => invUnSuivant()); await p.waitForTimeout(150);
c = await p.evaluate(() => ({ nm: document.querySelector('.inv-un-nm').textContent, inv: JSON.parse(localStorage.getItem(_invCle())) }));
t(c.nm === 'Malta' && c.inv['1-0'] === '26', `« Suivant » garde 26 et passe à Malta`);
// Malta est juste : une touche
await p.evaluate(() => invJuste()); await p.waitForTimeout(150);
c = await p.evaluate(() => ({ nm: document.querySelector('.inv-un-nm').textContent, inv: JSON.parse(localStorage.getItem(_invCle())) }));
t(c.nm === 'Sucre' && c.inv['2-0'] === '10', `Malta juste : UNE touche « C'est juste » (10), on passe au Sucre`);
await p.evaluate(() => invJuste()); await p.waitForTimeout(200);
const fin1 = await p.evaluate(() => ({ liste: !_invUn, toast: (window.__toasts || []).slice(-1)[0] || '' }));
t(fin1.liste && /Tout est compté/.test(fin1.toast), `tout compté : retour à la liste, « ${fin1.toast} »`);
// Valider : le bilan en argent avant de confirmer
await p.evaluate(() => validerInventaire()); await p.waitForTimeout(150);
const bil = await p.evaluate(() => document.getElementById('inv-pied').innerText.replace(/\s+/g, ' '));
t(/−3 Guinness −2[  ]?400/.test(bil) && /Écart total −2[  ]?400/.test(bil) && /Confirmer : corriger 1 article/.test(bil), `avant de confirmer : « ${bil.slice(0, 90)}… »`);
await p.evaluate(() => validerInventaire()); await p.waitForTimeout(200);
t(await p.evaluate(() => getStk(DB.articles.find(x => x.id === 1))) === 26, `confirmé : Guinness passe à 26`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
