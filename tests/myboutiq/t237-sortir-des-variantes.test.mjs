// t237 — « QUAND J'ENTRE DANS LES ARTICLES VARIANTES ET QUE JE VEUX SORTIR,
// SI ON TOUCHE EN DEHORS DE LA VARIANTE POUR SORTIR, ÇA SÉLECTIONNE
// N'IMPORTE QUEL ARTICLE OÙ ON TOUCHE » (23.18).
// Le panneau se refermait dès que le doigt se posait (pointerdown) ; le voile
// parti, le « clic » qui suit tombait sur la tuile d'en dessous et l'ajoutait
// au panier. Rejoué ici avec un vrai toucher, aux trois présentations.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t237');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
d.articles.unshift({ id: 40, nm: 'Jus Top', e: '🥤', cat: 'Divers', px: 0, pa: 0, stk0: 0, al: 0, vd: 0,
  vr: ['Ananas', 'Orange', 'Cocktail'].map((n, i) => ({ id: i + 1, nm: n, px: 400, pa: 300, stk0: 24, qBase: 1 })) });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });
await p.waitForTimeout(500);
const centre = (sel) => p.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
for (const style of ['carre', 'cercle', 'liste']) {
  await p.evaluate(st => { DB.cfg.varStyle = st; viderPanier(); }, style);
  // Il touche la famille : les variantes sortent.
  const fam = await p.evaluate(() => { const c = Array.from(document.querySelectorAll('#grid-c .pcard, .pcard')).find(x => /Jus Top/.test(x.textContent)); c.id = 'carte-jus'; return !!c; });
  await p.locator('#carte-jus').tap(); await p.waitForTimeout(400);
  const ouvert = await p.evaluate(() => document.body.classList.contains('var-ouvert'));
  // Puis il touche AILLEURS pour sortir — pile sur la tuile « Riz ».
  await p.evaluate(() => { const c = Array.from(document.querySelectorAll('.pcard')).find(x => /Riz/.test(x.textContent) && !/Jus/.test(x.textContent)); c.id = 'carte-riz'; });
  // Le doigt se pose sur Riz ; en cercle, sur un coin de Riz que les
  // variantes ne couvrent pas (sinon c'est une variante qu'il touche, voulue).
  const r = await p.evaluate(() => { const c = document.getElementById('carte-riz').getBoundingClientRect();
    const pts = [[.5, .85], [.15, .9], [.85, .9], [.5, .5], [.15, .15], [.85, .15]].map(([fx, fy]) => ({ x: c.left + c.width * fx, y: c.top + c.height * fy }));
    const v = pts.find(pt => { const e = document.elementFromPoint(pt.x, pt.y); return e && !e.closest('.vinline, .vsat, .vcircle, .vstyl-chip'); }); return v || pts[0]; });
  await p.touchscreen.tap(r.x, r.y); await p.waitForTimeout(500);
  const apres = await p.evaluate(() => ({ ferme: !document.body.classList.contains('var-ouvert'), panier: JSON.stringify(panier), neg: !!document.querySelector('.ov.show') }));
  t(ouvert && apres.ferme && apres.panier === '{}' && !apres.neg, `présentation « ${style} » : toucher dehors referme, et n'ajoute RIEN (panier ${apres.panier})`);
  // Le toucher suivant, lui, vend normalement.
  await p.touchscreen.tap(r.x, r.y); await p.waitForTimeout(300);
  t(await p.evaluate(() => panier['2-0'] === 1), `… et le toucher d'après sur Riz l'ajoute, comme d'habitude`);
  await p.evaluate(() => viderPanier());
}
// Choisir une variante, lui, marche toujours.
await p.evaluate(() => { DB.cfg.varStyle = 'carre'; viderPanier(); Array.from(document.querySelectorAll('.pcard')).find(x => /Jus Top/.test(x.textContent)).id = 'carte-jus'; });
await p.locator('#carte-jus').tap(); await p.waitForTimeout(400);
await p.locator('.vinline .vtile').first().tap(); await p.waitForTimeout(300);
t(await p.evaluate(() => Object.keys(panier).some(k => /^40-/.test(k) && panier[k] === 1)), `toucher une variante l'ajoute (${await p.evaluate(() => JSON.stringify(panier))})`);
// Le panier reste touchable par-dessus le voile : le toucher l'ouvre.
const fc = await p.evaluate(() => { const f = document.querySelector('.fcart'); if (!f || getComputedStyle(f).display === 'none') return null; const r = f.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
if (fc) { await p.touchscreen.tap(fc.x, fc.y); await p.waitForTimeout(400); }
t(!!fc && await p.evaluate(() => !!document.querySelector('#ov-pan.show')), 'toucher le panier pendant le choix : le panneau se ferme ET le panier s\'ouvre');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
