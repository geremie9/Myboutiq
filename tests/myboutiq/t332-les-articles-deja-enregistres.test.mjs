// t332 — LES ARTICLES DÉJÀ ENREGISTRÉS SE RÉPARENT (24.15).
// Le patron, le 24/11, cinq captures de ses huiles et de son riz : « ceux
// qu'il faut rectifier, ou mettre une bonne formule pour arranger les articles
// déjà enregistrés ». Les siens : « 1 400 F le bidon de 15 », « 1 450 F le
// carton de 14 » (la bouteille est à 1 500 et 1 100) ; et « Ce n'est pas ça »
// de sa fiche ouvrait l'ancienne feuille (« Au litre · un carton = 15 litres
// · 1 400 »). Mesuré en base : 2 cartons sur 18 qui ont un prix, tous deux
// chez lui. Sa boutique telle qu'elle est (données anciennes simulées).
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t332');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique({ articles: [] }); d.cfg.venteDeverrouillee = true; d.cfg.facon = 'gros';
d.articles = [
  { id: 5, nm: 'Huile', e: '', cat: 'Alimentation', px: 1200, pa: 0, stk0: 0, al: 0, um: 'L', umSac: 15, umCont: 'carton', vr: [
    { id: 1, nm: 'Diamaor', px: 1500, pa: 4, stk0: 3, qBase: 1, umSac: 15, umCont: 'bidon', pxGros: 1400 },
    { id: 2, nm: 'Mayor', px: 1100, pa: 714.29, stk0: 28, qBase: 1, umSac: 14, umCont: 'carton', pxGros: 1450 },
    { id: 3, nm: 'Locale', px: 900, pa: 600, stk0: 20, qBase: 1 }] },
  { id: 17, nm: 'Diamaor', e: '', cat: 'Alimentation', px: 1350, pa: 1100, stk0: 96, al: 0, umSac: 24, umCont: 'carton', pxGros: 15000 },
  { id: 18, nm: 'Savon promo', e: '', cat: 'Hygiène', px: 300, pa: 200, stk0: 50, al: 0, umSac: 2, umCont: 'lot', pxGros: 400 }];
const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });
await p.setViewportSize({ width: 360, height: 760 });

// ── 1) À LA LECTURE, LES CARTONS AU PRIX D'UNE PIÈCE SE RÉPARENT ─────────
const r = await p.evaluate(() => { const h = DB.articles.find(a => a.id === 5); return { d: h.vr[0].pxGros, m: h.vr[1].pxGros, seul: DB.articles.find(a => a.id === 17).pxGros, lot: DB.articles.find(a => a.id === 18).pxGros,
  j: (DB.journal || []).filter(j => /^repar-carton-/.test(j.id)).map(j => j.art + ' : ' + j.av + ' → ' + j.ap) }; });
t(r.d === 21000 && r.m === 20300, `Diamaor : 1 400 × 15 = ${r.d} F ; Mayor : 1 450 × 14 = ${r.m} F`);
t(r.seul === 15000 && r.lot === 400, `un vrai carton (15 000 pour 24 à 1 350) et un lot de 2 à 400 ne bougent pas (${r.seul}, ${r.lot})`);
t(r.j.length === 2 && /Diamaor \(bidon de 15\) : 1400 F → 21000 F/.test(r.j.join(' | ')), `le journal le dit : ${r.j.join(' | ')}`);
const re = await p.evaluate(() => { const av = JSON.stringify(DB.articles), nj = DB.journal.length; DB = migrateDBData(DB); DB = migrateDBData(JSON.parse(JSON.stringify(DB))); return JSON.stringify(DB.articles) === av && DB.journal.length === nj; });
t(re, 'relire la boutique deux fois ne change plus rien, et le journal ne se répète pas');
// Un autre téléphone, resté sur l'ancienne version, renvoie 1 400 : réparé à nouveau, sans nouvelle ligne.
const sync = await p.evaluate(() => { const nj = DB.journal.length; const x = JSON.parse(JSON.stringify(DB)); x.articles.find(a => a.id === 5).vr[0].pxGros = 1400; DB = migrateDBData(mergeDB(x, DB)); return { px: DB.articles.find(a => a.id === 5).vr[0].pxGros, j: DB.journal.length - nj }; });
t(sync.px === 21000 && sync.j === 0, `un vieux téléphone renvoie 1 400 : réparé à ${sync.px}, sans répéter le journal`);

// ── 2) « CE N'EST PAS ÇA » DE LA FICHE : LA MÊME FEUILLE QUE LA TUILE ───
await p.evaluate(() => ouvrirCompleterArticle(DB.articles.find(a => a.id === 5))); await p.waitForTimeout(350);
await p.evaluate(() => cmpVarCond(2)); await p.waitForTimeout(300);
const f = await p.evaluate(() => ({ pc: document.getElementById('ov-pc').classList.contains('show'), ancien: document.getElementById('ov-cond').classList.contains('show'),
  unite: document.querySelectorAll('#pc-cont [data-mesure]').length, taille: document.querySelectorAll('#pc-cont [data-taille]').length, px: document.getElementById('pc-px').value, n: (document.querySelector('#pc-cont .pcf-b.on[onclick^="pcNb("]') || {}).textContent || document.getElementById('pc-n').value }));
t(f.pc && !f.ancien, '« Ce n\'est pas ça » ouvre la feuille de la pièce et du carton, plus l\'ancienne');
t(f.unite === 0 && f.taille === 0, 'depuis la fiche, la feuille ne montre ni l\'unité ni la taille : la fiche les garde (elle les réécrirait)');
t(f.px === '20300' && f.n === '14', `elle montre le carton de Mayor, réparé : ${f.n} à ${f.px} F`);
await p.fill('#pc-px', '19500'); await p.tap('#pc-ok'); await p.waitForTimeout(300);
const fx = await p.evaluate(() => ({ px: DB.articles.find(a => a.id === 5).vr[1].pxGros, fiche: document.getElementById('ov-cmp') ? document.getElementById('ov-cmp').classList.contains('show') : null, ligne: ((document.querySelector('#cmp-vars [data-cvid="2"]') || {}).closest ? '' : '') }));
t(fx.px === 19500, `enregistré depuis la fiche : le carton de Mayor à ${fx.px} F`);

t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
