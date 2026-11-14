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
// 23.44 — sa capture avec de vraies photos : « gaspillage d'espace ». La photo
// a pris toute la tuile. 23.45 — « que la superposition soit un élément
// marketing, comme si tu es dans ta boutique » : le produit est posé sur la
// planche, devant le mur du rayon, et le prix est sur l'étiquette du bord.
const m = await p.evaluate(() => {
  const c = document.getElementById('pc-2'), cs = getComputedStyle(c), ov = c.querySelector('.pcard-overlay'), os = getComputedStyle(ov), px = c.querySelector('.ppr-ov'), pr = px.getBoundingClientRect(), nmE = c.querySelector('.pnm-ov'), nm = nmE.getBoundingClientRect(), med = c.querySelector('.pmedia'), mr = med.getBoundingClientRect(), r = c.getBoundingClientRect(), or = ov.getBoundingClientRect();
  const v = document.getElementById('pc-1').getBoundingClientRect(), e = document.querySelector('#pgrid .pcard.etg');
  return { mur: /gradient/.test(getComputedStyle(med).backgroundImage), planche: os.backgroundColor, tranche: os.borderTopWidth, continu: Math.abs(v.right - r.left) < 1, photoH: Math.round(mr.height), photoL: Math.round(mr.width), tuileL: Math.round(r.width), tuileH: Math.round(r.height),
    prixSurEtiq: pr.top >= or.top && pr.bottom <= or.bottom && pr.top >= mr.bottom - 1, prixFond: getComputedStyle(px).backgroundColor, prixCoul: getComputedStyle(px).color, prixT: parseFloat(getComputedStyle(px).fontSize), nomT: parseFloat(getComputedStyle(nmE).fontSize),
    nomSous: nm.top >= pr.bottom - 1 && nm.bottom <= or.bottom, etg: e ? /gradient/.test(getComputedStyle(e.querySelector('.pmedia') || e).backgroundImage) && getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0)' : false };
});
t(m.mur && m.planche === 'rgb(168, 120, 60)' && m.tranche === '3px' && m.continu, `l'article est devant le mur du rayon, sur une planche de bois qui court d'un article à l'autre (tranche ${m.tranche})`);
t(m.photoH >= 76 && m.photoL === m.tuileL, `la photo prend toute la largeur : ${m.photoL} × ${m.photoH} px sur une tuile de ${m.tuileL} × ${m.tuileH}`);
t(m.prixSurEtiq && m.prixFond === 'rgb(255, 255, 255)' && m.prixCoul === 'rgb(30, 27, 46)' && m.prixT > m.nomT, `le prix est sur l'étiquette du bord de planche, noir sur blanc, plus gros que le nom (${m.prixT} px / ${m.nomT} px)`);
t(m.nomSous && m.tuileH <= 124, `le nom est sur la même étiquette, dessous : la tuile fait ${m.tuileH} px — pas plus haute qu'avant`);
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
