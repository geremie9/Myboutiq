// t260 — « Mes étagères » (23.42). « Il faut que le vendeur se voie un peu
// dans ses étagères. » Les tuiles étaient des cases blanches : l'article se
// pose sur une planche, l'étiquette du prix dessous, le prix avant le nom.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t260');
const { s, port } = await serveur();
const b = await chromium.launch();
const db = nouvelleBoutique(); db.cfg.facon = 'detail';
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(400);
const m = await p.evaluate(() => {
  const c = document.getElementById('pc-2'), cs = getComputedStyle(c), ov = c.querySelector('.pcard-overlay');
  const px = c.querySelector('.ppr-ov').getBoundingClientRect(), nm = c.querySelector('.pnm-ov').getBoundingClientRect(), med = c.querySelector('.pmedia').getBoundingClientRect();
  const v = document.getElementById('pc-1').getBoundingClientRect(), w = document.getElementById('pc-2').getBoundingClientRect();
  return { planche: /gradient/.test(cs.backgroundImage), bord: cs.borderTopWidth, etiq: getComputedStyle(ov).backgroundColor, prixAvant: px.top < nm.top, prixT: parseFloat(getComputedStyle(c.querySelector('.ppr-ov')).fontSize), nomT: parseFloat(getComputedStyle(c.querySelector('.pnm-ov')).fontSize),
    nomSurPhoto: nm.bottom <= med.bottom + 1 && nm.top >= med.top, photoH: Math.round(med.height),
    sousPlanche: ov.getBoundingClientRect().top > med.bottom + 6, continu: Math.abs(v.right - w.left) < 1, etg: (() => { const e = document.querySelector('#pgrid .pcard.etg'); return e ? /gradient/.test(getComputedStyle(e).backgroundImage) : false; })() };
});
t(m.planche && m.bord === '0px' && m.continu, 'les articles sont posés sur une planche, continue d\'un article à l\'autre');
t(m.sousPlanche && m.etiq === 'rgb(255, 255, 255)', 'l\'étiquette du prix est sous la planche, comme sur un rayon');
t(m.nomSurPhoto && m.photoH >= 78 && m.prixT > m.nomT, `la photo prend la tuile (${m.photoH} px de haut), le nom est posé dessus, le prix en plus gros (${m.prixT} px / ${m.nomT} px)`);
t(!m.etg, 'les cartes « Tu vends aussi » ne sont pas sur ses étagères');
// Toucher vend toujours, et l'article choisi se voit.
await p.locator('#pc-2').tap(); await p.waitForTimeout(250);
const sel = await p.evaluate(() => ({ q: panier['2-0'], out: getComputedStyle(document.querySelector('#pc-2 .pmedia')).outlineStyle }));
t(sel.q === 1 && sel.out === 'solid', 'toucher ajoute toujours au panier, et l\'article choisi est cerclé');
// Chez un grossiste : la seconde étiquette, celle du carton.
const g = await p.evaluate(() => { viderPanier(); DB.cfg.facon = 'gros'; renderProd(DB.articles); const c = document.getElementById('pc-6'), med = c.querySelector('.pmedia').getBoundingClientRect(), bar = c.querySelector('.pbarre'), h1 = Math.round(c.getBoundingClientRect().height), h2 = Math.round(document.getElementById('pc-2').getBoundingClientRect().height); if (!bar) return null; const r = bar.getBoundingClientRect(); return { sur: r.top >= med.top && r.bottom <= med.bottom, txt: bar.textContent.replace(/\s+/g, ' ').trim(), h1, h2 }; });
t(g && g.sur && /13\s?000/.test(g.txt) && g.h1 === g.h2, `le gros est une pastille sur la photo (« ${g && g.txt} »), et la tuile garde la même hauteur avec ou sans gros (${g && g.h1} px)`);
// Toucher la pastille vend le carton, pas la pièce.
await p.locator('#pc-6 .pbarre').tap(); await p.waitForTimeout(350);
const vg = await p.evaluate(() => ({ q: panier['6-0'], tot: calcTotal() }));
t(vg.q === 24 && vg.tot === 13000, `toucher la pastille vend le carton : 24 pièces, ${vg.tot} F`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
