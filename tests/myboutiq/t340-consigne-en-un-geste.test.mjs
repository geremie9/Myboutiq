// t340 — LA CONSIGNE EN UN GESTE (24.20).
// L'agent « dépôt » (25/11) : 12 bières, douze touches sur « + » pour compter
// les emballages emportés, douze de plus sur chaque ligne quand il rend ses
// vides. En vrai, personne ne le faisait : la consigne n'était pas comptée.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, nombre } from './caisse.mjs';
const { t, fin } = compteur('t340');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();      // article 1 : Bière 65 cl à 650, consigne 100
const { p, errs } = await ouvrirCaisse(b, port, d);

await p.evaluate(() => { viderPanier(); const a = DB.articles.find(x => x.id === 1); _ajouterLot(a, 12); procederPmt(); });
await p.waitForTimeout(500);
const v0 = await p.evaluate(() => ({ html: document.getElementById('cons-vite').innerText.replace(/\s+/g, ' '), vu: getComputedStyle(document.getElementById('cons-vite')).display !== 'none', ap: calcAPayer() }));
t(v0.vu && /↩ 12/.test(v0.html) && /\+ 1[   ]?200 il emporte les 12/.test(v0.html), `un casier de 12 au panier : « ${v0.html} »`);
t(v0.ap === 7800, `rien n'est compté tant qu'il n'a pas touché : à payer ${v0.ap}`);

await p.locator('#cons-vite button').nth(1).click(); await p.waitForTimeout(200);
const v1 = await p.evaluate(() => ({ ap: calcAPayer(), pr: consignePrises, re: consigneRendues, on: document.querySelector('#cons-vite button.on') && document.querySelector('#cons-vite button.on').innerText }));
t(v1.ap === 9000 && v1.pr === 12 && v1.re === 0 && /emporte les 12/.test(v1.on || ''), `« il les emporte » : une touche, 12 emballages, à payer 9 000 (${JSON.stringify(v1)})`);

await p.locator('#cons-vite button').nth(0).click(); await p.waitForTimeout(200);
const v2 = await p.evaluate(() => ({ ap: calcAPayer(), pr: consignePrises, re: consigneRendues }));
t(v2.ap === 7800 && v2.pr === 12 && v2.re === 12, `« il rend ses vides » : 12 pris, 12 rendus, à payer 7 800 (${JSON.stringify(v2)})`);

// Le cas du milieu reste possible : il rend 8 vides sur 12
await p.evaluate(() => { for (let i = 0; i < 4; i++) chgConsigne('rendues', -1); });
const v3 = await p.evaluate(() => ({ ap: calcAPayer(), html: document.getElementById('cons-vite').innerText, on: !!document.querySelector('#cons-vite button.on') }));
t(v3.ap === 8200 && !v3.on, `8 vides sur 12 avec « − » : à payer 8 200, aucun bouton allumé`);

// La vente garde la consigne, la caisse la compte
await p.locator('#cons-vite button').nth(1).click(); await p.waitForTimeout(150);
const v4 = await p.evaluate(() => { const av = caisseAttendue(); selPmntVente('especes'); encaisser(); const v = DB.ventes[DB.ventes.length - 1]; return { cons: v.consigne, total: v.total, delta: caisseAttendue() - av }; });
t(v4.cons === 1200 && v4.total === 7800 && v4.delta === 9000, `vendue : consigne 1 200 à part du chiffre (7 800), le tiroir prend 9 000 (${JSON.stringify(v4)})`);

// Sans article consigné : pas de boutons
await p.evaluate(() => { try { fermerSucces(); } catch (e) {} viderPanier(); addPanier(DB.articles.find(x => x.id === 3)); procederPmt(); });
await p.waitForTimeout(300);
const v5 = await p.evaluate(() => getComputedStyle(document.getElementById('consigne-row')).display);
t(v5 === 'none', `un savon seul : pas de consigne à l'écran`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
