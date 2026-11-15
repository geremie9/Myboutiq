// t284 — « PENDANT LA MODIFICATION, APRÈS AVOIR CLIQUÉ SUR UN ÉLÉMENT DE
// VARIANTES, LA VARIANTE SE REFERME SANS QUE TU N'AIES FINI. » (23.65)
// Rejoué avec un vrai toucher : il ouvre la famille, reste appuyé sur une
// variante, touche « Renommer » dans le menu — et le panneau des variantes
// disparaissait au doigt posé : le menu est HORS du panneau, donc « toucher
// à côté » pour `_varDehors`. Seule « Saisir une quantité » était épargnée.
// Il finissait sa modification sur la caisse, plus sur ses variantes.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t284');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
d.articles.unshift({ id: 40, nm: 'Jus Top', e: '🥤', cat: 'Divers', px: 0, pa: 0, stk0: 0, al: 0, vd: 0,
  vr: ['Ananas', 'Orange', 'Cocktail'].map((n, i) => ({ id: i + 1, nm: n, px: 400, pa: 300, stk0: 24, qBase: 1 })) });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });
await p.waitForTimeout(500);
const ouvert = () => p.evaluate(() => document.body.classList.contains('var-ouvert'));
const tuiles = () => p.evaluate(() => Array.from(document.querySelectorAll('.vinline .vtile, .vcircle .vsat, .vsat')).map(x => x.innerText.replace(/\s+/g, ' ').trim()).join(' | '));
async function ouvrirFamille() {
  await p.evaluate(() => { viderPanier(); Array.from(document.querySelectorAll('.pcard')).find(x => /Jus Top/.test(x.textContent)).id = 'carte-jus'; });
  await p.locator('#carte-jus').tap(); await p.waitForTimeout(400);
}
// Il reste appuyé sur « Orange » : le menu de la variante.
async function menuSur(nom) {
  await p.evaluate(nom => { const el = Array.from(document.querySelectorAll('.vinline .vtile, .vsat')).find(x => x.textContent.indexOf(nom) >= 0);
    const r = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 10, clientY: r.top + 10 })); }, nom);
  await p.waitForTimeout(250);
}
const toucher = async sel => { const r = await p.evaluate(sel => { const e = document.querySelector(sel); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, sel); await p.touchscreen.tap(r.x, r.y); await p.waitForTimeout(350); };

for (const style of ['carre', 'cercle']) {
  await p.evaluate(st => { DB.cfg.varStyle = st; }, style);
  await ouvrirFamille();
  const o0 = await ouvert();
  await menuSur(style === 'carre' ? 'Orange' : 'Ananas');
  const menu = await p.evaluate(() => document.getElementById('ctxmv').classList.contains('show'));
  // « Renommer »
  await toucher('#ctxmv [onclick="ctxvNom()"]');
  const o1 = await ouvert(), renom = await p.evaluate(() => document.getElementById('ov-renom').classList.contains('show'));
  t(o0 && menu && renom && o1, `« ${style} » : il touche « Renommer » dans le menu d'une variante — ses variantes restent ouvertes derrière (panneau ${o1}, menu ${menu}, renommer ${renom})`);
  const nv = style === 'carre' ? 'Orange pressée' : 'Ananas frais';
  await p.locator('#rn-inp').fill(nv);
  await toucher('#rn-ok');
  const o2 = await ouvert(), tt = await tuiles();
  t(o2 && tt.indexOf(nv) >= 0, `… il enregistre : il est toujours sur ses variantes, et le nouveau nom y est (« ${tt} »)`);
  // Le prix de vente (boîte du navigateur) : pareil.
  await menuSur(nv);
  p.once('dialog', dl => dl.accept('450'));
  await toucher('#ctxmv [onclick="ctxvPrix()"]');
  await p.waitForTimeout(300);
  const o3 = await ouvert(), t3 = await tuiles();
  t(o3 && /450/.test(t3), `… « Modifier le prix » : toujours ouvert, et le 450 se lit sur la tuile (« ${t3} »)`);
  // Et toucher VRAIMENT à côté referme toujours (t237).
  await p.evaluate(() => { const c = Array.from(document.querySelectorAll('.pcard')).find(x => /Riz/.test(x.textContent) && !/Jus/.test(x.textContent)); c.id = 'carte-riz'; });
  const r = await p.evaluate(() => { const c = document.getElementById('carte-riz').getBoundingClientRect();
    const pts = [[.5, .85], [.15, .9], [.85, .9], [.5, .5], [.15, .15], [.85, .15]].map(([fx, fy]) => ({ x: c.left + c.width * fx, y: c.top + c.height * fy }));
    return pts.find(pt => { const e = document.elementFromPoint(pt.x, pt.y); return e && !e.closest('.vinline, .vsat, .vcircle, .vstyl-chip'); }) || pts[0]; });
  await p.touchscreen.tap(r.x, r.y); await p.waitForTimeout(400);
  t(!(await ouvert()) && await p.evaluate(() => JSON.stringify(panier) === '{}'), `… et toucher à côté, une fois fini, referme sans rien vendre`);
}
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
