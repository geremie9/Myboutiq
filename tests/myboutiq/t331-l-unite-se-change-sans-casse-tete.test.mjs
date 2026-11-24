// t331 — L'UNITÉ SE CHANGE SANS CASSE-TÊTE (24.14).
// Le patron, le 24/11 : « tous les articles en kg doivent s'harmoniser, en
// litres aussi, et si je me trompe je peux revenir remettre mon article en kg
// ou en litres sans casse-tête ». Mesuré dans sa boutique : sa famille
// « Huile » (des bouteilles) est passée « au litre » à 16:57 ; la feuille de la
// pièce et du carton ne posait la question qu'à un article seul. Sa boutique
// reconstruite (mode gros), en vrais clics, sur 360×760.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t331');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique({ articles: [] }); d.cfg.venteDeverrouillee = true; d.cfg.facon = 'gros';
d.articles = [
  { id: 5, nm: 'Huile', e: '', cat: 'Alimentation', px: 1200, pa: 0, stk0: 0, al: 0, um: 'L', umSac: 15, umCont: 'carton', vr: [{ id: 1, nm: 'Diamaor', px: 1500, pa: 1300, stk0: 40, qBase: 1, umSac: 15, umCont: 'bidon', pxGros: 1400 }, { id: 2, nm: 'Mayor', px: 1100, pa: 900, stk0: 29, qBase: 1, umSac: 14, umCont: 'carton', pxGros: 1450 }] },
  { id: 2, nm: 'Riz', e: '', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, um: 'kg', umSac: 50, vr: [{ id: 1, nm: 'Riz (kg)', px: 800, pa: 600, stk0: 200, qBase: 1 }, { id: 2, nm: 'RIZ', px: 500, pa: 400, stk0: 200, qBase: 1 }] }];
const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });
await p.setViewportSize({ width: 360, height: 760 });
const etat = () => p.evaluate(() => { const h = DB.articles.find(a => a.id === 5); return { um: h.um, px: h.vr.map(v => v.px).join('/'), stk: h.vr.map(v => v.stk).join('/'), gros: h.vr.map(v => v.pxGros).join('/') }; });
const feuilleSorte = async (pid, vid) => { await p.evaluate(() => document.querySelectorAll('.ov.show').forEach(o => o.classList.toggle('show', false))); await p.evaluate(([a, v]) => ouvrirPieceCarton(a, v), [pid, vid]); await p.waitForTimeout(250); };
const e0 = await etat();

// ── 1) LA FAMILLE PASSÉE AU LITRE PAR ERREUR : LA SORTE LE DIT ───────────
await p.evaluate(() => ouvrirVar(DB.articles.find(a => a.id === 5))); await p.waitForTimeout(350);
await p.tap('#var-lst .vtile [data-grosv="1"]'); await p.waitForTimeout(450);
const f = await p.evaluate(() => ({ q: [...document.querySelectorAll('#pc-cont .pcf-q')].map(x => x.textContent)[0], on: (document.querySelector('#pc-cont [data-mesure].on') || {}).getAttribute('data-mesure'), note: (document.querySelector('#pc-cont .pcf-note') || {}).textContent || '' }));
t(/Toute la famille « Huile » se vend/.test(f.q) && f.on === 'L', `la sorte Diamaor montre l'unité de SA famille : « ${f.q} » — 1 L choisi`);
t(/prix et le stock ne bougent pas/.test(f.note), `et rassure : « ${f.note} »`);

// ── 2) REMETTRE À LA PIÈCE, EN UNE TOUCHE (et corriger le bidon) ──────────
await p.tap('#pc-cont [data-mesure=""]'); await p.waitForTimeout(150);
await p.tap('#pc-alerte .pcf-b'); await p.waitForTimeout(100);
await p.tap('#pc-ok'); await p.waitForTimeout(300);
const e1 = await etat();
t(e1.um === 'pc' && e1.px === e0.px && e1.stk === e0.stk, `« 1 pièce » : toute la famille repasse à la pièce ; prix (${e1.px}) et stock (${e1.stk}) n'ont pas bougé`);
t(/^21000\//.test(e1.gros), `et le bidon de 15 vaut 21 000 F (${e1.gros})`);
t(await p.evaluate(() => (DB.journal || []).some(j => j.act === 'unite' && j.art === 'Huile' && /litre/.test(j.av) && /pièce/.test(j.ap))), 'le journal garde « litre → pièce »');

// ── 3) ALLER-RETOUR : AU LITRE, PUIS À LA PIÈCE ─────────────────────────
await feuilleSorte(5, 2);
await p.tap('#pc-cont [data-mesure="L"]'); await p.tap('#pc-ok'); await p.waitForTimeout(250);
const e2 = await etat();
await feuilleSorte(5, 2);
await p.tap('#pc-cont [data-mesure=""]'); await p.tap('#pc-ok'); await p.waitForTimeout(250);
const e3 = await etat();
t(e2.um === 'L' && e3.um === 'pc' && e3.px === e0.px && e3.stk === e0.stk, `aller-retour sans casse : ${e1.um} → ${e2.um} → ${e3.um}, prix et stock intacts`);

// ── 4) LE KILO, PAREIL ──────────────────────────────────────────────────
await feuilleSorte(2, 1);
const k = await p.evaluate(() => ({ q: document.querySelector('#pc-cont .pcf-q').textContent, on: (document.querySelector('#pc-cont [data-mesure].on') || {}).getAttribute('data-mesure') }));
t(/Toute la famille « Riz »/.test(k.q) && k.on === 'kg', `le riz : « ${k.q} » — 1 kg choisi`);
await p.tap('#pc-cont [data-mesure=""]'); await p.tap('#pc-ok'); await p.waitForTimeout(250);
await feuilleSorte(2, 1);
await p.tap('#pc-cont [data-mesure="kg"]'); await p.tap('#pc-ok'); await p.waitForTimeout(250);
t(await p.evaluate(() => { const r = DB.articles.find(a => a.id === 2); return r.um === 'kg' && r.umSac === 50 && r.vr[0].px === 800; }), 'le riz va à la pièce et revient au kilo : sac de 50 kg et prix intacts');

// ── 5) À LA VENTE, LE LITRE SE VEND COMME LE KILO ───────────────────────
await p.evaluate(() => { document.querySelectorAll('.ov.show').forEach(o => o.classList.toggle('show', false)); const h = DB.articles.find(a => a.id === 5); h.um = 'L'; DB.cfg.venteDeverrouillee = false; save(); });
const vendre1L = async (id) => { await p.evaluate(id => { document.querySelectorAll('.ov.show').forEach(o => o.classList.toggle('show', false)); renderProd(DB.articles); document.getElementById('pc-' + id).scrollIntoView({ block: 'center' }); }, id); await p.waitForTimeout(200);
  await p.tap('#pc-' + id + ' .vtile', { position: { x: 60, y: 70 } }); await p.waitForTimeout(250);
  if (await p.evaluate(() => document.getElementById('ov-qte').classList.contains('show'))) { await p.tap('#ov-qte .qte-b >> text=1'); await p.waitForTimeout(200); } };
const barre = {};
for (const id of [5, 2]) {
  for (let i = 0; i < 3; i++) { await vendre1L(id); await p.evaluate(async () => { procederPmt(); selPmntVente('especes'); await encaisser(); fermerSucces(); }); }
  await vendre1L(id);
  barre[id] = await p.evaluate(() => [...document.querySelectorAll('#fbil.show .qct-m')].map(x => x.textContent.replace(/\s+/g, ' ').trim()).join(' · '));
  await p.evaluate(() => viderPanier());
}
t(/½ L/.test(barre[5]) && /2 L/.test(barre[5]) && /Autre/.test(barre[5]) && /½ kg/.test(barre[2]) && /Autre/.test(barre[2]), `l'huile au litre et le riz au kilo, même barre : « ${barre[5]} » / « ${barre[2]} »`);

t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
