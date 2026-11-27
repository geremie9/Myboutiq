// t355 — LE RETOUR SOUS LE POUCE (24.35).
// Le patron, 27/11 : « peut-on avoir un retour avec le pouce là où c'est
// nécessaire ? » Les écrans ouverts par-dessus la caisse (Réglages…) n'ont
// pas la barre du bas ; leur retour était une petite flèche tout en haut.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t355');
const { s, port } = await serveur();
const b = await chromium.launch();
const { p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
const bouton = () => p.evaluate(() => { const x = document.getElementById('retour-pouce'); const r = x.getBoundingClientRect(); return { vu: getComputedStyle(x).display !== 'none', bas: window.innerHeight - r.bottom, gauche: r.left, h: r.height, txt: x.textContent.trim() }; });

t(!(await bouton()).vu, `sur la caisse : pas de bouton (la barre du bas est là)`);
await p.evaluate(() => goSt()); await p.waitForTimeout(200);
let r = await bouton();
t(r.vu && r.bas <= 40 && r.gauche <= 24 && r.h >= 52 && r.txt === 'Retour', `Réglages : « ${r.txt} » en bas à gauche, sous le pouce (rond de ${Math.round(r.h)} px, à ${Math.round(r.bas)} px du bas)`);
// une feuille ouverte par-dessus : il s'efface (la feuille a son propre geste)
await p.evaluate(() => ouvrirMonAbonnement()); await p.waitForTimeout(200);
t(!(await bouton()).vu, `une feuille ouverte : le bouton s'efface`);
await p.evaluate(() => closeSheet('ov-abo')); await p.waitForTimeout(100);
await p.locator('#retour-pouce').click(); await p.waitForTimeout(200);
const o = await p.evaluate(() => ({ ecran: document.querySelector('.scr.on').id, vu: getComputedStyle(document.getElementById('retour-pouce')).display !== 'none' }));
t(o.ecran === 's-caisse' && !o.vu, `toucher « Retour » : de retour sur la caisse, le bouton disparaît`);
// un onglet : pas de bouton
await p.evaluate(() => { const b = [...document.querySelectorAll('.ni')].find(n => (n.getAttribute('onclick') || '').indexOf("navTo('stock'") > -1); navTo('stock', b); }); await p.waitForTimeout(150);
t(!(await bouton()).vu, `onglet Stock : pas de bouton`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
