// t275 — LES PHOTOS DÉTOURÉES SUR L'ÉTAGÈRE (23.56).
// Sa capture du 15/11 : « pour les sans photo, c'est visiblement bien, mais
// avec photo… ». Une photo restait un rectangle : le savon photographié sur
// une table posait un pavé sur le mur, une capture d'écran gardait ses
// traits gris, « 40 Gram » flottait dans un coin, et l'étiquette « Prix ? »
// d'un article au nom de fichier gardait une bande blanche vide.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t275');
const { s, port } = await serveur();
const b = await chromium.launch();

const db = nouvelleBoutique(); db.cfg.facon = 'detail'; db.cfg.venteDeverrouillee = false;
db.articles = db.articles.slice(0, 3);
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 });

// Les photos d'essai, dessinées dans la page (400 × 400).
await p.evaluate(() => {
  const faire = f => { const c = document.createElement('canvas'); c.width = c.height = 400; const x = c.getContext('2d'); f(x); return c.toDataURL('image/png'); };
  window.__ph = {
    // bouteille sur blanc, étiquette blanche qui touche ses bords, deux traits gris de capture d'écran
    capture: faire(x => { x.fillStyle = '#fff'; x.fillRect(0, 0, 400, 400); x.fillStyle = '#bbb'; x.fillRect(18, 0, 2, 400); x.fillRect(378, 0, 2, 400);
      x.fillStyle = '#5b2a6e'; x.fillRect(170, 40, 60, 60); x.fillRect(150, 95, 100, 270); x.fillStyle = '#fff'; x.fillRect(150, 200, 100, 50); }),
    // savon sur une table de bois : fond pas uni
    table: faire(x => { for (let y = 0; y < 400; y += 4) { x.fillStyle = ['#8a6a44', '#b8936a', '#6e5232', '#d4b48a'][(y / 4) % 4]; x.fillRect(0, y, 400, 4); } x.fillStyle = '#e39a45'; x.fillRect(60, 110, 280, 170); }),
    // 23.59 — un savon de la COULEUR de la table : là, on ne découpe pas.
    pareil: faire(x => { for (let y = 0; y < 400; y += 4) { x.fillStyle = ['#8a6a44', '#b8936a', '#6e5232', '#d4b48a'][(y / 4) % 4]; x.fillRect(0, y, 400, 4); } x.fillStyle = '#a2835c'; x.fillRect(60, 110, 280, 170); }),
    // savon sur blanc, « 40 Gram » dans un coin
    texte: faire(x => { x.fillStyle = '#fff'; x.fillRect(0, 0, 400, 400); x.fillStyle = '#9a6227'; x.fillRect(50, 90, 250, 230); x.fillStyle = '#555'; x.font = '900 26px sans-serif'; x.fillText('40', 340, 50); }),
  };
});

// 1. Le calcul, photo par photo.
const calc = await p.evaluate(async () => {
  if (typeof _dtCalculer !== 'function') return {};       // l'ancienne app
  const lire = async u => { const im = new Image(); im.src = u; await im.decode(); return im; };
  const alpha = (cv, fx, fy) => { const x = cv.getContext('2d'); const d = x.getImageData(Math.floor(fx * (cv.width - 1)), Math.floor(fy * (cv.height - 1)), 1, 1).data; return d[3]; };
  const a = _dtCalculer(await lire(__ph.capture)), b = _dtCalculer(await lire(__ph.table)), c = _dtCalculer(await lire(__ph.texte)), e = _dtCalculer(await lire(__ph.pareil));
  return {
    a: a && a.mode, aCoins: a && a.cv ? [alpha(a.cv, 0, 0), alpha(a.cv, 1, 1)] : null,
    aLarg: a && a.cv ? Math.round(a.cv.width / a.cv.height * 100) : 0,       // recadré sur la bouteille (100 × 325 → ~0,3)
    aEtiq: a && a.cv ? alpha(a.cv, 0.5, 0.45) : -1,
    b: b && b.mode, e: e && e.mode, c: c && c.mode, cRatio: c && c.cv ? Math.round(c.cv.width / c.cv.height * 100) : 0,
  };
});
t(calc.a === 'd' && calc.aCoins && calc.aCoins.every(v => v === 0), `fond blanc : détourée, les coins sont transparents (${calc.a}, ${JSON.stringify(calc.aCoins)})`);
t(calc.aLarg > 20 && calc.aLarg < 45, `les traits gris des bords sont partis : l'image est recadrée sur la bouteille seule (largeur/hauteur ${calc.aLarg} %)`);
t(calc.aEtiq === 255, `l'étiquette blanche qui touche les bords reste sur la bouteille (opacité ${calc.aEtiq})`);
// 23.56 : toute photo sur une table était encadrée. 23.59 (« posés comme dans
// la vie réelle ») : un produit bien distinct de sa table est détouré aussi ;
// seul un produit de la couleur de la table reste encadré.
t(calc.b === 'd' && calc.e === 'c', `photo prise sur une table : détourée si le savon s'en distingue (${calc.b}), encadrée s'il a sa couleur (${calc.e})`);
t(calc.c === 'd' && calc.cRatio > 100 && calc.cRatio < 116, `« 40 Gram » dans le coin est parti : recadrée sur le savon seul (${calc.cRatio} %, le savon fait 109 %)`);

// 2. Sur l'étagère.
await p.evaluate(() => {
  DB.articles.push({ id: 60, nm: 'Jus vimto', e: '📦', cat: 'Divers', px: 800, pa: 600, stk0: 10, al: 2, vd: 0, img: __ph.capture });
  DB.articles.push({ id: 61, nm: 'Screenshot 20260709 113553', e: '📦', cat: 'Divers', px: 0, pa: 0, stk0: 10, al: 2, vd: 0, img: __ph.pareil });
  DB.articles.push({ id: 62, nm: 'Savon Azur', e: '📦', cat: 'Divers', px: 450, pa: 300, stk0: 10, al: 2, vd: 0, img: __ph.texte });
  DB = migrateDBData(DB); renderProd(DB.articles);   // comme après une synchro
});
await p.waitForTimeout(1500);
const e = await p.evaluate(() => {
  const im = id => document.querySelector('#pc-' + id + ' .pmedia img'), med = id => document.querySelector('#pc-' + id + ' .pmedia');
  const a = im(60), c = im(61), lab = id => document.querySelector('#pc-' + id + ' .pcard-overlay').getBoundingClientRect().height;
  const g = document.getElementById('pgrid'), sep = g.querySelector('.etg-sep');
  return {
    det: a && a.classList.contains('dt') && /^blob:/.test(a.src) && getComputedStyle(a).mixBlendMode === 'normal' && /drop-shadow/.test(getComputedStyle(a).filter),
    cadre: med(61).classList.contains('dtc') && getComputedStyle(c).borderTopWidth === '3px' && getComputedStyle(c).borderTopColor === 'rgb(255, 255, 255)',
    vide: getComputedStyle(document.querySelector('#pc-61 .pnm-ov')).display, l61: Math.round(lab(61)), l60: Math.round(lab(60)),
    h: Math.round(document.getElementById('pc-60').getBoundingClientRect().height),
    meuble: g.style.getPropertyValue('--meuble-h'), sepTop: sep ? Math.round(sep.getBoundingClientRect().top - g.getBoundingClientRect().top) : -1,
  };
});
t(e.det, 'la photo détourée est posée sur la planche, avec son ombre, sans `multiply`');
t(e.cadre, 'la photo d\'un savon couleur de table est encadrée de blanc, comme une affichette');
t(e.vide === 'none' && Math.abs(e.l61 - e.l60) <= 1, `« Prix ? » d'un article au nom de fichier : plus de bande blanche vide, même hauteur que l'étiquette d'à côté (${e.l61} / ${e.l60} px)`);
t(e.h <= 144, `la tuile garde sa hauteur (${e.h} px)`);
t(e.sepTop > 0 && e.meuble === e.sepTop + 'px', `le meuble s'arrête avant « Tu vends aussi… ? » (${e.meuble}, suggestions à ${e.sepTop} px)`);

// 3. Le lendemain : la photo détourée vient du téléphone, sans refaire le calcul.
const r = await p.evaluate(async () => {
  if (typeof _dtCalculer !== 'function') return {};
  let n = 0; const vrai = _dtCalculer; _dtCalculer = function (im) { n++; return vrai(im); };
  _dtURL = {}; renderProd(DB.articles);
  const att = document.querySelector('#pc-60 .pmedia img').classList.contains('dt-att');
  await new Promise(r => setTimeout(r, 800));
  const a = document.querySelector('#pc-60 .pmedia img');
  _dtCalculer = vrai;
  return { att, n, dt: a.classList.contains('dt') && /^blob:/.test(a.src) };
});
t(r.att, 'en attendant, l\'originale ne se montre pas une seconde avant la détourée');
t(r.dt && r.n === 0, `elle revient du téléphone, sans recalcul (${r.n} calcul)`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close(); fin();
