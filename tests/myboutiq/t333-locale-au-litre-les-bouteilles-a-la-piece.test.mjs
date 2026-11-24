// t333 — LOCALE AU LITRE, LES BOUTEILLES À LA PIÈCE (24.16).
// Le patron, le 24/11, ses captures de la famille « Huile » : Locale (l'huile
// en vrac) se vend au litre — « les plus bons », sa feuille « 900 F / L » —
// mais Diamaor et Mayor sont des bouteilles. Une famille n'a qu'une unité : sa
// famille entière était passée au litre. La feuille de la pièce et du carton
// laisse UNE sorte se vendre autrement : elle sort de la famille (le geste ↗),
// avec sa photo, son prix et son stock. Sa boutique telle qu'elle est.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t333');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique({ articles: [] }); d.cfg.venteDeverrouillee = true; d.cfg.facon = 'gros';
d.articles = [
  { id: 5, nm: 'Huile', e: '', cat: 'Alimentation', px: 1200, pa: 0, stk0: 0, al: 0, um: 'L', umSac: 15, umCont: 'carton', vr: [
    { id: 1, nm: 'Diamaor', px: 1500, pa: 1300, stk0: 30, qBase: 1, umSac: 15, umCont: 'bidon', pxGros: 21000 },
    { id: 2, nm: 'Mayor', px: 1100, pa: 714.29, stk0: 28, qBase: 1, umSac: 14, umCont: 'carton', pxGros: 20300 },
    { id: 3, nm: 'Locale', px: 900, pa: 600, stk0: 20, qBase: 1, img: '/icon-192.png' }] }];
const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });
await p.setViewportSize({ width: 360, height: 760 });
const ouvrir = async (a, v) => { await p.evaluate(() => document.querySelectorAll('.ov.show').forEach(o => o.classList.toggle('show', false))); await p.evaluate(([a, v]) => ouvrirPieceCarton(a, v), [a, v]); await p.waitForTimeout(250); };

// ── 1) « SEULEMENT LOCALE SE VEND AUTREMENT » ───────────────────────────
await ouvrir(5, 3);
const l0 = await p.evaluate(() => (document.querySelector('#pc-cont .pcf-sans') || {}).textContent || '');
t(/Seulement « Locale » se vend autrement/.test(l0), `la feuille de Locale propose : « ${l0.trim()} »`);
await p.tap('#pc-cont .pcf-sans'); await p.waitForTimeout(150);
await p.tap('#pc-cont [data-seule="L"]'); await p.waitForTimeout(150);
const note = await p.evaluate(() => [...document.querySelectorAll('#pc-cont .pcf-note')].map(x => x.textContent).join(' | '));
t(/sort de la famille « Huile »/.test(note) && /photo, son prix et son stock/.test(note), 'elle dit ce qui va se passer : Locale sort de la famille, avec sa photo, son prix et son stock');
await p.tap('#pc-ok'); await p.waitForTimeout(350);
const r1 = await p.evaluate(() => { const h = DB.articles.find(a => a.id === 5), l = DB.articles.find(a => /Locale/.test(a.nm) && a.id !== 5);
  return { sortes: h.vr.map(v => v.nm).join(','), um: h.um, l: l && { nm: l.nm, um: l.um, px: l.px, stk: l.stk, img: l.img, sac: l.umSac || null } }; });
t(r1.l && r1.l.nm === 'Huile Locale' && r1.l.um === 'L' && r1.l.px === 900 && r1.l.stk === 20 && /icon-192/.test(r1.l.img), `« ${r1.l && r1.l.nm} » : au litre, 900 F, 20 en stock, sa photo`);
t(r1.l && r1.l.sac === null, 'elle n\'emporte pas le « carton de 15 » de la famille (il ne la concernait pas)');
t(r1.sortes === 'Diamaor,Mayor' && r1.um === 'L', `la famille garde Diamaor et Mayor, et son unité ne bouge pas encore (${r1.um})`);

// ── 2) LA FAMILLE DES BOUTEILLES REPASSE À LA PIÈCE ─────────────────────
await ouvrir(5, 1);
await p.tap('#pc-cont [data-mesure=""]'); await p.tap('#pc-ok'); await p.waitForTimeout(300);
const r2 = await p.evaluate(() => { const h = DB.articles.find(a => a.id === 5); return { um: h.um, g: h.vr.map(v => v.pxGros).join('/') }; });
t(r2.um === 'pc' && r2.g === '21000/20300', `« 1 pièce » : Diamaor et Mayor se vendent à la bouteille, leurs cartons intacts (${r2.g})`);

// ── 3) À LA VENTE : LE LITRE ET LA BOUTEILLE ────────────────────────────
await p.evaluate(() => { document.querySelectorAll('.ov.show').forEach(o => o.classList.toggle('show', false)); DB.cfg.venteDeverrouillee = false; save(); renderProd(DB.articles); });
const lid = await p.evaluate(() => DB.articles.find(a => /Locale/.test(a.nm) && a.id !== 5).id);
await p.evaluate(id => document.getElementById('pc-' + id).scrollIntoView({ block: 'center' }), lid); await p.waitForTimeout(150);
await p.tap('#pc-' + lid); await p.waitForTimeout(250);
const fl = await p.evaluate(() => ({ ouverte: document.getElementById('ov-qte').classList.contains('show'), tit: document.getElementById('qte-tit').textContent }));
t(fl.ouverte && /en L/.test(fl.tit), `Huile Locale ouvre la feuille des mesures (« ${fl.tit} »), comme le sucre`);
await p.evaluate(() => { document.querySelectorAll('.ov.show').forEach(o => o.classList.toggle('show', false)); viderPanier(); varQtys = {}; ouvrirVar(DB.articles.find(a => a.id === 5)); }); await p.waitForTimeout(300);
await p.tap('#var-lst .vtile >> nth=0', { position: { x: 60, y: 60 } }); await p.waitForTimeout(250);
t(await p.evaluate(() => ((varQtys[1] || 0) === 1 || panier['5-1'] === 1) && !document.getElementById('ov-qte').classList.contains('show')), 'Diamaor, touchée : une bouteille au panier, sans feuille des litres');

// ── 4) ↗ DE LA FICHE GARDE MAINTENANT LE PRIX DU CARTON ─────────────────
await p.evaluate(() => { document.querySelectorAll('.ov.show').forEach(o => o.classList.toggle('show', false)); viderPanier(); varQtys = {}; DB.cfg.venteDeverrouillee = true; ouvrirCompleterArticle(DB.articles.find(a => a.id === 5)); window.confirm = () => true; cmpDetachVar(2); });
await p.waitForTimeout(250);
const m = await p.evaluate(() => { const x = DB.articles.find(a => a.nm === 'Mayor'); return x ? { g: x.pxGros, n: x.umSac } : null; });
t(m && m.g === 20300 && m.n === 14, `Mayor sortie par ↗ garde son carton de 14 à 20 300 F (${JSON.stringify(m)}) — elle le perdait`);

t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
