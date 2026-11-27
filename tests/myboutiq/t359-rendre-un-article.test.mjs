// t359 — RENDRE UN ARTICLE (24.39).
// Joué au banc (t358) : un client achète 3 savons et en rapporte 1 abîmé.
// L'app ne savait qu'annuler TOUTE la vente. Le patron : « Go construire ».
// Ici : le bouton « Rendre » sur la vente, la feuille (combien de quoi), le
// stock qui revient, l'argent rendu comme le client avait payé (espèces,
// Orange, ou sa dette qui baisse), le prix vraiment payé (remise répartie),
// la clôture juste, la synchro sur l'autre téléphone, et l'annulation
// d'un bloc qui ne compte pas deux fois.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, stock } from './caisse.mjs';
const { t, fin } = compteur('t359');
const { s, port } = await serveur();
const b = await chromium.launch();
const { p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique({ fondsDepart: 5000 }));

const rendre = (vid, q, mode) => p.evaluate(([vid, q, mode]) => {
  window.__toasts = []; window.__dit = []; parler = x => __dit.push(x);
  ouvrirRendre(vid);
  const ouvert = document.getElementById('ov-rendre').classList.contains('show');
  for (const [i, n] of Object.entries(q)) for (let k = 0; k < n; k++) rduPas(Number(i), 1);
  if (mode) rduMode(mode);
  const dit = document.querySelector('#rdu-corps .rdu-rend').textContent;
  const n0 = DB.ventes.length;
  document.getElementById('rdu-ok').click();
  const r = DB.ventes.length > n0 ? JSON.parse(JSON.stringify(DB.ventes[DB.ventes.length - 1])) : null;
  return { ouvert, dit, r, toast: window.__toasts.join('|'), voix: __dit.join('|') };
}, [vid, q, mode || null]);

// ── 3 savons en espèces, on en rend 1 ──
const v1 = (await vendre(p, { lignes: [[3, 3]] })).v;                 // Savon Azur 650 × 3
const av = { stk: await stock(p, 3), att: await p.evaluate(() => caisseAttendue()), nb: await p.evaluate(() => nbT), ca: await p.evaluate(() => totalV) };
const bout = await p.evaluate(() => { _rptPer = 'jour'; renderRpt(); return [...document.querySelectorAll('#rpt-cont button')].some(x => /Rendre/.test(x.textContent)); });
t(bout, `« Dernières ventes » : un bouton « Rendre » à côté de « Annuler »`);
let r = await rendre(v1.id, { 0: 1 });
t(r.ouvert && /Rends.?650/.test(r.dit), `la feuille : 1 savon → « ${r.dit} »`);
t(r.r && r.r.retour && r.r.ref === v1.id && r.r.total === -650 && r.r.lignes[0].qte === -1, `enregistré à part : retour de la vente, −650, 1 savon (${JSON.stringify(r.r && { t: r.r.total, q: r.r.lignes[0].qte })})`);
t(await stock(p, 3) === av.stk + 1, `le savon revient au rayon : ${av.stk} → ${await stock(p, 3)}`);
const ap = await p.evaluate(() => ({ att: caisseAttendue(), nb: nbT, ca: totalV, lib: saleLinesLabel(DB.ventes[DB.ventes.length - 1]) }));
t(ap.att === av.att - 650, `le tiroir attendu : ${av.att} → ${ap.att} (−650 rendus)`);
t(ap.nb === av.nb && ap.ca === av.ca - 650, `pas une vente de plus (${ap.nb}) ; le chiffre baisse de 650 (${ap.ca})`);
t(/Rends 650 francs/.test(r.voix) && /Rendu : 1 Savon Azur/.test(ap.lib), `la voix : « ${r.voix} » ; l'historique : « ${ap.lib} »`);
// On ne rend pas plus qu'il n'a acheté
r = await rendre(v1.id, { 0: 5 });
t(r.r && r.r.lignes[0].qte === -2, `il ne reste que 2 savons à rendre : « + » s'arrête à 2`);
t(!(await p.evaluate(id => _peutRendre(DB.ventes.find(v => v.id === id)), v1.id)), `tout est rendu : plus de bouton « Rendre » sur cette vente`);
const an = await p.evaluate(id => { window.__toasts = []; annulerVente(id); return { ouvert: document.getElementById('conf-annul').classList.contains('show'), t: window.__toasts.join('|') }; }, v1.id);
t(!an.ouvert && /déjà été rendu/.test(an.t), `l'annuler d'un bloc est refusé (sinon tout compterait deux fois) : « ${an.t.slice(0, 60)}… »`);

// ── Payé par Orange, avec une remise : rendu sur Orange, au prix payé ──
const v2 = (await vendre(p, { lignes: [[2, 4]], mode: 'orange', remise: 400 })).v;   // Riz 600 × 4 = 2 400 − 400 = 2 000
r = await rendre(v2.id, { 0: 1 });
t(r.r && r.r.total === -500 && r.r.paiement.mode === 'orange', `riz payé 2 000 pour 4 (remise 400) : 1 rendu = 500 sur Orange (${r.r && r.r.total}, ${r.r && r.r.paiement.mode})`);
const or = await p.evaluate(() => paiementBreakdown(getCaisseSales()).orange);
t(or === 1500, `Orange du jour : 2 000 − 500 = ${or}`);

// ── À crédit : la dette baisse ──
const v3 = (await vendre(p, { lignes: [[4, 2]], mode: 'credit', client: 1, avance: 0 })).v;   // Huile 1 300 × 2 à crédit
const d0 = await p.evaluate(() => DB.clients[0].credit);
r = await rendre(v3.id, { 0: 1 });
const d1 = await p.evaluate(() => DB.clients[0].credit);
t(d0 === 2600 && d1 === 1300 && /dette d.Awa baisse de 1.?300/.test(r.dit), `huile à crédit : 1 rendu, la dette d'Awa ${d0} → ${d1} (« ${r.dit} »)`);
t(r.r && r.r.paiement.mode === 'credit' && r.r.paiement.du === -1300 && r.r.paiement.avance === -0, `noté comme une dette rendue, rien ne sort du tiroir`);

// ── Un carton rendu rend 24 pièces ──
const c0 = await stock(p, 6);
const v4 = (await vendre(p, { lots: [[6, 24]] })).v;
r = await rendre(v4.id, { 0: 1 });
t(await stock(p, 6) === c0 && r.r && r.r.total === -13000, `un carton rendu : 24 pièces reviennent (${c0} → ${await stock(p, 6)}), 13 000 rendus`);

// ── La clôture tombe juste ──
const clo = await p.evaluate(() => { ouvrirClot(); const att = caisseAttendue(); document.getElementById('inp-compt').value = att; calcEcart(); const e = document.getElementById('ecart-lbl').textContent; validerClot(); return { att, e }; });
// 5 000 + 1 950 − 650 − 1 300 (savons) + 13 000 − 13 000 (carton) = 5 000
t(clo.att === 5000 && /Équilibrée/.test(clo.e), `clôture : ${clo.att} attendus (fond 5 000 + savons 1 950 − 1 950 rendus ± carton), ${clo.e}`);

// ── L'autre téléphone reçoit le retour ──
const B = await ouvrirCaisse(b, port, nouvelleBoutique({ fondsDepart: 5000 }), { vendeur: 'Ibrahim' });
const vb = (await vendre(B.p, { lignes: [[5, 2]] })).v;             // Lait Nido × 2 sur le téléphone du vendeur
await p.evaluate(d => { DB = migrateDBData(mergeDB(d, DB)); recalcTotaux(); }, await B.p.evaluate(() => JSON.parse(JSON.stringify(DB))));
r = await rendre(vb.id, { 0: 1 });
await B.p.evaluate(d => { DB = migrateDBData(mergeDB(d, DB)); recalcTotaux(); }, await p.evaluate(() => JSON.parse(JSON.stringify(DB))));
t(await stock(B.p, 5) === 11 && await stock(p, 5) === 11, `rendu sur le téléphone du patron, le vendeur voit le même stock (Nido ${await stock(B.p, 5)})`);
const vend = await B.p.evaluate(() => ({ peut: _peutRendre(DB.ventes[0]), perm: hasPerm('annuler') }));
t(!vend.peut && !vend.perm, `le vendeur sans le droit « annuler » n'a pas « Rendre » non plus`);
// Archivage : le stock ne saute pas
const arch = await p.evaluate(() => { const a = [3, 5, 6].map(id => getStk(DB.articles.find(x => x.id === id))); archiverAnciennesVentes(Date.now() + 86400000); DB = recomputeStock(DB); return { a, b: [3, 5, 6].map(id => getStk(DB.articles.find(x => x.id === id))) }; });
t(JSON.stringify(arch.a) === JSON.stringify(arch.b), `archivage : le stock ne bouge pas (${arch.a} → ${arch.b})`);

t(errs.length === 0 && B.errs.length === 0, `aucune erreur JS ${errs.concat(B.errs).slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
