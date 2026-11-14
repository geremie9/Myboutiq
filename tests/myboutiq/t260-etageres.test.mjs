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
// 23.44 — sa capture avec de vraies photos : « gaspillage d'espace, vraiment
// manque de stratégie ». La planche de 9 px et l'étiquette sur sa ligne sont
// parties : la photo prend toute la tuile, le prix se colle dessus, la
// planche n'est plus qu'un liseré de bois sous la tuile.
const m = await p.evaluate(() => {
  const c = document.getElementById('pc-2'), cs = getComputedStyle(c), px = c.querySelector('.ppr-ov'), pr = px.getBoundingClientRect(), nm = c.querySelector('.pnm-ov').getBoundingClientRect(), med = c.querySelector('.pmedia').getBoundingClientRect(), r = c.getBoundingClientRect();
  const e = document.querySelector('#pgrid .pcard.etg');
  return { fond: cs.backgroundColor, bois: cs.borderBottomWidth + ' ' + cs.borderBottomColor, photoH: Math.round(med.height), photoL: Math.round(med.width), tuileL: Math.round(r.width), tuileH: Math.round(r.height),
    prixSur: pr.top >= med.top && pr.bottom <= med.bottom + 1 && pr.left >= med.left, prixFond: getComputedStyle(px).backgroundColor, prixCoul: getComputedStyle(px).color, prixT: parseFloat(getComputedStyle(px).fontSize), nomT: parseFloat(getComputedStyle(c.querySelector('.pnm-ov')).fontSize),
    nomSous: nm.top >= med.bottom - 1, etg: e ? getComputedStyle(e).borderBottomColor === cs.borderBottomColor && getComputedStyle(e).borderBottomWidth === '4px' : false };
});
t(m.fond === 'rgb(255, 255, 255)' && /^4px rgb\(185, 138, 78\)$/.test(m.bois), `la tuile est blanche, posée sur un liseré de bois (${m.bois})`);
t(m.photoH >= 96 && m.photoL === m.tuileL, `la photo prend toute la tuile : ${m.photoL} × ${m.photoH} px sur une tuile de ${m.tuileL} × ${m.tuileH}`);
t(m.prixSur && m.prixFond === 'rgb(30, 27, 46)' && m.prixCoul === 'rgb(255, 255, 255)' && m.prixT > m.nomT, `le prix est collé sur la photo, blanc sur noir, plus gros que le nom (${m.prixT} px / ${m.nomT} px)`);
t(m.nomSous && m.tuileH <= 120, `le nom est dessous, sur une ligne : la tuile fait ${m.tuileH} px, sans ligne d'étiquette`);
t(!m.etg, 'les cartes « Tu vends aussi » ne sont pas sur ses étagères');
// Toucher vend toujours, et l'article choisi se voit.
await p.locator('#pc-2').tap(); await p.waitForTimeout(250);
const sel = await p.evaluate(() => ({ q: panier['2-0'], out: getComputedStyle(document.querySelector('#pc-2')).outlineStyle }));
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
