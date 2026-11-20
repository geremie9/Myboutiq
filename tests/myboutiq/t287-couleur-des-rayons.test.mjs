// t287 — LA COULEUR DU RAYON, POUR S'Y RETROUVER D'UN COUP D'ŒIL (23.68).
// Le patron, le 15/11 : « on essaie de voir la couleur dans l'ensemble pour
// différencier facilement les articles, des couleurs en liaison avec
// MyBoutiQ qui permettent de facilement naviguer dans les articles ».
// Avant : toutes les étiquettes blanches, la couleur du rayon n'existait que
// sur la vignette d'un article SANS photo et sur le petit dessin de l'onglet.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutiqueCarres, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t287');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutiqueCarres(); d.cfg.facon = 'detail';
const A = (id, nm, cat, px, x = {}) => Object.assign({ id, nm, cat, e: '📦', px, pa: Math.round(px * .8), stk0: 40, al: 0, vd: 0 }, x);
d.articles = [A(1, 'Riz', 'Alimentation', 700), A(2, 'Huile', 'Alimentation', 1300), A(3, 'Bière locale', 'Boissons', 600), A(4, 'Top ananas', 'Boissons', 400),
  A(5, 'Bougie', 'Ménage', 200), A(6, 'Agrafeuse', 'Autre', 40), A(7, 'Savon', 'Hygiène', 250), A(8, 'Chargeur', 'Électronique', 1500),
  A(9, 'Jus Top', 'Boissons', 0, { vr: [{ id: 1, nm: 'Ananas', px: 400, pa: 300, stk0: 10, qBase: 1 }, { id: 2, nm: 'Orange', px: 400, pa: 300, stk0: 10, qBase: 1 }] })];
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
await p.setViewportSize({ width: 360, height: 800 }); await p.waitForTimeout(600);
const lum = `const lum=c=>{const m=c.match(/[\\d.]+/g).map(Number).slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*m[0]+.7152*m[1]+.0722*m[2];};const ratio=(a,b)=>{const x=lum(a),y=lum(b);return Math.round((Math.max(x,y)+.05)/(Math.min(x,y)+.05)*10)/10;};`;
const tu = await p.evaluate(new Function(lum + `return Array.from(document.querySelectorAll('#pgrid .pcard[data-ray]')).map(c=>{const n=c.querySelector('.pnm-ov'),cs=getComputedStyle(n);return {nm:n.textContent.trim(),bg:cs.backgroundColor,r:ratio(cs.color,cs.backgroundColor)};});`));
const coul = nm => (tu.find(x => x.nm === nm) || {}).bg;
t(coul('Riz') === coul('Huile') && coul('Bière locale') === coul('Top ananas'), `les articles d'un même rayon ont la même couleur (Riz ${coul('Riz')} = Huile ; Bière = Top ananas ${coul('Bière locale')})`);
const diff = new Set(['Riz', 'Bière locale', 'Bougie', 'Agrafeuse', 'Savon', 'Chargeur'].map(coul));
t(diff.size === 6 && !diff.has('rgb(255, 255, 255)'), `six rayons, six couleurs franches — plus d'étiquette blanche pour tous (${[...diff].join(' · ')})`);
t(coul('Riz') === 'rgb(240, 169, 62)', `l'alimentation porte l'ambre de MyBoutiQ (${coul('Riz')})`);
t(tu.every(x => x.r >= 4.5), `chaque nom reste lisible sur sa couleur (contraste mini ${Math.min(...tu.map(x => x.r))} ${tu.filter(x => x.r < 4.5).map(x => x.nm).join(',')})`);
// L'onglet du rayon : bordé de sa couleur, plein quand il est choisi — et il reste sous les yeux.
const on = await p.evaluate(() => { const b = Array.from(document.querySelectorAll('.tpil')).find(x => /Boissons/.test(x.textContent)); const avant = getComputedStyle(b).borderTopColor;
  b.click(); return avant; });
await p.waitForTimeout(500);
const on2 = await p.evaluate(() => { const b = Array.from(document.querySelectorAll('.tpil')).find(x => /Boissons/.test(x.textContent)); const cs = getComputedStyle(b); const r = b.getBoundingClientRect(), c = b.parentNode.getBoundingClientRect();
  return { fond: cs.backgroundColor, vis: r.left >= c.left - 1 && r.right <= c.right + 1, tuiles: Array.from(document.querySelectorAll('#pgrid .pcard .pnm-ov')).map(n => getComputedStyle(n).backgroundColor) }; });
t(on === coul('Bière locale'), `au repos, l'onglet « Boissons » est bordé du bleu de ses tuiles (${on})`);
t(on2.fond === coul('Bière locale') && on2.tuiles.length >= 3 && on2.tuiles.every(c => c === on2.fond), `choisi, il devient bleu plein — et toutes les tuiles dessous sont bleues (${on2.tuiles.length}, ${on2.fond})`);
t(on2.vis, 'l\'onglet choisi reste visible, pas caché au bord de la rangée');
// Les variantes d'une famille : la couleur de la famille.
await p.evaluate(() => { Array.from(document.querySelectorAll('.tpil'))[0].click(); }); await p.waitForTimeout(200);
await p.evaluate(() => document.getElementById('pc-9').click()); await p.waitForTimeout(400);
const vt = await p.evaluate(() => Array.from(document.querySelectorAll('.vinline .vtile .vt-nm')).map(n => getComputedStyle(n).backgroundColor));
t(vt.length === 2 && vt.every(c => c === coul('Bière locale')), `les variantes de « Jus Top » gardent le bleu des boissons (${vt.join(' · ')})`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
