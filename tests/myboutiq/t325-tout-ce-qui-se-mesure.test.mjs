// t325 — TOUT CE QUI SE MESURE SE VEND PAR LA FEUILLE DES MESURES (24.08).
// Le patron, le 23/11, avec la capture de la feuille du sucre (« Comme
// d'habitude », « Pour un montant », « Au poids », « Autre quantité ») :
// « tous les articles en kg, en litres ou autres mesures, partout dans
// l'application, doivent se comporter comme l'image — que ce soit pendant la
// configuration ou ceux qui existent déjà ».
// Mesuré au banc avant : l'appui long ouvrait le pavé « Combien ? » ; la vente
// rapide d'une sorte au kilo posait 1 kg d'office ; la dose habituelle se
// vendait d'une touche sans feuille ; + et − du panier ajoutaient UN kilo ;
// l'étagère de départ créait « Riz · le kilo » SANS unité (vendu à la pièce).
// Mesuré en base : Riz (7), Sucre (4), Huile (4) créés ainsi.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t325');
const { s, port } = await serveur();
const b = await chromium.launch();
const A = (id, nm, px, stk, extra) => Object.assign({ id, nm, e: '', cat: 'Divers', px, pa: Math.round(px * .8), stk0: stk, al: 0, vd: 0, vr: [] }, extra || {});
const boutique = () => {
  const d = nouvelleBoutique(); d.cfg.venteDeverrouillee = false;
  d.articles.push(A(40, 'Sucre (kg)', 700, 100), A(41, 'Huile', 1500, 50, { um: 'L' }), A(42, 'Tomates', 500, 30, { umNom: 'cuvette' }),
    A(43, 'Riz', 600, 500, { um: 'kg', umSac: 50, umCont: 'sac', pxGros: 27000 }),
    { id: 44, nm: 'Arachide', e: '', cat: 'Divers', px: 0, pa: 0, stk0: 0, al: 0, um: 'kg', vr: [{ id: 1, nm: 'Arachide grillée', px: 1000, pa: 800, stk0: 40, qBase: 1 }, { id: 2, nm: 'Arachide crue', px: 800, pa: 600, stk0: 40, qBase: 1 }] });
  return d;
};
const feuille = p => p.evaluate(() => ({ ouverte: document.getElementById('ov-qte').classList.contains('show'), art: document.getElementById('qte-art').textContent,
  montant: !!document.querySelector('#ov-qte #qte-mt button, #ov-qte [onclick*="qtePourMontant"]'), poids: document.querySelectorAll('#ov-qte [onclick^="qteRapide"]').length,
  pave: document.getElementById('ov-pave').classList.contains('show'), panier: JSON.stringify(panier) }));
const fermer = p => p.evaluate(() => { document.querySelectorAll('.ov.show').forEach(o => o.classList.remove('show')); viderPanier(); varQtys = {}; });

const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique(), { tactile: true });
await p.setViewportSize({ width: 360, height: 640 });

// ── 1) LA TUILE : LE KILO, LE LITRE, LA CUVETTE, LE KILO À SAC ─────────
for (const [id, nm] of [[40, 'Sucre'], [41, 'Huile'], [42, 'Tomates'], [43, 'Riz']]) {
  await p.evaluate(id => { renderProd(DB.articles); document.getElementById('pc-' + id).scrollIntoView({ block: 'center' }); }, id);
  await p.tap('#pc-' + id); await p.waitForTimeout(200);
  const f = await feuille(p);
  t(f.ouverte && f.montant && f.poids === 5 && f.panier === '{}', `${nm} : la tuile ouvre la feuille (« pour un montant », ¼ · ½ · 1 · 2 · 5), rien n'est posé avant (${f.art})`);
  await fermer(p);
}

// ── 2) L'APPUI LONG, LA VENTE RAPIDE, LA FAMILLE ────────────────────────
await p.evaluate(() => { artCtx = DB.articles.find(a => a.id === 40); ctxQte(); }); await p.waitForTimeout(150);
let f = await feuille(p);
t(f.ouverte && !f.pave, 'l\'appui long sur le sucre ouvre la feuille, plus le pavé « Combien ? »');
await fermer(p);
await p.evaluate(() => { artCtx = DB.articles.find(a => a.id === 43); ctxQte(); }); await p.waitForTimeout(150);
const pv = await p.evaluate(() => ({ pave: document.getElementById('ov-pave').classList.contains('show'), mode: _pv && _pv.mode }));
t(pv.pave && pv.mode === 'c', 'le riz qui a un SAC : l\'appui long ouvre le pavé des sacs (un sac se compte entier)');
await p.evaluate(() => paveUnite('p')); await p.waitForTimeout(150);
f = await feuille(p);
t(f.ouverte && !f.pave, '« Au kilo » dans le pavé du sac : la feuille des mesures');
await fermer(p);
await p.evaluate(() => venteRapide(40)); await p.waitForTimeout(150);
t((await feuille(p)).ouverte, 'la vente rapide du sucre : la feuille');
await fermer(p);
await p.evaluate(() => venteRapideSorte(44, 2)); await p.waitForTimeout(150);
f = await feuille(p);
t(f.ouverte && f.panier === '{}' && /crue/.test(f.art), `la vente rapide d'une sorte au kilo : la feuille, plus 1 kg d'office (${f.art})`);
await fermer(p);
await p.evaluate(() => { renderProd(DB.articles); document.getElementById('pc-44').scrollIntoView({ block: 'center' }); });
await p.tap('#pc-44 .vtile', { position: { x: 55, y: 80 } }); await p.waitForTimeout(200);
t((await feuille(p)).ouverte, 'la tuile d\'une famille au kilo (sa sorte du moment) : la feuille');
await fermer(p);

// ── 3) LA DOSE HABITUELLE : UNE TOUCHE SUR LA TUILE (choix du patron, 23/11) ─
// Posé la question (23.88 « le riz aussi vite qu'une bouteille » contre « tout comme
// la feuille »), il a tranché : une touche = l'habitude ; le badge « ⚖ » ouvre la feuille.
for (let i = 0; i < 3; i++) await p.evaluate(async () => { panier['40-0'] = 0.5; updatePUI(40); procederPmt(); selPmntVente('especes'); await encaisser(); fermerSucces(); });
await p.evaluate(() => { renderProd(DB.articles); document.getElementById('pc-40').scrollIntoView({ block: 'center' }); });
await p.tap('#pc-40'); await p.waitForTimeout(200);
f = await feuille(p);
t(!f.ouverte && await p.evaluate(() => panier['40-0'] === 0.5), 'après trois ventes de 0,5 kg : une touche sur la tuile vend 0,5 kg, aussi vite qu\'une bouteille');
await p.evaluate(() => changerQteMesure(DB.articles.find(a => a.id === 40))); await p.waitForTimeout(150);
const hab = await p.evaluate(() => (document.querySelector('#qte-hab .qte-h') || {}).textContent || '');
t((await feuille(p)).ouverte && /0,5\s?kg/.test(hab), `le badge « ⚖ » ouvre la feuille, l'habitude en premier (« ${hab.trim()} »)`);
await fermer(p);

// ── 4) LE PANIER : + ET − D'UNE LIGNE AU LITRE ──────────────────────────
const pan = await p.evaluate(() => { panier['41-0'] = 1.5; updatePUI(41); ouvrirPanier(); chgQLot('41-0', 1);
  return { ouverte: document.getElementById('ov-qte').classList.contains('show'), rempl: (document.querySelector('#qte-hab .qte-rempl') || {}).textContent || '', q: panier['41-0'] }; });
t(pan.ouverte && pan.q === 1.5 && /1,5\s?L/.test(pan.rempl), `« + » sur la ligne de 1,5 L : la feuille, en « remplacer » (« ${pan.rempl.trim()} »), plus UN litre d'office`);
await fermer(p);
t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();

// ── 5) LA CONFIGURATION : L'ÉTAGÈRE CRÉE AU KILO ET AU LITRE ────────────
{
  const d = nouvelleBoutique({ articles: [], clients: [] }); d.cfg.venteDeverrouillee = true;
  const { ctx, p } = await ouvrirCaisse(b, port, d, { tactile: true });
  const r = await p.evaluate(() => { const L = (_ETAGERE[_rayonCourant()] || _ETAGERE.boutique), o = {};
    for (const nm of ['Riz', 'Sucre', 'Huile', 'Lait']) { const i = L.findIndex(x => x[0] === nm); if (i >= 0) { etagereChoisir(i); const a = DB.articles.find(x => x.nm === nm); o[nm] = a && (a.um || null); } }
    document.querySelectorAll('.ov.show').forEach(x => x.classList.remove('show')); return o; });
  t(r.Riz === 'kg' && r.Sucre === 'kg' && r.Huile === 'L', `l'étagère crée Riz et Sucre au kilo, Huile au litre, comme elle l'annonce (${JSON.stringify(r)})`);
  t(r.Lait === null, '« Lait · le sachet » reste à la pièce');
  await p.evaluate(() => { renderProd(DB.articles); const a = DB.articles.find(x => x.nm === 'Riz'); document.getElementById('pc-' + a.id).scrollIntoView({ block: 'center' }); });
  const id = await p.evaluate(() => DB.articles.find(x => x.nm === 'Riz').id);
  await p.tap('#pc-' + id); await p.waitForTimeout(200);
  t((await feuille(p)).ouverte, 'et le riz de l\'étagère se vend par la feuille');
  await ctx.close();
}

// ── 6) CEUX QUI EXISTENT DÉJÀ : REPRIS SANS RIEN CASSER ────────────────
{
  const d = nouvelleBoutique();
  d.articles = d.articles.filter(a => a.id !== 2);   // un seul « Riz » par boutique, comme l'app le veut
  // Données anciennes simulées : des articles créés par l'étagère avant la 24.08 (son journal le dit).
  d.articles.push(A(60, 'Riz', 600, 50), A(61, 'Huile', 1300, 50), A(62, 'Riz', 15000, 20, { id: 62 }), A(63, 'Sucre', 800, 50, { um: 'pc' }));
  d.articles[d.articles.length - 2].nm = 'Riz';
  d.journal = [{ id: 'j1', act: 'creation', art: 'Riz', ap: 'créé depuis l\'étagère · 600 F' }, { id: 'j2', act: 'creation', art: 'Huile', ap: 'créé depuis l\'étagère · 1 300 F' },
               { id: 'j3', act: 'creation', art: 'Sucre', ap: 'créé depuis l\'étagère · 800 F' }];
  const { ctx, p } = await ouvrirCaisse(b, port, d);
  const r = await p.evaluate(() => Object.fromEntries([60, 61, 62, 63].map(id => [id, (DB.articles.find(a => a.id === id) || {}).um || null])));
  t(r[60] === 'kg' && r[61] === 'L', `le Riz et l'Huile créés par l'étagère passent au kilo et au litre (${r[60]}, ${r[61]})`);
  t(r[62] === null, 'un « Riz » à 15 000 (un sac) ne bouge pas');
  t(r[63] === 'pc', 'un « Sucre » qu\'il a réglé « à la pièce » ne bouge pas');
  const idem = await p.evaluate(() => JSON.stringify(migrateDBData(JSON.parse(JSON.stringify(DB))).articles.map(a => a.um || null)) === JSON.stringify(DB.articles.map(a => a.um || null)));
  t(idem, 'relire la boutique deux fois ne change rien de plus');
  await ctx.close();
}

// Une boutique sans journal d'étagère : son « Riz » fait à la main peut être un paquet vendu à la pièce.
{
  const { ctx, p } = await ouvrirCaisse(b, port, nouvelleBoutique());
  t(await p.evaluate(() => !(DB.articles.find(a => a.id === 2) || {}).um), 'le « Riz » créé à la main (sans journal d\'étagère) ne bouge pas : il peut être un paquet vendu à la pièce');
  await ctx.close();
}

await b.close(); s.close();
fin();
